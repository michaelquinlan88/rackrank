/**
 * ListingStorage Service
 * 
 * Handles persistent storage of listings using AsyncStorage.
 * Provides save, load, update, and delete operations for listing data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const LISTINGS_KEY = '@rackrank:listings';
const LISTING_PREFIX = '@rackrank:listing:';

// Listing status enum
export type ListingStatus = 'draft' | 'listed' | 'sold' | 'expired';

// Marketplace type
export type MarketplaceType = 'ebay' | 'facebook' | 'poshmark' | 'depop';

// Listing interface
export interface Listing {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    condition: string;
    brand?: string;
    size?: string;
    color?: string;
    status: ListingStatus;
    photoUris: string[];
    createdAt: number;
    updatedAt: number;
    listedAt?: number;
    soldAt?: number;
    marketplaces: MarketplaceType[];
    marketplaceIds?: Partial<Record<MarketplaceType, string>>;
}

// Create a new listing object
export function createListing(data: Partial<Listing>): Listing {
    const now = Date.now();
    return {
        id: data.id || `listing_${now}_${Math.random().toString(36).substr(2, 9)}`,
        title: data.title || '',
        description: data.description || '',
        price: data.price || 0,
        category: data.category || '',
        condition: data.condition || 'Good',
        brand: data.brand,
        size: data.size,
        color: data.color,
        status: data.status || 'draft',
        photoUris: data.photoUris || [],
        createdAt: data.createdAt || now,
        updatedAt: now,
        listedAt: data.listedAt,
        soldAt: data.soldAt,
        marketplaces: data.marketplaces || [],
        marketplaceIds: data.marketplaceIds,
    };
}

/**
 * Get all listing IDs
 */
async function getListingIds(): Promise<string[]> {
    try {
        const idsJson = await AsyncStorage.getItem(LISTINGS_KEY);
        return idsJson ? JSON.parse(idsJson) : [];
    } catch (error) {
        console.error('Error getting listing IDs:', error);
        return [];
    }
}

/**
 * Save listing IDs index
 */
async function saveListingIds(ids: string[]): Promise<void> {
    try {
        await AsyncStorage.setItem(LISTINGS_KEY, JSON.stringify(ids));
    } catch (error) {
        console.error('Error saving listing IDs:', error);
    }
}

/**
 * Save a listing to storage
 */
export async function saveListing(listing: Listing): Promise<boolean> {
    try {
        // Save the listing data
        const key = `${LISTING_PREFIX}${listing.id}`;
        await AsyncStorage.setItem(key, JSON.stringify(listing));

        // Add to index if new
        const ids = await getListingIds();
        if (!ids.includes(listing.id)) {
            ids.unshift(listing.id); // Add to front (newest first)
            await saveListingIds(ids);
        }

        return true;
    } catch (error) {
        console.error('Error saving listing:', error);
        return false;
    }
}

/**
 * Get a single listing by ID
 */
export async function getListing(id: string): Promise<Listing | null> {
    try {
        const key = `${LISTING_PREFIX}${id}`;
        const json = await AsyncStorage.getItem(key);
        return json ? JSON.parse(json) : null;
    } catch (error) {
        console.error('Error getting listing:', error);
        return null;
    }
}

/**
 * Get all listings
 */
export async function getAllListings(): Promise<Listing[]> {
    try {
        const ids = await getListingIds();
        const listings: Listing[] = [];

        for (const id of ids) {
            const listing = await getListing(id);
            if (listing) {
                listings.push(listing);
            }
        }

        return listings;
    } catch (error) {
        console.error('Error getting all listings:', error);
        return [];
    }
}

/**
 * Get listings by status
 */
export async function getListingsByStatus(status: ListingStatus): Promise<Listing[]> {
    const allListings = await getAllListings();
    return allListings.filter(l => l.status === status);
}

/**
 * Update a listing
 */
export async function updateListing(id: string, updates: Partial<Listing>): Promise<boolean> {
    try {
        const listing = await getListing(id);
        if (!listing) return false;

        const updatedListing: Listing = {
            ...listing,
            ...updates,
            updatedAt: Date.now(),
        };

        return await saveListing(updatedListing);
    } catch (error) {
        console.error('Error updating listing:', error);
        return false;
    }
}

/**
 * Update listing status
 */
export async function updateListingStatus(
    id: string,
    status: ListingStatus,
    marketplaceId?: { marketplace: MarketplaceType; itemId: string }
): Promise<boolean> {
    const updates: Partial<Listing> = { status };

    if (status === 'listed') {
        updates.listedAt = Date.now();
    } else if (status === 'sold') {
        updates.soldAt = Date.now();
    }

    if (marketplaceId) {
        const listing = await getListing(id);
        if (listing) {
            updates.marketplaceIds = {
                ...listing.marketplaceIds,
                [marketplaceId.marketplace]: marketplaceId.itemId,
            };
        }
    }

    return await updateListing(id, updates);
}

/**
 * Delete a listing
 */
export async function deleteListing(id: string): Promise<boolean> {
    try {
        // Remove from storage
        const key = `${LISTING_PREFIX}${id}`;
        await AsyncStorage.removeItem(key);

        // Remove from index
        const ids = await getListingIds();
        const newIds = ids.filter(i => i !== id);
        await saveListingIds(newIds);

        return true;
    } catch (error) {
        console.error('Error deleting listing:', error);
        return false;
    }
}

/**
 * Get listing stats
 */
export async function getListingStats(): Promise<{
    total: number;
    drafts: number;
    listed: number;
    sold: number;
}> {
    const listings = await getAllListings();
    return {
        total: listings.length,
        drafts: listings.filter(l => l.status === 'draft').length,
        listed: listings.filter(l => l.status === 'listed').length,
        sold: listings.filter(l => l.status === 'sold').length,
    };
}

/**
 * Clear all listings (for testing/reset)
 */
export async function clearAllListings(): Promise<void> {
    try {
        const ids = await getListingIds();
        for (const id of ids) {
            await AsyncStorage.removeItem(`${LISTING_PREFIX}${id}`);
        }
        await AsyncStorage.removeItem(LISTINGS_KEY);
    } catch (error) {
        console.error('Error clearing listings:', error);
    }
}
