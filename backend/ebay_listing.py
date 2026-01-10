"""
eBay Trading API Client

Creates listings on eBay using the Trading API.
Handles proper XML escaping and connection pooling.
"""

import os
import re
import time
from html import escape as html_escape
from typing import Optional, List, Dict
from dataclasses import dataclass
from datetime import datetime, timedelta
import httpx


@dataclass(frozen=True)
class ListingResult:
    """Result from creating an eBay listing."""
    success: bool
    item_id: Optional[str] = None
    listing_url: Optional[str] = None
    error: Optional[str] = None


class eBayListingClient:
    """
    Client for eBay Trading API to create listings.
    
    Features:
    - Connection pooling
    - Proper XML escaping  
    - Configurable settings
    """
    
    SANDBOX_URL = "https://api.sandbox.ebay.com/ws/api.dll"
    PROD_URL = "https://api.ebay.com/ws/api.dll"
    
    # eBay category IDs for common clothing types
    CATEGORY_MAP = {
        "men's outerwear": "57988",
        "men's coats": "57988",
        "men's jackets": "57988",
        "men's shirts": "57990",
        "men's pants": "57989",
        "women's coats": "63862",
        "women's jackets": "63862",
        "women's tops": "53159",
        "women's dresses": "63861",
        "activewear": "137084",
        "fleece": "57988",
        "outerwear": "57988",
    }
    DEFAULT_CATEGORY = "11450"  # Clothing, Shoes & Accessories
    
    CONDITION_MAP = {
        "New With Tags": "1000",
        "New without tags": "1500",
        "Excellent": "3000",
        "Good": "3000",
        "Fair": "5000",
    }
    DEFAULT_CONDITION = "3000"
    
    def __init__(
        self, 
        app_id: str, 
        dev_id: str, 
        cert_id: str, 
        auth_token: str, 
        sandbox: bool = True,
        seller_email: str = "seller@example.com",
        postal_code: str = "90210",
    ):
        self.app_id = app_id
        self.dev_id = dev_id
        self.cert_id = cert_id
        self.auth_token = auth_token
        self.base_url = self.SANDBOX_URL if sandbox else self.PROD_URL
        self.sandbox = sandbox
        self.seller_email = seller_email
        self.postal_code = postal_code
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
    
    def _get_headers(self, call_name: str) -> Dict[str, str]:
        """Get headers for Trading API call."""
        return {
            "X-EBAY-API-SITEID": "0",
            "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
            "X-EBAY-API-CALL-NAME": call_name,
            "X-EBAY-API-APP-NAME": self.app_id,
            "X-EBAY-API-DEV-NAME": self.dev_id,
            "X-EBAY-API-CERT-NAME": self.cert_id,
            "Content-Type": "text/xml; charset=utf-8",
        }
    
    def _lookup_category(self, category_name: str) -> str:
        """Look up eBay category ID from category name."""
        name_lower = category_name.lower()
        for key, value in self.CATEGORY_MAP.items():
            if key in name_lower:
                return value
        return self.DEFAULT_CATEGORY
    
    def _lookup_condition(self, condition: str) -> str:
        """Look up eBay condition ID from condition name."""
        return self.CONDITION_MAP.get(condition, self.DEFAULT_CONDITION)
    
    def _build_item_specific(self, name: str, value: str) -> str:
        """Build a single item specific XML element."""
        return f"""<NameValueList>
            <Name>{html_escape(name)}</Name>
            <Value>{html_escape(value)}</Value>
        </NameValueList>"""
    
    def _build_xml_request(
        self,
        title: str,
        description: str,
        price: float,
        category_id: str,
        condition_id: str,
        image_urls: List[str],
        item_specifics: List[tuple],
    ) -> str:
        """Build the AddFixedPriceItem XML request."""
        # Build item specifics
        specifics_xml = "\n".join(
            self._build_item_specific(name, value)
            for name, value in item_specifics
            if value
        )
        
        # Build picture URLs (max 12)
        pictures_xml = "\n".join(
            f"<PictureURL>{html_escape(url)}</PictureURL>"
            for url in image_urls[:12]
        )
        
        return f"""<?xml version="1.0" encoding="utf-8"?>
<AddFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    <RequesterCredentials>
        <eBayAuthToken>{html_escape(self.auth_token)}</eBayAuthToken>
    </RequesterCredentials>
    <ErrorLanguage>en_US</ErrorLanguage>
    <WarningLevel>High</WarningLevel>
    <Item>
        <Title>{html_escape(title[:80])}</Title>
        <Description><![CDATA[{description}]]></Description>
        <PrimaryCategory>
            <CategoryID>{category_id}</CategoryID>
        </PrimaryCategory>
        <StartPrice currencyID="USD">{price:.2f}</StartPrice>
        <ConditionID>{condition_id}</ConditionID>
        <Country>US</Country>
        <Currency>USD</Currency>
        <DispatchTimeMax>3</DispatchTimeMax>
        <ListingDuration>Days_7</ListingDuration>
        <ListingType>FixedPriceItem</ListingType>
        <PictureDetails>
            {pictures_xml}
        </PictureDetails>
        <PostalCode>{self.postal_code}</PostalCode>
        <Quantity>1</Quantity>
        <ItemSpecifics>
            {specifics_xml}
        </ItemSpecifics>
        <ReturnPolicy>
            <ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>
            <RefundOption>MoneyBack</RefundOption>
            <ReturnsWithinOption>Days_30</ReturnsWithinOption>
            <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>
        </ReturnPolicy>
        <ShippingDetails>
            <ShippingType>Flat</ShippingType>
            <ShippingServiceOptions>
                <ShippingServicePriority>1</ShippingServicePriority>
                <ShippingService>USPSPriority</ShippingService>
                <ShippingServiceCost currencyID="USD">8.99</ShippingServiceCost>
            </ShippingServiceOptions>
        </ShippingDetails>
        <Site>US</Site>
    </Item>
</AddFixedPriceItemRequest>"""
    
    async def create_listing(
        self,
        title: str,
        description: str,
        price: float,
        category: str,
        condition: str,
        image_urls: Optional[List[str]] = None,
        brand: Optional[str] = None,
        size: Optional[str] = None,
        color: Optional[str] = None,
    ) -> ListingResult:
        """
        Create a fixed-price listing on eBay.
        
        Returns ListingResult with item_id and listing_url on success.
        """
        category_id = self._lookup_category(category)
        condition_id = self._lookup_condition(condition)
        
        item_specifics = [
            ("Brand", brand),
            ("Size", size),
            ("Color", color),
        ]
        
        xml_request = self._build_xml_request(
            title=title,
            description=description,
            price=price,
            category_id=category_id,
            condition_id=condition_id,
            image_urls=image_urls or [],
            item_specifics=item_specifics,
        )
        
        try:
            client = await self._get_client()
            response = await client.post(
                self.base_url,
                headers=self._get_headers("AddFixedPriceItem"),
                content=xml_request.encode("utf-8"),
            )
            
            response_text = response.text
            
            # Check for success
            if "<Ack>Success</Ack>" in response_text or "<Ack>Warning</Ack>" in response_text:
                item_id_match = re.search(r"<ItemID>(\d+)</ItemID>", response_text)
                if item_id_match:
                    item_id = item_id_match.group(1)
                    base = "https://sandbox.ebay.com" if self.sandbox else "https://www.ebay.com"
                    return ListingResult(
                        success=True,
                        item_id=item_id,
                        listing_url=f"{base}/itm/{item_id}"
                    )
            
            # Parse error message
            error_match = re.search(r"<ShortMessage>(.+?)</ShortMessage>", response_text)
            error_msg = error_match.group(1) if error_match else "Unknown error"
            
            return ListingResult(success=False, error=error_msg)
            
        except httpx.TimeoutException:
            return ListingResult(success=False, error="Request timed out")
        except httpx.RequestError as e:
            return ListingResult(success=False, error=f"Network error: {e}")
        except Exception as e:
            return ListingResult(success=False, error=str(e))


# Module-level singleton
_listing_client: Optional[eBayListingClient] = None


def get_ebay_listing_client() -> Optional[eBayListingClient]:
    """Get or create eBay listing client singleton."""
    global _listing_client
    
    app_id = os.getenv("EBAY_APP_ID")
    dev_id = os.getenv("EBAY_DEV_ID", "")
    cert_id = os.getenv("EBAY_CERT_ID")
    auth_token = os.getenv("EBAY_AUTH_TOKEN", "")
    
    if not app_id or not cert_id:
        return None
    
    if _listing_client is None:
        _listing_client = eBayListingClient(
            app_id=app_id,
            dev_id=dev_id,
            cert_id=cert_id,
            auth_token=auth_token,
            sandbox=True
        )
    
    return _listing_client
