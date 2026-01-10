import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, Platform, Alert } from 'react-native';
import { theme } from '../theme';
import { filesToBase64 } from '../utils/imageUtils';

/**
 * ReviewScreen
 * 
 * Fetches AI-generated listing details from the backend.
 * Displays the results for user confirmation before listing.
 */

// LOCAL DEVELOPMENT: Use your computer's local IP or localhost for emulator
// For real devices, replace with your local IP like 'http://192.168.1.XX:8000'
const BACKEND_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

interface ListingResult {
    title: string;
    description: string;
    category: string;
    suggested_price: number;
    price_confidence: string;
    condition: string;
    brand: string;
    size: string;
    color: string;
}

export default function ReviewScreen({ navigation, route }: any) {
    const images = route.params?.images || [];
    const [loading, setLoading] = useState(true);
    const [listing, setListing] = useState<ListingResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                setLoading(true);

                // Convert local file URIs to base64 for real Gemini analysis
                let base64Images: string[] = [];
                if (images && images.length > 0) {
                    try {
                        base64Images = await filesToBase64(images);
                    } catch (conversionErr) {
                        console.warn('Could not convert images, using demo mode');
                    }
                }

                const response = await fetch(`${BACKEND_URL}/analyze`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        image_base64_list: base64Images,
                        image_urls: [],
                        user_id: 'local_user_001',
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to connect to RankRack backend. Ensure server is running.');
                }

                const data = await response.json();
                setListing(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Gemini AI is analyzing your closet...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>❌ {error}</Text>
                <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
                    <Text style={styles.buttonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>AI GENERATED LISTING</Text>

                {/* Title Section */}
                <View style={styles.card}>
                    <Text style={styles.label}>Listing Title</Text>
                    <Text style={styles.titleText}>{listing?.title}</Text>
                </View>

                {/* Price Section */}
                <View style={styles.row}>
                    <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.label}>Suggested Price</Text>
                        <Text style={styles.priceText}>${listing?.suggested_price.toFixed(2)}</Text>
                        <View style={styles.confidenceBadge}>
                            <Text style={styles.confidenceText}>{listing?.price_confidence.toUpperCase()} CONFIDENCE</Text>
                        </View>
                    </View>

                    <View style={[styles.card, { flex: 1, marginLeft: 12 }]}>
                        <Text style={styles.label}>Condition</Text>
                        <Text style={styles.valueText}>{listing?.condition}</Text>
                    </View>
                </View>

                {/* Attributes Section */}
                <View style={styles.card}>
                    <Text style={styles.label}>Item Details</Text>
                    <View style={styles.attributeRow}>
                        <Attribute label="Brand" value={listing?.brand} />
                        <Attribute label="Size" value={listing?.size} />
                        <Attribute label="Color" value={listing?.color} />
                    </View>
                </View>

                {/* Description Section */}
                <View style={styles.card}>
                    <Text style={styles.label}>Description</Text>
                    <Text style={styles.descText}>{listing?.description}</Text>
                </View>

                {/* Actions */}
                <TouchableOpacity
                    style={styles.publishButton}
                    onPress={() => {
                        Alert.alert('Success', 'Listing successfully published to eBay! (Simulated)');
                        navigation.popToTop();
                    }}
                >
                    <Text style={styles.publishButtonText}>Confirm & List to eBay</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const Attribute = ({ label, value }: { label: string, value: any }) => (
    <View style={styles.attributeItem}>
        <Text style={styles.attrLabel}>{label}</Text>
        <Text style={styles.attrValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: 20,
    },
    loadingText: {
        color: theme.colors.textMuted,
        marginTop: 20,
        fontSize: 16,
        textAlign: 'center',
    },
    scrollContent: {
        padding: 20,
    },
    sectionTitle: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 20,
    },
    card: {
        backgroundColor: theme.colors.surface,
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    row: {
        flexDirection: 'row',
    },
    label: {
        color: theme.colors.textMuted,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    titleText: {
        color: theme.colors.text,
        fontSize: 20,
        fontWeight: 'bold',
    },
    priceText: {
        color: theme.colors.success,
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    valueText: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    confidenceBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    confidenceText: {
        color: theme.colors.success,
        fontSize: 10,
        fontWeight: 'bold',
    },
    attributeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    attributeItem: {
        flex: 1,
    },
    attrLabel: {
        color: theme.colors.textMuted,
        fontSize: 11,
        marginBottom: 2,
    },
    attrValue: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: 'bold',
    },
    descText: {
        color: theme.colors.textMuted,
        fontSize: 15,
        lineHeight: 22,
    },
    publishButton: {
        backgroundColor: theme.colors.primary,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    publishButtonText: {
        color: theme.colors.background,
        fontSize: 18,
        fontWeight: 'bold',
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 16,
        textAlign: 'center',
        margin: 40,
    },
    button: {
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginHorizontal: 40,
    },
    buttonText: {
        color: theme.colors.text,
        fontWeight: 'bold',
    }
});
