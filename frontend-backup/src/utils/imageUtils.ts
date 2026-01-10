import * as FileSystem from 'expo-file-system';

/**
 * Convert a local file URI to a base64 string.
 * Used for sending captured photos to the backend for Gemini analysis.
 */
export async function fileToBase64(fileUri: string): Promise<string> {
    try {
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
    } catch (error) {
        console.error('Error converting file to base64:', error);
        throw error;
    }
}

/**
 * Convert multiple file URIs to base64 strings.
 */
export async function filesToBase64(fileUris: string[]): Promise<string[]> {
    return Promise.all(fileUris.map(uri => fileToBase64(uri)));
}
