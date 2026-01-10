/**
 * LoadingOverlay Component
 * 
 * Full-screen loading overlay for async operations.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { theme } from '../theme';

interface LoadingOverlayProps {
    visible: boolean;
    message?: string;
}

export function LoadingOverlay({ visible, message = 'Loading...' }: LoadingOverlayProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.message}>{message}</Text>
                </View>
            </View>
        </Modal>
    );
}

/**
 * Inline loading spinner
 */
export function LoadingSpinner({
    size = 'small',
    color = theme.colors.primary
}: {
    size?: 'small' | 'large';
    color?: string;
}) {
    return <ActivityIndicator size={size} color={color} />;
}

/**
 * Loading placeholder for content areas
 */
export function LoadingPlaceholder({ message = 'Loading...' }: { message?: string }) {
    return (
        <View style={styles.placeholder}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.placeholderText}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        backgroundColor: theme.colors.surface,
        padding: 32,
        borderRadius: 16,
        alignItems: 'center',
        minWidth: 150,
    },
    message: {
        marginTop: 16,
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    placeholderText: {
        marginTop: 16,
        fontSize: 14,
        color: theme.colors.textMuted,
    },
});

export default LoadingOverlay;
