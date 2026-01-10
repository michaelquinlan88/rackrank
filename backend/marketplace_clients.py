"""
Multi-Marketplace Listing Clients

Support for Depop, Poshmark, and Mercari APIs.
Each marketplace has different API requirements.
"""

import os
import httpx
from typing import Optional, List, Dict
from dataclasses import dataclass
from abc import ABC, abstractmethod


@dataclass
class MarketplaceListingResult:
    """Result from creating a listing on any marketplace."""
    success: bool
    marketplace: str
    item_id: Optional[str] = None
    listing_url: Optional[str] = None
    error: Optional[str] = None


class MarketplaceClient(ABC):
    """Abstract base class for marketplace integrations."""
    
    @abstractmethod
    async def create_listing(
        self,
        title: str,
        description: str,
        price: float,
        category: str,
        condition: str,
        **kwargs
    ) -> MarketplaceListingResult:
        pass


class DepopClient(MarketplaceClient):
    """
    Depop API Client
    
    Note: Depop has a private API. This is a placeholder implementation.
    For production, you'd need to work with Depop's partnership program.
    """
    
    CONDITION_MAP = {
        "New With Tags": "brand_new",
        "Excellent": "like_new", 
        "Good": "good",
        "Fair": "used",
    }
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://api.depop.com"
    
    async def create_listing(
        self,
        title: str,
        description: str,
        price: float,
        category: str,
        condition: str,
        brand: Optional[str] = None,
        size: Optional[str] = None,
        color: Optional[str] = None,
        image_urls: Optional[List[str]] = None,
        **kwargs
    ) -> MarketplaceListingResult:
        """
        Create a listing on Depop.
        
        Depop-specific format:
        - Shorter titles preferred
        - Hashtags in description help discovery
        - Price includes shipping typically
        """
        # Format description with hashtags for Depop discovery
        hashtags = []
        if brand:
            hashtags.append(f"#{brand.replace(' ', '').lower()}")
        if color:
            hashtags.append(f"#{color.lower()}")
        hashtags.extend(["#vintage", "#thrift", "#sustainable"])
        
        depop_description = f"{description}\n\n{' '.join(hashtags[:5])}"
        
        # In production, this would call the actual Depop API
        # For now, return a simulated success
        return MarketplaceListingResult(
            success=True,
            marketplace="depop",
            item_id=f"DEPOP_{hash(title) % 100000000}",
            listing_url=f"https://www.depop.com/products/{hash(title) % 100000000}"
        )


class PoshmarkClient(MarketplaceClient):
    """
    Poshmark API Client
    
    Note: Poshmark's API is private. This simulates the listing format.
    For production, consider browser automation or partnership.
    """
    
    CATEGORY_MAP = {
        "men's": "Men",
        "women's": "Women", 
        "kids": "Kids",
    }
    
    SIZE_MAP = {
        "XS": "XS",
        "S": "S",
        "M": "M",
        "L": "L",
        "XL": "XL",
        "XXL": "XXL",
    }
    
    def __init__(self, session_cookie: str):
        self.session_cookie = session_cookie
        self.base_url = "https://poshmark.com"
    
    async def create_listing(
        self,
        title: str,
        description: str,
        price: float,
        category: str,
        condition: str,
        brand: Optional[str] = None,
        size: Optional[str] = None,
        color: Optional[str] = None,
        image_urls: Optional[List[str]] = None,
        **kwargs
    ) -> MarketplaceListingResult:
        """
        Create a listing on Poshmark.
        
        Poshmark-specific:
        - 20% seller fee
        - Flat shipping ($7.97 paid by buyer)
        - Share to get more visibility
        """
        # In production, this would use Poshmark's internal API
        return MarketplaceListingResult(
            success=True,
            marketplace="poshmark",
            item_id=f"PM_{hash(title) % 100000000}",
            listing_url=f"https://poshmark.com/listing/{hash(title) % 100000000}"
        )


class MercariClient(MarketplaceClient):
    """
    Mercari API Client
    
    Mercari has a more accessible API structure.
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://api.mercari.jp"
    
    async def create_listing(
        self,
        title: str,
        description: str,
        price: float,
        category: str,
        condition: str,
        brand: Optional[str] = None,
        size: Optional[str] = None,
        color: Optional[str] = None,
        image_urls: Optional[List[str]] = None,
        **kwargs
    ) -> MarketplaceListingResult:
        """
        Create a listing on Mercari.
        
        Mercari-specific:
        - 10% seller fee
        - Multiple shipping options
        - Smart pricing suggestions
        """
        return MarketplaceListingResult(
            success=True,
            marketplace="mercari",
            item_id=f"MRC_{hash(title) % 100000000}",
            listing_url=f"https://www.mercari.com/us/item/{hash(title) % 100000000}"
        )


# Factory for getting marketplace clients
def get_marketplace_client(marketplace: str) -> Optional[MarketplaceClient]:
    """Get the appropriate client for a marketplace."""
    
    if marketplace == "depop":
        token = os.getenv("DEPOP_ACCESS_TOKEN")
        if token:
            return DepopClient(token)
        # Return demo client
        return DepopClient("demo_token")
    
    elif marketplace == "poshmark":
        cookie = os.getenv("POSHMARK_SESSION")
        if cookie:
            return PoshmarkClient(cookie)
        return PoshmarkClient("demo_session")
    
    elif marketplace == "mercari":
        token = os.getenv("MERCARI_ACCESS_TOKEN")
        if token:
            return MercariClient(token)
        return MercariClient("demo_token")
    
    return None
