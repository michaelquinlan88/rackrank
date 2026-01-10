import React, { useState, useEffect } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, ScrollView,
    SafeAreaView, TextInput, Switch, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';
import { resetOnboarding } from './OnboardingScreen';
import { isEbayAuthenticated, clearEbayAuth } from '../services/ebayAuth';

const STORAGE_KEYS = {
    BACKEND_URL: '@rackrank_backend_url',
    DEFAULT_MARKETPLACE: '@rackrank_default_marketplace',
    EBAY_CONFIGURED: '@rackrank_ebay_configured',
    SHIPPING_PRESET: '@rackrank_shipping_preset',
    AUTO_ANALYZE: '@rackrank_auto_analyze',
};

const MARKETPLACES = [
    { id: 'ebay', name: 'eBay', icon: 'eB', color: '#e53238' },
    { id: 'depop', name: 'Depop', icon: 'DP', color: '#ff2300' },
    { id: 'poshmark', name: 'Poshmark', icon: 'PM', color: '#7c0a02' },
    { id: 'mercari', name: 'Mercari', icon: 'M', color: '#4285f4' },
];

const SHIPPING_PRESETS = [
    { id: 'calculated', name: 'Calculated', description: 'Based on buyer location' },
    { id: 'flat_8', name: 'Flat $8.99', description: 'USPS Priority Mail' },
    { id: 'flat_5', name: 'Flat $4.99', description: 'USPS First Class' },
    { id: 'free', name: 'Free Shipping', description: 'Built into price' },
];

export default function SettingsScreen({ navigation }: any) {
    const [backendUrl, setBackendUrl] = useState('http://192.168.0.89:8000');
    const [defaultMarketplace, setDefaultMarketplace] = useState('ebay');
    const [shippingPreset, setShippingPreset] = useState('flat_8');
    const [autoAnalyze, setAutoAnalyze] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const [ebayConnected, setEbayConnected] = useState(false);

    useEffect(() => {
        loadSettings();
        checkEbayStatus();
    }, []);

    const checkEbayStatus = async () => {
        const connected = await isEbayAuthenticated();
        setEbayConnected(connected);
    };

    const loadSettings = async () => {
        try {
            const url = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
            const marketplace = await AsyncStorage.getItem(STORAGE_KEYS.DEFAULT_MARKETPLACE);
            const shipping = await AsyncStorage.getItem(STORAGE_KEYS.SHIPPING_PRESET);
            const autoAn = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_ANALYZE);

            if (url) setBackendUrl(url);
            if (marketplace) setDefaultMarketplace(marketplace);
            if (shipping) setShippingPreset(shipping);
            if (autoAn !== null) setAutoAnalyze(autoAn === 'true');
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    };

    const saveSettings = async () => {
        try {
            await AsyncStorage.multiSet([
                [STORAGE_KEYS.BACKEND_URL, backendUrl],
                [STORAGE_KEYS.DEFAULT_MARKETPLACE, defaultMarketplace],
                [STORAGE_KEYS.SHIPPING_PRESET, shippingPreset],
                [STORAGE_KEYS.AUTO_ANALYZE, autoAnalyze.toString()],
            ]);
            setIsDirty(false);
            Alert.alert('Saved', 'Settings saved successfully!');
        } catch (e) {
            Alert.alert('Error', 'Failed to save settings');
        }
    };

    const testConnection = async () => {
        try {
            const response = await fetch(`${backendUrl}/health`);
            const data = await response.json();
            Alert.alert(
                'Connected!',
                `Backend: ${data.status}\nGemini: ${data.gemini_configured ? 'Yes' : 'No'}\neBay: ${data.ebay_configured ? 'Yes' : 'No'}`
            );
        } catch (e) {
            Alert.alert('Connection Failed', 'Could not reach the backend. Check the URL.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Backend Configuration */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔌 BACKEND</Text>
                    <View style={styles.card}>
                        <Text style={styles.label}>API URL</Text>
                        <TextInput
                            style={styles.input}
                            value={backendUrl}
                            onChangeText={(text) => { setBackendUrl(text); setIsDirty(true); }}
                            placeholder="http://localhost:8000"
                            placeholderTextColor={theme.colors.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity style={styles.testButton} onPress={testConnection}>
                            <Text style={styles.testButtonText}>Test Connection</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Default Marketplace */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🛍️ DEFAULT MARKETPLACE</Text>
                    <View style={styles.card}>
                        {MARKETPLACES.map((mp) => (
                            <TouchableOpacity
                                key={mp.id}
                                style={[
                                    styles.marketplaceOption,
                                    defaultMarketplace === mp.id && styles.marketplaceSelected
                                ]}
                                onPress={() => { setDefaultMarketplace(mp.id); setIsDirty(true); }}
                            >
                                <Text style={styles.marketplaceIcon}>{mp.icon}</Text>
                                <Text style={styles.marketplaceName}>{mp.name}</Text>
                                {defaultMarketplace === mp.id && (
                                    <Text style={styles.checkmark}>*</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Shipping Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SHIPPING</Text>
                    <View style={styles.card}>
                        {SHIPPING_PRESETS.map((preset) => (
                            <TouchableOpacity
                                key={preset.id}
                                style={[
                                    styles.shippingOption,
                                    shippingPreset === preset.id && styles.shippingSelected
                                ]}
                                onPress={() => { setShippingPreset(preset.id); setIsDirty(true); }}
                            >
                                <View>
                                    <Text style={styles.shippingName}>{preset.name}</Text>
                                    <Text style={styles.shippingDesc}>{preset.description}</Text>
                                </View>
                                {shippingPreset === preset.id && (
                                    <Text style={styles.checkmark}>*</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚙️ PREFERENCES</Text>
                    <View style={styles.card}>
                        <View style={styles.toggleRow}>
                            <View>
                                <Text style={styles.toggleLabel}>Auto-analyze on capture</Text>
                                <Text style={styles.toggleDesc}>Automatically run AI after all required photos</Text>
                            </View>
                            <Switch
                                value={autoAnalyze}
                                onValueChange={(value) => { setAutoAnalyze(value); setIsDirty(true); }}
                                trackColor={{ false: '#333', true: theme.colors.primary }}
                                thumbColor="#fff"
                            />
                        </View>
                    </View>
                </View>

                {/* eBay Connection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>EBAY</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Status</Text>
                            <Text style={[styles.infoValue, { color: ebayConnected ? '#4caf50' : theme.colors.textMuted }]}>
                                {ebayConnected ? 'Connected' : 'Not Connected'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.testButton, { marginTop: 12 }]}
                            onPress={async () => {
                                if (ebayConnected) {
                                    Alert.alert(
                                        'Disconnect eBay',
                                        'Are you sure you want to disconnect your eBay account?',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Disconnect',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    await clearEbayAuth();
                                                    setEbayConnected(false);
                                                    Alert.alert('Disconnected', 'eBay account disconnected.');
                                                },
                                            },
                                        ]
                                    );
                                } else {
                                    Alert.alert(
                                        'Connect eBay',
                                        'To connect eBay, add your developer credentials to the backend .env file and restart the server.',
                                        [{ text: 'OK' }]
                                    );
                                }
                            }}
                        >
                            <Text style={styles.testButtonText}>
                                {ebayConnected ? 'Disconnect eBay' : 'Connect eBay'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Developer Options */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DEVELOPER</Text>
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.testButton}
                            onPress={() => {
                                Alert.alert(
                                    'Reset Onboarding',
                                    'This will show the welcome screens again on next app launch.',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Reset',
                                            onPress: async () => {
                                                await resetOnboarding();
                                                Alert.alert('Done', 'Onboarding will show on next launch.');
                                            },
                                        },
                                    ]
                                );
                            }}
                        >
                            <Text style={styles.testButtonText}>Reset Onboarding</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* App Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ABOUT</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Version</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.infoValue}>1.0.0</Text>
                                <View style={{
                                    backgroundColor: theme.colors.primary,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 4,
                                    marginLeft: 8,
                                }}>
                                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>BETA</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>AI Model</Text>
                            <Text style={styles.infoValue}>Gemini 2.0 Flash</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.testButton, { marginTop: 12 }]}
                            onPress={() => {
                                import('react-native').then(({ Linking }) => {
                                    Linking.openURL('mailto:feedback@rackrank.app?subject=RackRank%20Beta%20Feedback');
                                });
                            }}
                        >
                            <Text style={styles.testButtonText}>Send Feedback</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>

            {/* Save Button */}
            {isDirty && (
                <View style={styles.saveBar}>
                    <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingBottom: 100,
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        color: theme.colors.textMuted,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 12,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.roundness.lg,
        padding: theme.spacing.md,
        ...theme.shadows.md,
    },
    label: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.roundness.md,
        padding: 14,
        color: theme.colors.text,
        fontSize: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    testButton: {
        backgroundColor: theme.colors.primaryLight,
        padding: 12,
        borderRadius: theme.roundness.md,
        alignItems: 'center',
    },
    testButtonText: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    marketplaceOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: theme.roundness.md,
        marginBottom: 8,
        backgroundColor: theme.colors.surfaceAlt,
    },
    marketplaceSelected: {
        backgroundColor: theme.colors.primaryLight,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    marketplaceIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    marketplaceName: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    checkmark: {
        color: theme.colors.primary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    shippingOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: theme.roundness.md,
        marginBottom: 8,
        backgroundColor: theme.colors.surfaceAlt,
    },
    shippingSelected: {
        backgroundColor: theme.colors.primaryLight,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    shippingName: {
        color: theme.colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    shippingDesc: {
        color: theme.colors.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggleLabel: {
        color: theme.colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    toggleDesc: {
        color: theme.colors.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    infoLabel: {
        color: theme.colors.textMuted,
        fontSize: 14,
    },
    infoValue: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    saveBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: theme.spacing.lg,
        paddingBottom: 36,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: theme.roundness.md,
        alignItems: 'center',
        ...theme.shadows.md,
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
});

