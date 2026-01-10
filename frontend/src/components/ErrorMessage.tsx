/**
 * ErrorMessage Component
 * 
 * Displays user-friendly error messages with retry button.
 * Uses consistent RackRank styling.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface ErrorMessageProps {
    message: string;
    onRetry?: () => void;
    onDismiss?: () => void;
}

export function ErrorMessage({ message, onRetry, onDismiss }: ErrorMessageProps) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Something went wrong</Text>
                <Text style={styles.message}>{message}</Text>

                <View style={styles.buttons}>
                    {onRetry && (
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={onRetry}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.retryText}>Try Again</Text>
                        </TouchableOpacity>
                    )}
                    {onDismiss && (
                        <TouchableOpacity
                            style={styles.dismissButton}
                            onPress={onDismiss}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.dismissText}>Dismiss</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

/**
 * Inline error for form fields
 */
export function InlineError({ message }: { message: string }) {
    return (
        <View style={styles.inlineContainer}>
            <Text style={styles.inlineText}>{message}</Text>
        </View>
    );
}

/**
 * Network error banner
 */
export function NetworkBanner({ isVisible }: { isVisible: boolean }) {
    if (!isVisible) return null;

    return (
        <View style={styles.banner}>
            <Text style={styles.bannerText}>
                No network connection. Some features may be unavailable.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    content: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        color: theme.colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
    },
    retryButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    dismissButton: {
        backgroundColor: 'transparent',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    dismissText: {
        color: theme.colors.textMuted,
        fontWeight: '500',
        fontSize: 14,
    },
    // Inline error styles
    inlineContainer: {
        backgroundColor: '#ffebee',
        padding: 8,
        borderRadius: 4,
        marginTop: 4,
    },
    inlineText: {
        color: '#c62828',
        fontSize: 12,
    },
    // Banner styles
    banner: {
        backgroundColor: '#ffcc80',
        padding: 12,
        alignItems: 'center',
    },
    bannerText: {
        color: '#e65100',
        fontSize: 13,
        fontWeight: '500',
    },
});

export default ErrorMessage;
