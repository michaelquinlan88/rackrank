/**
 * PhotoStorage Service
 * 
 * Handles local photo storage using expo-file-system v19+ API.
 * Photos are stored in the app's document directory for persistence.
 */

import { Paths, File, Directory } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

// Types
export interface StoredPhoto {
    id: string;
    uri: string;
    timestamp: number;
    listingId?: string;
}

export interface PhotoStorageResult {
    success: boolean;
    photo?: StoredPhoto;
    error?: string;
}

// Get the photos directory
function getPhotosDirectory(): Directory {
    return new Directory(Paths.document, 'photos');
}

/**
 * Ensure the photos directory exists
 */
async function ensurePhotosDirExists(): Promise<void> {
    const photosDir = getPhotosDirectory();
    if (!photosDir.exists) {
        await photosDir.create();
    }
}

/**
 * Generate a unique photo ID
 */
function generatePhotoId(): string {
    return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save a photo from a temporary URI to persistent storage
 */
export async function savePhoto(tempUri: string, listingId?: string): Promise<PhotoStorageResult> {
    try {
        await ensurePhotosDirExists();

        const photoId = generatePhotoId();
        const extension = tempUri.split('.').pop() || 'jpg';
        const photosDir = getPhotosDirectory();

        // Create source and destination file references
        const sourceFile = new File(tempUri);
        const destFile = new File(photosDir, `${photoId}.${extension}`);

        // Copy from temp to permanent storage
        await sourceFile.copy(destFile);

        const photo: StoredPhoto = {
            id: photoId,
            uri: destFile.uri,
            timestamp: Date.now(),
            listingId,
        };

        return { success: true, photo };
    } catch (error) {
        console.error('Error saving photo:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Save multiple photos for a listing
 */
export async function savePhotosForListing(
    tempUris: string[],
    listingId: string
): Promise<StoredPhoto[]> {
    const savedPhotos: StoredPhoto[] = [];

    for (const tempUri of tempUris) {
        const result = await savePhoto(tempUri, listingId);
        if (result.success && result.photo) {
            savedPhotos.push(result.photo);
        }
    }

    return savedPhotos;
}

/**
 * Delete a photo by ID
 */
export async function deletePhoto(photoId: string): Promise<boolean> {
    try {
        const photosDir = getPhotosDirectory();
        const files = await photosDir.list();

        const photoFile = files.find(f => f.uri.includes(photoId));
        if (photoFile) {
            await photoFile.delete();
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting photo:', error);
        return false;
    }
}

/**
 * Save photo to device camera roll (for FB Marketplace)
 * Note: This only works in standalone builds, not Expo Go
 */
export async function saveToMediaLibrary(photoUri: string): Promise<boolean> {
    try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
            // Permission denied - expected in Expo Go
            return false;
        }

        await MediaLibrary.saveToLibraryAsync(photoUri);
        return true;
    } catch (error) {
        // Silently fail - this is expected in Expo Go
        // Will work in standalone builds with proper permissions
        return false;
    }
}

/**
 * Save all listing photos to camera roll
 */
export async function saveAllToMediaLibrary(photoUris: string[]): Promise<number> {
    let savedCount = 0;
    for (const uri of photoUris) {
        const success = await saveToMediaLibrary(uri);
        if (success) savedCount++;
    }
    return savedCount;
}

/**
 * Clear all stored photos
 */
export async function clearAllPhotos(): Promise<void> {
    try {
        const photosDir = getPhotosDirectory();
        if (photosDir.exists) {
            await photosDir.delete();
        }
    } catch (error) {
        console.error('Error clearing photos:', error);
    }
}
