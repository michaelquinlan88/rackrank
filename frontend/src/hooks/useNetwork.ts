/**
 * useNetwork Hook
 * 
 * Provides network status and API call utilities with automatic
 * error handling, retry logic, and loading states.
 */

import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const BACKEND_URL_KEY = '@rackrank_backend_url';
const DEFAULT_BACKEND_URL = 'http://192.168.0.89:8000';

interface NetworkState {
    isConnected: boolean;
    isBackendReachable: boolean;
    backendUrl: string;
    isLoading: boolean;
    error: string | null;
}

interface ApiCallOptions {
    retries?: number;
    retryDelay?: number;
    timeout?: number;
}

const defaultOptions: ApiCallOptions = {
    retries: 2,
    retryDelay: 1000,
    timeout: 15000,
};

/**
 * Parse error messages to be user-friendly
 */
function parseError(error: any): string {
    const message = error?.message || String(error);

    if (message.includes('Network request failed')) {
        return 'Unable to connect to the server. Check your WiFi and make sure the backend is running.';
    }
    if (message.includes('timeout')) {
        return 'Request timed out. The server may be busy or unreachable.';
    }
    if (message.includes('500')) {
        return 'Server error. Please try again later.';
    }
    if (message.includes('404')) {
        return 'Service not found. Check your backend URL in Settings.';
    }
    if (message.includes('JSON')) {
        return 'Invalid response from server. Please try again.';
    }

    return message;
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
}

/**
 * Custom hook for network operations
 */
export function useNetwork() {
    const [state, setState] = useState<NetworkState>({
        isConnected: true,
        isBackendReachable: false,
        backendUrl: DEFAULT_BACKEND_URL,
        isLoading: false,
        error: null,
    });

    // Load backend URL from storage
    useEffect(() => {
        loadBackendUrl();
        checkConnection();
    }, []);

    const loadBackendUrl = async () => {
        try {
            const url = await AsyncStorage.getItem(BACKEND_URL_KEY);
            if (url) {
                setState(prev => ({ ...prev, backendUrl: url }));
            }
        } catch (e) {
            console.warn('Failed to load backend URL:', e);
        }
    };

    const checkConnection = async () => {
        try {
            const netInfo = await NetInfo.fetch();
            const isConnected = netInfo.isConnected ?? false;

            let isBackendReachable = false;
            if (isConnected) {
                try {
                    const response = await fetchWithTimeout(
                        `${state.backendUrl}/health`,
                        { method: 'GET' },
                        5000
                    );
                    isBackendReachable = response.ok;
                } catch {
                    isBackendReachable = false;
                }
            }

            setState(prev => ({
                ...prev,
                isConnected,
                isBackendReachable,
            }));
        } catch (e) {
            setState(prev => ({
                ...prev,
                isConnected: false,
                isBackendReachable: false,
            }));
        }
    };

    /**
     * Make an API call with automatic retry and error handling
     */
    const apiCall = useCallback(async <T>(
        endpoint: string,
        options: RequestInit = {},
        callOptions: ApiCallOptions = {}
    ): Promise<{ data: T | null; error: string | null }> => {
        const { retries, retryDelay, timeout } = { ...defaultOptions, ...callOptions };

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        let lastError: string = 'Unknown error';

        for (let attempt = 0; attempt <= (retries || 0); attempt++) {
            try {
                const url = `${state.backendUrl}${endpoint}`;
                const response = await fetchWithTimeout(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers,
                    },
                    ...options,
                }, timeout || 15000);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                setState(prev => ({ ...prev, isLoading: false }));
                return { data, error: null };

            } catch (error: any) {
                lastError = parseError(error);

                // Wait before retry (except on last attempt)
                if (attempt < (retries || 0)) {
                    await new Promise(r => setTimeout(r, retryDelay || 1000));
                }
            }
        }

        setState(prev => ({ ...prev, isLoading: false, error: lastError }));
        return { data: null, error: lastError };
    }, [state.backendUrl]);

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    return {
        ...state,
        apiCall,
        checkConnection,
        clearError,
        loadBackendUrl,
    };
}

export default useNetwork;
