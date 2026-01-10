/**
 * eBay OAuth Service
 * 
 * Handles eBay OAuth 2.0 authentication for the RackRank app.
 * Uses expo-auth-session for secure OAuth flow.
 * 
 * SETUP REQUIRED:
 * 1. Create eBay Developer Account at https://developer.ebay.com
 * 2. Create an application and get Client ID/Secret
 * 3. Add credentials to backend .env file
 * 4. Set redirect URI to: exp://your-ip:8081/--/auth/ebay
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';

// Storage keys
const EBAY_TOKEN_KEY = '@rackrank:ebay_token';
const EBAY_REFRESH_TOKEN_KEY = '@rackrank:ebay_refresh_token';
const EBAY_TOKEN_EXPIRY_KEY = '@rackrank:ebay_token_expiry';

// eBay OAuth endpoints (Sandbox)
const EBAY_AUTH_ENDPOINT = 'https://auth.sandbox.ebay.com/oauth2/authorize';
const EBAY_TOKEN_ENDPOINT = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';

// Scopes needed for listing creation
const EBAY_SCOPES = [
    'https://api.ebay.com/oauth/api_scope',
    'https://api.ebay.com/oauth/api_scope/sell.inventory',
    'https://api.ebay.com/oauth/api_scope/sell.marketing',
    'https://api.ebay.com/oauth/api_scope/sell.account',
].join(' ');

interface EbayTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

/**
 * Check if user is authenticated with eBay
 */
export async function isEbayAuthenticated(): Promise<boolean> {
    try {
        const token = await AsyncStorage.getItem(EBAY_TOKEN_KEY);
        const expiry = await AsyncStorage.getItem(EBAY_TOKEN_EXPIRY_KEY);

        if (!token || !expiry) return false;

        // Check if token is expired (with 5 min buffer)
        const expiresAt = parseInt(expiry, 10);
        return Date.now() < (expiresAt - 300000);
    } catch {
        return false;
    }
}

/**
 * Save eBay tokens to storage
 */
export async function saveEbayTokens(tokens: EbayTokens): Promise<void> {
    await AsyncStorage.multiSet([
        [EBAY_TOKEN_KEY, tokens.accessToken],
        [EBAY_REFRESH_TOKEN_KEY, tokens.refreshToken],
        [EBAY_TOKEN_EXPIRY_KEY, tokens.expiresAt.toString()],
    ]);
}

/**
 * Get stored access token
 */
export async function getEbayAccessToken(): Promise<string | null> {
    try {
        const isAuth = await isEbayAuthenticated();
        if (!isAuth) return null;

        return await AsyncStorage.getItem(EBAY_TOKEN_KEY);
    } catch {
        return null;
    }
}

/**
 * Clear eBay authentication
 */
export async function clearEbayAuth(): Promise<void> {
    await AsyncStorage.multiRemove([
        EBAY_TOKEN_KEY,
        EBAY_REFRESH_TOKEN_KEY,
        EBAY_TOKEN_EXPIRY_KEY,
    ]);
}

/**
 * Build the eBay OAuth URL
 * Note: In production, this would use the backend to protect Client Secret
 */
export function buildEbayAuthRequest(clientId: string, redirectUri: string): AuthSession.AuthRequest {
    return new AuthSession.AuthRequest({
        clientId,
        scopes: EBAY_SCOPES.split(' '),
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {
            prompt: 'login',
        },
    });
}

/**
 * Exchange authorization code for tokens via backend
 * The backend handles the token exchange to protect Client Secret
 */
export async function exchangeCodeForTokens(
    code: string,
    backendUrl: string
): Promise<EbayTokens | null> {
    try {
        const response = await fetch(`${backendUrl}/ebay/token-exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        });

        if (!response.ok) {
            throw new Error('Token exchange failed');
        }

        const data = await response.json();

        const tokens: EbayTokens = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: Date.now() + (data.expires_in * 1000),
        };

        await saveEbayTokens(tokens);
        return tokens;
    } catch (error) {
        console.error('eBay token exchange error:', error);
        return null;
    }
}

/**
 * eBay connection status
 */
export interface EbayConnectionStatus {
    isConnected: boolean;
    username?: string;
    expiresAt?: number;
}

export async function getEbayConnectionStatus(): Promise<EbayConnectionStatus> {
    const isAuth = await isEbayAuthenticated();
    const expiry = await AsyncStorage.getItem(EBAY_TOKEN_EXPIRY_KEY);

    return {
        isConnected: isAuth,
        expiresAt: expiry ? parseInt(expiry, 10) : undefined,
    };
}
