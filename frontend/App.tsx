import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * RackRack Mobile App
 * 
 * AI-first clothing resale scanner.
 * Root component for the Expo app.
 */
export default function App() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>RackRack</Text>
            <Text style={styles.subtitle}>AI-Powered Resale Scanner</Text>
            <Text style={styles.description}>
                Scan. Capture. List. Sell.
            </Text>
            <StatusBar style="auto" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#F8FAFC',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 20,
        color: '#94A3B8',
        marginBottom: 24,
    },
    description: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
    },
});
