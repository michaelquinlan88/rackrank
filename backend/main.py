"""
RackRank Backend API

FastAPI server for AI-powered clothing resale listing generation.
Integrates with Gemini 2.0 Flash for vision-to-text generation.
"""

import os
import json
import base64
import re
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv
from ebay_client import get_ebay_client, PriceResult
from ebay_listing import get_ebay_listing_client
from marketplace_clients import get_marketplace_client, MarketplaceListingResult

# Load environment variables
load_dotenv()

# Configure Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("WARNING: GOOGLE_API_KEY not found in environment.")
else:
    genai.configure(api_key=api_key)

app = FastAPI(
    title="RackRank API",
    description="AI-powered clothing resale listing generator",
    version="0.2.0"
)

# CORS configuration for mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CaptureRequest(BaseModel):
    """Request model for clothing capture analysis."""
    image_base64_list: Optional[List[str]] = None
    image_urls: Optional[List[str]] = None
    user_id: str

class ListingResponse(BaseModel):
    """AI-generated listing details."""
    title: str
    description: str
    category: str
    suggested_price: float
    price_confidence: str
    condition: str
    brand: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    # eBay price intelligence
    ebay_min_price: Optional[float] = None
    ebay_max_price: Optional[float] = None
    ebay_avg_price: Optional[float] = None
    ebay_sample_count: Optional[int] = None

class PriceCheckRequest(BaseModel):
    """Request for price intelligence."""
    query: str
    category: Optional[str] = None

class PriceCheckResponse(BaseModel):
    """eBay price intelligence response."""
    query: str
    min_price: float
    max_price: float
    avg_price: float
    sample_count: int
    confidence: str

class CreateListingRequest(BaseModel):
    """Request to create an eBay listing."""
    title: str
    description: str
    price: float
    category: str
    condition: str
    brand: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    image_urls: Optional[List[str]] = None

class CreateListingResponse(BaseModel):
    """Response from listing creation."""
    success: bool
    marketplace: str = "ebay"
    item_id: Optional[str] = None
    listing_url: Optional[str] = None
    error: Optional[str] = None

class MultiMarketplaceRequest(BaseModel):
    """Request to create listings on multiple marketplaces."""
    title: str
    description: str
    price: float
    category: str
    condition: str
    brand: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    image_urls: Optional[List[str]] = None
    marketplaces: List[str] = ["ebay"]  # List of marketplaces to post to

class MultiMarketplaceResponse(BaseModel):
    """Response from multi-marketplace listing."""
    results: List[CreateListingResponse]
    total_success: int
    total_failed: int

# Gemini prompt for structured listing generation
GEMINI_PROMPT = """
You are an expert clothing reseller with 10+ years experience on eBay, Depop, and Poshmark.
Analyze the provided images of a clothing item and generate a professional resale listing.

Return ONLY a valid JSON object (no markdown, no explanation) with these exact fields:
{
  "title": "SEO-optimized title: Brand + Style + Key Feature + Size + Color (max 80 chars)",
  "description": "Compelling 2-3 sentence description focusing on condition, material, and selling points",
  "category": "Marketplace category path (e.g., Men's Clothing > Outerwear > Fleece Jackets)",
  "suggested_price": 65.0,
  "price_confidence": "high",
  "condition": "Excellent",
  "brand": "Brand name from label",
  "size": "Size from label",
  "color": "Primary color"
}

Rules:
- suggested_price must be a number (float), not a string
- price_confidence must be one of: "high", "medium", "low"
- condition must be one of: "New With Tags", "Excellent", "Good", "Fair"
- If you can't determine a field, make your best educated guess based on the image
"""

def parse_gemini_response(text: str) -> dict:
    """Extract JSON from Gemini response, handling markdown code blocks."""
    # Try to find JSON in code blocks first
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if json_match:
        return json.loads(json_match.group(1))
    # Otherwise try to parse the whole thing
    return json.loads(text)

@app.get("/")
async def root():
    return {
        "status": "healthy",
        "service": "RackRank API",
        "version": "0.2.0",
        "gemini_configured": bool(api_key)
    }

@app.get("/health")
async def health():
    """Health check endpoint with detailed status for Settings screen."""
    import socket
    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
    except:
        local_ip = "unknown"
    
    return {
        "status": "healthy",
        "gemini_configured": bool(api_key),
        "ebay_configured": bool(os.getenv("EBAY_ACCESS_TOKEN")),
        "local_ip": local_ip,
        "port": 8000
    }

@app.get("/connection-info")
async def connection_info():
    """
    Connection info for easy phone setup.
    Returns the URL that phones should use to connect.
    """
    import socket
    try:
        # Get local IP address
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except:
        local_ip = socket.gethostbyname(socket.gethostname())
    
    backend_url = f"http://{local_ip}:8000"
    
    return {
        "backend_url": backend_url,
        "instructions": f"In the RackRank app, go to Settings and set Backend URL to: {backend_url}",
        "qr_data": backend_url  # This can be encoded as QR code by frontend
    }


# eBay OAuth Configuration
EBAY_CLIENT_ID = os.getenv("EBAY_CLIENT_ID")
EBAY_CLIENT_SECRET = os.getenv("EBAY_CLIENT_SECRET")
EBAY_REDIRECT_URI = os.getenv("EBAY_REDIRECT_URI", "https://localhost:8000/ebay/callback")
EBAY_SANDBOX = os.getenv("EBAY_SANDBOX", "true").lower() == "true"

# eBay OAuth endpoints (Sandbox vs Production)
EBAY_AUTH_URL = "https://auth.sandbox.ebay.com/oauth2/authorize" if EBAY_SANDBOX else "https://auth.ebay.com/oauth2/authorize"
EBAY_TOKEN_URL = "https://api.sandbox.ebay.com/identity/v1/oauth2/token" if EBAY_SANDBOX else "https://api.ebay.com/identity/v1/oauth2/token"
EBAY_SCOPES = "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account"


class EbayAuthUrlRequest(BaseModel):
    """Request for eBay OAuth URL."""
    redirect_uri: Optional[str] = None


class EbayAuthUrlResponse(BaseModel):
    """eBay OAuth authorization URL."""
    auth_url: str
    client_id: str
    is_sandbox: bool


class EbayTokenExchangeRequest(BaseModel):
    """Request to exchange auth code for tokens."""
    code: str
    redirect_uri: Optional[str] = None


class EbayTokenResponse(BaseModel):
    """eBay access token response."""
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str


@app.get("/ebay/status")
async def ebay_status():
    """Check eBay OAuth configuration status."""
    return {
        "configured": bool(EBAY_CLIENT_ID and EBAY_CLIENT_SECRET),
        "is_sandbox": EBAY_SANDBOX,
        "client_id_present": bool(EBAY_CLIENT_ID),
        "client_secret_present": bool(EBAY_CLIENT_SECRET),
    }


@app.post("/ebay/auth-url", response_model=EbayAuthUrlResponse)
async def get_ebay_auth_url(request: EbayAuthUrlRequest):
    """
    Generate eBay OAuth authorization URL.
    The app should open this URL in a browser for user login.
    """
    if not EBAY_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="EBAY_CLIENT_ID not configured. Add to .env file."
        )
    
    redirect_uri = request.redirect_uri or EBAY_REDIRECT_URI
    
    auth_url = (
        f"{EBAY_AUTH_URL}"
        f"?client_id={EBAY_CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={redirect_uri}"
        f"&scope={EBAY_SCOPES}"
    )
    
    return EbayAuthUrlResponse(
        auth_url=auth_url,
        client_id=EBAY_CLIENT_ID,
        is_sandbox=EBAY_SANDBOX
    )


@app.post("/ebay/token-exchange", response_model=EbayTokenResponse)
async def exchange_ebay_token(request: EbayTokenExchangeRequest):
    """
    Exchange authorization code for access and refresh tokens.
    This keeps the client secret secure on the backend.
    """
    import httpx
    
    if not EBAY_CLIENT_ID or not EBAY_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="eBay credentials not configured. Add EBAY_CLIENT_ID and EBAY_CLIENT_SECRET to .env"
        )
    
    redirect_uri = request.redirect_uri or EBAY_REDIRECT_URI
    
    # Encode credentials for Basic auth
    credentials = base64.b64encode(
        f"{EBAY_CLIENT_ID}:{EBAY_CLIENT_SECRET}".encode()
    ).decode()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                EBAY_TOKEN_URL,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": f"Basic {credentials}",
                },
                data={
                    "grant_type": "authorization_code",
                    "code": request.code,
                    "redirect_uri": redirect_uri,
                },
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"eBay token exchange failed: {response.text}"
                )
            
            data = response.json()
            
            return EbayTokenResponse(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token", ""),
                expires_in=data["expires_in"],
                token_type=data["token_type"],
            )
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")

@app.post("/analyze", response_model=ListingResponse)
async def analyze_clothing(request: CaptureRequest):
    """
    Analyze clothing photos using Gemini 2.0 Flash.
    Accepts base64 encoded images or returns mock data for demo.
    """
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured. Add GOOGLE_API_KEY to .env")

    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # If base64 images are provided, use them for real analysis
        if request.image_base64_list and len(request.image_base64_list) > 0:
            # Build content parts for Gemini multimodal
            content_parts = [GEMINI_PROMPT]
            
            for b64_image in request.image_base64_list[:5]:  # Limit to 5 images
                # Gemini expects inline_data format
                content_parts.append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": b64_image
                    }
                })
            
            # Call Gemini 2.0 Flash
            response = model.generate_content(content_parts)
            
            # Parse structured response
            data = parse_gemini_response(response.text)
            return ListingResponse(**data)
        
        # Demo mode: return high-quality mock for UI demonstration
        return ListingResponse(
            title="Patagonia Better Sweater Fleece Jacket Men's L Blue",
            description="Excellent condition Patagonia Better Sweater fleece jacket. Minimal wear, no stains or defects. Classic full-zip style in navy blue.",
            category="Men's Outerwear > Fleece",
            suggested_price=65.00,
            price_confidence="high",
            condition="Excellent",
            brand="Patagonia",
            size="L",
            color="Navy Blue"
        )

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Gemini response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Analysis failed: {str(e)}")

@app.get("/health")
async def health_check():
    ebay = get_ebay_client()
    return {
        "status": "ok",
        "gemini_configured": bool(api_key),
        "ebay_configured": ebay is not None
    }

@app.post("/price-check", response_model=PriceCheckResponse)
async def check_price(request: PriceCheckRequest):
    """
    Get eBay price intelligence for a search query.
    """
    ebay = get_ebay_client()
    
    if not ebay:
        # Return mock data if eBay not configured
        return PriceCheckResponse(
            query=request.query,
            min_price=25.0,
            max_price=85.0,
            avg_price=55.0,
            sample_count=0,
            confidence="low"
        )
    
    try:
        result = await ebay.get_price_intelligence(request.query)
        return PriceCheckResponse(
            query=request.query,
            min_price=result.min_price,
            max_price=result.max_price,
            avg_price=result.avg_price,
            sample_count=result.sample_count,
            confidence=result.confidence
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Price check failed: {str(e)}")

@app.post("/create-listing", response_model=CreateListingResponse)
async def create_listing(request: CreateListingRequest):
    """
    Create a listing on eBay.
    Returns the item ID and listing URL on success.
    """
    client = get_ebay_listing_client()
    
    if not client:
        # Simulate success for demo if eBay not configured
        return CreateListingResponse(
            success=True,
            item_id="DEMO123456789",
            listing_url="https://www.ebay.com/itm/DEMO123456789",
            error=None
        )
    
    try:
        result = await client.create_listing(
            title=request.title,
            description=request.description,
            price=request.price,
            category=request.category,
            condition=request.condition,
            brand=request.brand,
            size=request.size,
            color=request.color,
            image_urls=request.image_urls
        )
        
        return CreateListingResponse(
            success=result.success,
            marketplace="ebay",
            item_id=result.item_id,
            listing_url=result.listing_url,
            error=result.error
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Listing creation failed: {str(e)}")

@app.post("/list-multi", response_model=MultiMarketplaceResponse)
async def create_multi_listing(request: MultiMarketplaceRequest):
    """
    Create listings on multiple marketplaces simultaneously.
    
    Uses asyncio.gather for parallel execution.
    Supported: ebay, depop, poshmark, mercari
    """
    import asyncio
    
    async def create_on_marketplace(marketplace: str) -> CreateListingResponse:
        """Create listing on a single marketplace."""
        try:
            if marketplace == "ebay":
                client = get_ebay_listing_client()
                if not client:
                    return CreateListingResponse(
                        success=True,
                        marketplace="ebay",
                        item_id=f"EBAY_{hash(request.title) % 100000000}",
                        listing_url="https://www.ebay.com/itm/demo"
                    )
            else:
                client = get_marketplace_client(marketplace)
                if not client:
                    return CreateListingResponse(
                        success=False,
                        marketplace=marketplace,
                        error=f"Marketplace '{marketplace}' not configured"
                    )
            
            result = await client.create_listing(
                title=request.title,
                description=request.description,
                price=request.price,
                category=request.category,
                condition=request.condition,
                brand=request.brand,
                size=request.size,
                color=request.color,
                image_urls=request.image_urls
            )
            
            return CreateListingResponse(
                success=result.success,
                marketplace=marketplace if marketplace == "ebay" else result.marketplace,
                item_id=result.item_id,
                listing_url=result.listing_url,
                error=result.error
            )
        except Exception as e:
            return CreateListingResponse(
                success=False,
                marketplace=marketplace,
                error=str(e)
            )
    
    # Execute all marketplace listings in parallel
    results = await asyncio.gather(
        *[create_on_marketplace(mp) for mp in request.marketplaces]
    )
    
    total_success = sum(1 for r in results if r.success)
    
    return MultiMarketplaceResponse(
        results=list(results),
        total_success=total_success,
        total_failed=len(results) - total_success
    )

# Quick-scan endpoint for real-time preview detection
QUICK_SCAN_PROMPT = """
You are an expert at identifying clothing brands from images.

CRITICAL: Your #1 priority is to READ ANY VISIBLE TEXT in the image.
- Look for brand names printed on labels, tags, zippers, or the garment itself
- If you see text like "ARC'TERYX", "PATAGONIA", "THE NORTH FACE", "NIKE", etc., that IS the brand
- Do NOT guess brands - only report what you can actually read or clearly recognize

Analyze this clothing item image and return ONLY a JSON object with:
{
  "brand": "Exact brand name you can read/see, or 'Unknown' if not visible",
  "confidence": 0.85,
  "price_min": 30,
  "price_max": 60,
  "category": "Outdoor/Athletic/Denim/Streetwear/Workwear/Casual"
}

Rules:
- READ THE LABEL/TAG FIRST - the brand name is usually printed there
- confidence should be HIGH (0.9+) if you can read the brand name clearly
- confidence should be LOW (0.3-0.5) if you're guessing
- price_min and price_max are realistic resale prices in USD
- Premium outdoor brands (Arc'teryx, Patagonia, The North Face) command higher prices ($80-300+)
- Category should match the garment type (e.g., "Outdoor" for technical jackets, not "Denim")
- Return ONLY the JSON, no explanation
"""

class QuickScanRequest(BaseModel):
    """Single frame for quick brand detection."""
    image_base64: str

class QuickScanResponse(BaseModel):
    """Quick detection result."""
    brand: str
    confidence: float
    price_min: float
    price_max: float
    category: str

@app.post("/quick-scan", response_model=QuickScanResponse)
async def quick_scan(request: QuickScanRequest):
    """
    Quickly detect brand and estimate price from a single camera frame.
    Optimized for real-time preview during scanning.
    """
    if not api_key:
        # Return mock if no API key
        return QuickScanResponse(
            brand="Unknown",
            confidence=0.5,
            price_min=20,
            price_max=50,
            category="Casual"
        )
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        content_parts = [
            QUICK_SCAN_PROMPT,
            {
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": request.image_base64
                }
            }
        ]
        
        response = model.generate_content(content_parts)
        data = parse_gemini_response(response.text)
        
        return QuickScanResponse(
            brand=data.get("brand", "Unknown"),
            confidence=float(data.get("confidence", 0.5)),
            price_min=float(data.get("price_min", 20)),
            price_max=float(data.get("price_max", 50)),
            category=data.get("category", "Casual")
        )
    except Exception as e:
        print(f"Quick scan error: {e}")
        return QuickScanResponse(
            brand="Unknown",
            confidence=0.3,
            price_min=20,
            price_max=50,
            category="Casual"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


