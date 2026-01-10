"""
eBay Browse API Client

Fetches item prices for price intelligence.
Uses connection pooling and proper token caching.
"""

import os
import base64
import time
from typing import Optional, List, Dict
from dataclasses import dataclass
import httpx


@dataclass(frozen=True)
class PriceResult:
    """Price intelligence result from eBay."""
    min_price: float
    max_price: float
    avg_price: float
    sample_count: int
    confidence: str  # high, medium, low


class eBayClient:
    """
    Client for eBay Browse API.
    
    Uses connection pooling and token caching with expiry.
    """
    
    BASE_URL = "https://api.ebay.com"
    SANDBOX_URL = "https://api.sandbox.ebay.com"
    TOKEN_BUFFER_SECONDS = 300  # Refresh 5 min before expiry
    
    def __init__(self, app_id: str, cert_id: str, sandbox: bool = True):
        self.app_id = app_id
        self.cert_id = cert_id
        self.base_url = self.SANDBOX_URL if sandbox else self.BASE_URL
        self._access_token: Optional[str] = None
        self._token_expiry: float = 0
        self._http_client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create persistent HTTP client."""
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(timeout=30.0)
        return self._http_client
    
    async def close(self) -> None:
        """Close the HTTP client."""
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()
            self._http_client = None
    
    async def _get_access_token(self) -> str:
        """Get OAuth access token, refreshing if expired."""
        if self._access_token and time.time() < self._token_expiry:
            return self._access_token
        
        credentials = base64.b64encode(
            f"{self.app_id}:{self.cert_id}".encode()
        ).decode()
        
        client = await self._get_client()
        response = await client.post(
            f"{self.base_url}/identity/v1/oauth2/token",
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": f"Basic {credentials}",
            },
            data={
                "grant_type": "client_credentials",
                "scope": "https://api.ebay.com/oauth/api_scope",
            },
        )
        response.raise_for_status()
        data = response.json()
        
        self._access_token = data["access_token"]
        # Token typically valid for 2 hours, cache with buffer
        expires_in = data.get("expires_in", 7200)
        self._token_expiry = time.time() + expires_in - self.TOKEN_BUFFER_SECONDS
        
        return self._access_token
    
    async def search_items(
        self, 
        query: str, 
        category_id: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict]:
        """Search for items matching the query."""
        token = await self._get_access_token()
        
        params = {
            "q": query,
            "limit": str(min(limit, 50)),  # Cap at eBay's max
            "filter": "buyingOptions:{FIXED_PRICE}",
        }
        if category_id:
            params["category_ids"] = category_id
        
        client = await self._get_client()
        response = await client.get(
            f"{self.base_url}/buy/browse/v1/item_summary/search",
            headers={
                "Authorization": f"Bearer {token}",
                "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
            },
            params=params,
        )
        
        if response.status_code == 200:
            return response.json().get("itemSummaries", [])
        return []
    
    async def get_price_intelligence(self, query: str) -> PriceResult:
        """
        Get price intelligence for a search query.
        
        Extracts prices from search results and computes statistics.
        """
        items = await self.search_items(query)
        
        # Extract valid prices
        prices = [
            float(item["price"]["value"])
            for item in items
            if "price" in item and "value" in item["price"]
        ]
        
        if not prices:
            return PriceResult(
                min_price=20.0,
                max_price=80.0,
                avg_price=50.0,
                sample_count=0,
                confidence="low"
            )
        
        # Compute statistics
        count = len(prices)
        confidence = "high" if count >= 10 else ("medium" if count >= 5 else "low")
        
        return PriceResult(
            min_price=round(min(prices), 2),
            max_price=round(max(prices), 2),
            avg_price=round(sum(prices) / count, 2),
            sample_count=count,
            confidence=confidence
        )


# Module-level client with lazy initialization
_client: Optional[eBayClient] = None


def get_ebay_client() -> Optional[eBayClient]:
    """Get or create eBay client singleton."""
    global _client
    
    app_id = os.getenv("EBAY_APP_ID")
    cert_id = os.getenv("EBAY_CERT_ID")
    
    if not app_id or not cert_id:
        return None
    
    if _client is None:
        _client = eBayClient(app_id, cert_id, sandbox=True)
    
    return _client
