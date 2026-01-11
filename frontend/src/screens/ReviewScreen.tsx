import React, { useEffect, useState, useRef } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, ScrollView,
    ActivityIndicator, SafeAreaView, Alert, Animated, Linking,
    Vibration, TextInput, Clipboard, Switch
} from 'react-native';
import { theme } from '../theme';
import { createListing, saveListing, updateListingStatus, MarketplaceType } from '../services/listingStorage';

/**
 * ReviewScreen
 * 
 * Fetches AI-generated listing details from the backend.
 * Displays the results with animations for user confirmation before listing.
 */

// LOCAL DEVELOPMENT: Using your computer's local IP for phone connectivity
const BACKEND_URL = 'http://192.168.0.89:8000';

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
    const base64Images = route.params?.base64Images || [];
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [listing, setListing] = useState<ListingResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Editable fields state
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editPrice, setEditPrice] = useState(0);
    const [priceMode, setPriceMode] = useState<'fast' | 'max'>('fast'); // Sell Fast vs Max Value

    // Story 9: Multi-Marketplace Selector
    const [selectedMarketplaces, setSelectedMarketplaces] = useState({
        ebay: true,       // Default on - eBay is primary
        facebook: false,
        poshmark: false,  // Replaced Mercari with Poshmark
        depop: false,     // Story 11: Depop Integration
    });
    const connectedMarketplaces = {
        ebay: true,       // Simulated connection status
        facebook: true,
        poshmark: true,   // Poshmark connected
        depop: true,      // Story 11: Depop connected
    };

    // Story 11: Depop style tags auto-generation
    const styleTags = ['Vintage', 'Streetwear', 'Y2K', 'Retro', 'Athleisure'];

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                setLoading(true);

                console.log('Sending to /analyze with', base64Images.length, 'images');

                const response = await fetch(`${BACKEND_URL}/analyze`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        // Use the base64 images passed from CaptureScreen
                        image_base64_list: base64Images,
                        image_urls: images,
                        user_id: 'local_user_001',
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to connect to RackRank backend. Ensure server is running.');
                }

                const data = await response.json();
                setListing(data);
                // Initialize editable fields
                setEditTitle(data.title || '');
                setEditDescription(data.description || '');
                setEditPrice(data.suggested_price || 0);

                // Trigger entrance animations
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        tension: 50,
                        friction: 8,
                        useNativeDriver: true,
                    }),
                ]).start();

                // Haptic feedback
                Vibration.vibrate(50);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, []);

    // Pulsing animation for the price
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    const handlePublish = async () => {
        if (!listing) return;

        setPublishing(true);
        Vibration.vibrate(100);

        try {
            const response = await fetch(`${BACKEND_URL}/create-listing`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: listing.title,
                    description: listing.description,
                    price: listing.suggested_price,
                    category: listing.category,
                    condition: listing.condition,
                    brand: listing.brand,
                    size: listing.size,
                    color: listing.color,
                    image_urls: images,
                }),
            });

            const result = await response.json();

            if (result.success) {
                // Save listing to persistent storage
                const listingId = route.params?.listingId || `listing_${Date.now()}`;
                const newListing = createListing({
                    id: listingId,
                    title: editTitle,
                    description: editDescription,
                    price: editPrice,
                    category: listing.category,
                    condition: listing.condition,
                    brand: listing.brand,
                    size: listing.size,
                    color: listing.color,
                    status: 'listed',
                    photoUris: images,
                    marketplaces: ['ebay'] as MarketplaceType[],
                    listedAt: Date.now(),
                });
                await saveListing(newListing);

                Vibration.vibrate([0, 100, 100, 100]);
                Alert.alert(
                    '🎉 Listed Successfully!',
                    `Your item is now live on eBay!\n\nItem ID: ${result.item_id}`,
                    [
                        {
                            text: 'View Listing',
                            onPress: () => {
                                if (result.listing_url) {
                                    Linking.openURL(result.listing_url);
                                }
                            },
                        },
                        {
                            text: 'Done',
                            onPress: () => navigation.popToTop(),
                        },
                    ]
                );
            } else {
                Alert.alert('Error', result.error || 'Failed to create listing');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setPublishing(false);
        }
    };

    // Story 5: FB Marketplace Copy & Go
    const handleFacebookCopy = async () => {
        if (!listing) return;

        Vibration.vibrate(50);

        // Create optimized Facebook-friendly text
        const fbText = `${editTitle}\n\n$${editPrice.toFixed(0)}\n\n${editDescription || listing.description}\n\n* ${listing?.condition} condition\n* Size: ${listing?.size}\n* Brand: ${listing?.brand}`;

        // Copy to clipboard
        Clipboard.setString(fbText);

        // Show toast and open FB Marketplace
        Alert.alert(
            'Copied!',
            'Opening Facebook Marketplace...\n\nPaste the text and add your photos.',
            [
                {
                    text: 'Open Marketplace',
                    onPress: () => {
                        // Deep link to FB Marketplace (iOS/Android)
                        Linking.openURL('fb://marketplace/create');
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingCard}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingTitle}>Analyzing...</Text>
                    <Text style={styles.loadingText}>Gemini AI is identifying your item</Text>
                    <View style={styles.loadingSteps}>
                        <LoadingStep text="Detecting brand & style" delay={0} />
                        <LoadingStep text="Evaluating condition" delay={500} />
                        <LoadingStep text="Calculating market price" delay={1000} />
                    </View>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <View style={styles.errorCard}>
                    <Text style={styles.errorIcon}>X</Text>
                    <Text style={styles.errorTitle}>Connection Error</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.retryButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                    <View style={styles.successBadge}>
                        <Text style={styles.successIcon}>✨</Text>
                        <Text style={styles.successText}>AI ANALYSIS COMPLETE</Text>
                    </View>

                    {/* Title Section */}
                    {/* Editable Title Section */}
                    <View style={styles.card}>
                        <Text style={styles.label}>Listing Title</Text>
                        <TextInput
                            style={styles.editableTitle}
                            value={editTitle}
                            onChangeText={setEditTitle}
                            multiline
                            placeholder="Enter title..."
                            placeholderTextColor={theme.colors.textMuted}
                        />
                    </View>

                    {/* Price Section with Sell Fast / Max Value Toggle */}
                    <View style={styles.row}>
                        <Animated.View style={[styles.card, styles.priceCard, { transform: [{ scale: pulseAnim }] }]}>
                            <View style={styles.priceToggle}>
                                <TouchableOpacity
                                    style={[styles.toggleButton, priceMode === 'fast' && styles.toggleActive]}
                                    onPress={() => {
                                        setPriceMode('fast');
                                        setEditPrice((listing?.suggested_price || 0) * 0.85); // 15% less for fast sale
                                    }}
                                >
                                    <Text style={[styles.toggleText, priceMode === 'fast' && styles.toggleTextActive]}>🚀 Sell Fast</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleButton, priceMode === 'max' && styles.toggleActive]}
                                    onPress={() => {
                                        setPriceMode('max');
                                        setEditPrice((listing?.suggested_price || 0) * 1.15); // 15% more for max value
                                    }}
                                >
                                    <Text style={[styles.toggleText, priceMode === 'max' && styles.toggleTextActive]}>💎 Max Value</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.priceText}>${editPrice.toFixed(2)}</Text>
                            <Text style={styles.priceHint}>
                                {priceMode === 'fast' ? 'Quick sale price' : 'Maximum returns'}
                            </Text>
                        </Animated.View>

                        <View style={[styles.card, styles.conditionCard]}>
                            <Text style={styles.label}>Condition</Text>
                            <Text style={styles.conditionText}>{listing?.condition}</Text>
                            <View style={styles.conditionIndicator}>
                                <View style={[styles.conditionDot, styles.dotFilled]} />
                                <View style={[styles.conditionDot, listing?.condition !== 'Fair' && styles.dotFilled]} />
                                <View style={[styles.conditionDot, (listing?.condition === 'Excellent' || listing?.condition === 'New With Tags') && styles.dotFilled]} />
                            </View>
                        </View>
                    </View>

                    {/* Attributes Section */}
                    <View style={styles.card}>
                        <Text style={styles.label}>Item Details</Text>
                        <View style={styles.attributeRow}>
                            <Attribute label="Brand" value={listing?.brand} icon="🏷️" />
                            <Attribute label="Size" value={listing?.size} icon="📐" />
                            <Attribute label="Color" value={listing?.color} icon="🎨" />
                        </View>
                    </View>

                    {/* Description Section */}
                    <View style={styles.card}>
                        <Text style={styles.label}>Description</Text>
                        <Text style={styles.descText}>{listing?.description}</Text>
                    </View>

                    {/* Category */}
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>📁 {listing?.category}</Text>
                    </View>

                    {/* Story 9: Multi-Marketplace Selector */}
                    <View style={styles.card}>
                        <Text style={styles.label}>List On Marketplaces</Text>
                        <Text style={styles.marketplaceSub}>Select platforms to list this item</Text>

                        {/* eBay Toggle */}
                        <View style={styles.marketplaceRow}>
                            <View style={styles.marketplaceInfo}>
                                <Text style={styles.marketplaceIcon}>eB</Text>
                                <View>
                                    <Text style={styles.marketplaceName}>eBay</Text>
                                    <Text style={[styles.marketplaceStatus, connectedMarketplaces.ebay && styles.connectedStatus]}>
                                        {connectedMarketplaces.ebay ? 'Connected' : 'Not connected'}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={selectedMarketplaces.ebay}
                                onValueChange={(val) => setSelectedMarketplaces({ ...selectedMarketplaces, ebay: val })}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                                thumbColor={selectedMarketplaces.ebay ? theme.colors.primary : '#f4f3f4'}
                            />
                        </View>

                        {/* Facebook Toggle */}
                        <View style={styles.marketplaceRow}>
                            <View style={styles.marketplaceInfo}>
                                <Text style={styles.marketplaceIcon}>FB</Text>
                                <View>
                                    <Text style={styles.marketplaceName}>Facebook Marketplace</Text>
                                    <Text style={[styles.marketplaceStatus, connectedMarketplaces.facebook && styles.connectedStatus]}>
                                        {connectedMarketplaces.facebook ? 'Connected (Copy & Go)' : 'Not connected'}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={selectedMarketplaces.facebook}
                                onValueChange={(val) => setSelectedMarketplaces({ ...selectedMarketplaces, facebook: val })}
                                trackColor={{ false: theme.colors.border, true: '#1877F2' }}
                                thumbColor={selectedMarketplaces.facebook ? '#1877F2' : '#f4f3f4'}
                            />
                        </View>

                        {/* Poshmark Toggle */}
                        <View style={styles.marketplaceRow}>
                            <View style={styles.marketplaceInfo}>
                                <Text style={styles.marketplaceIcon}>PM</Text>
                                <View>
                                    <Text style={styles.marketplaceName}>Poshmark</Text>
                                    <Text style={[styles.marketplaceStatus, connectedMarketplaces.poshmark && styles.connectedStatus]}>
                                        {connectedMarketplaces.poshmark ? 'Connected' : 'Tap to connect'}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={selectedMarketplaces.poshmark}
                                onValueChange={(val) => setSelectedMarketplaces({ ...selectedMarketplaces, poshmark: val })}
                                trackColor={{ false: theme.colors.border, true: '#7D1D3F' }}
                                thumbColor={selectedMarketplaces.poshmark ? '#7D1D3F' : '#f4f3f4'}
                            />
                        </View>

                        {/* Story 11: Depop Toggle */}
                        <View style={[styles.marketplaceRow, styles.lastRow]}>
                            <View style={styles.marketplaceInfo}>
                                <Text style={styles.marketplaceIcon}>DP</Text>
                                <View>
                                    <Text style={styles.marketplaceName}>Depop</Text>
                                    <Text style={[styles.marketplaceStatus, connectedMarketplaces.depop && styles.connectedStatus]}>
                                        {connectedMarketplaces.depop ? 'Connected' : 'Not connected'}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={selectedMarketplaces.depop}
                                onValueChange={(val) => setSelectedMarketplaces({ ...selectedMarketplaces, depop: val })}
                                trackColor={{ false: theme.colors.border, true: '#FF2300' }}
                                thumbColor={selectedMarketplaces.depop ? '#FF2300' : '#f4f3f4'}
                            />
                        </View>

                        {/* Story 11: Style Tags for Depop */}
                        {selectedMarketplaces.depop && (
                            <View style={styles.styleTagsSection}>
                                <Text style={styles.styleTagsLabel}>Auto-Generated Style Tags:</Text>
                                <View style={styles.styleTagsRow}>
                                    {styleTags.map((tag, index) => (
                                        <View key={index} style={styles.styleTag}>
                                            <Text style={styles.styleTagText}>#{tag}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>

                </Animated.View>
            </ScrollView>

            {/* Fixed Action Bar with Two Marketplace Options */}
            <View style={styles.actionBar}>
                <View style={styles.actionButtons}>
                    {/* eBay Button */}
                    <TouchableOpacity
                        style={[styles.publishButton, styles.ebayButton, publishing && styles.publishingButton]}
                        onPress={handlePublish}
                        disabled={publishing}
                    >
                        {publishing ? (
                            <>
                                <ActivityIndicator size="small" color={theme.colors.background} />
                                <Text style={styles.publishButtonText}>Publishing...</Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.publishEmoji}>eB</Text>
                                <Text style={styles.publishButtonText}>eBay</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Facebook Marketplace Button */}
                    <TouchableOpacity
                        style={[styles.publishButton, styles.facebookButton]}
                        onPress={handleFacebookCopy}
                    >
                        <Text style={styles.publishEmoji}>📋</Text>
                        <Text style={styles.publishButtonText}>Copy for FB</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

// Loading step component with staggered animation
const LoadingStep = ({ text, delay }: { text: string; delay: number }) => {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            delay,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View style={[styles.loadingStep, { opacity }]}>
            <Text style={styles.loadingStepText}>• {text}</Text>
        </Animated.View>
    );
};

const Attribute = ({ label, value, icon }: { label: string; value: any; icon: string }) => (
    <View style={styles.attributeItem}>
        <Text style={styles.attrIcon}>{icon}</Text>
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
    loadingCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        maxWidth: 320,
    },
    loadingTitle: {
        color: theme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
    },
    loadingText: {
        color: theme.colors.textMuted,
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    loadingSteps: {
        marginTop: 24,
        alignSelf: 'flex-start',
    },
    loadingStep: {
        marginVertical: 4,
    },
    loadingStepText: {
        color: theme.colors.textMuted,
        fontSize: 13,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    successBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(74, 222, 128, 0.3)',
    },
    successIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    successText: {
        color: theme.colors.success,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: theme.colors.surface,
        padding: 20,
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    priceCard: {
        flex: 1,
        alignItems: 'center',
    },
    conditionCard: {
        flex: 1,
        alignItems: 'center',
    },
    label: {
        color: theme.colors.textMuted,
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    titleText: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 24,
    },
    editableTitle: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 24,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingBottom: 8,
    },
    priceToggle: {
        flexDirection: 'row',
        marginBottom: 12,
        gap: 8,
    },
    toggleButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.roundness.md,
        backgroundColor: theme.colors.surfaceAlt,
    },
    toggleActive: {
        backgroundColor: theme.colors.primary,
    },
    toggleText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    toggleTextActive: {
        color: '#FFFFFF',
    },
    priceHint: {
        color: theme.colors.textMuted,
        fontSize: 11,
        marginTop: 6,
    },
    priceText: {
        color: theme.colors.success,
        fontSize: 32,
        fontWeight: 'bold',
    },
    confidenceBadge: {
        marginTop: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    highConfidence: {
        backgroundColor: 'rgba(74, 222, 128, 0.2)',
    },
    mediumConfidence: {
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
    },
    confidenceText: {
        color: theme.colors.text,
        fontSize: 11,
        fontWeight: 'bold',
    },
    conditionText: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 4,
    },
    conditionIndicator: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 12,
    },
    conditionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dotFilled: {
        backgroundColor: theme.colors.success,
    },
    attributeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    attributeItem: {
        flex: 1,
        alignItems: 'center',
    },
    attrIcon: {
        fontSize: 20,
        marginBottom: 4,
    },
    attrLabel: {
        color: theme.colors.textMuted,
        fontSize: 10,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    attrValue: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: 'bold',
    },
    descText: {
        color: theme.colors.textMuted,
        fontSize: 14,
        lineHeight: 22,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    categoryText: {
        color: theme.colors.textMuted,
        fontSize: 12,
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 36,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    ebayButton: {
        flex: 1,
    },
    facebookButton: {
        flex: 1,
        backgroundColor: '#1877F2', // Facebook blue
    },
    publishButton: {
        backgroundColor: theme.colors.primary,
        padding: 18,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    publishingButton: {
        opacity: 0.7,
    },
    publishEmoji: {
        fontSize: 18,
    },
    publishButtonText: {
        color: theme.colors.background,
        fontSize: 17,
        fontWeight: 'bold',
    },
    errorCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        margin: 20,
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    errorTitle: {
        color: theme.colors.text,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    errorText: {
        color: theme.colors.textMuted,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    retryButtonText: {
        color: theme.colors.text,
        fontWeight: 'bold',
    },
    // Story 9: Marketplace Selector Styles
    marketplaceSub: {
        color: theme.colors.textMuted,
        fontSize: 12,
        marginBottom: 16,
    },
    marketplaceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    marketplaceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    marketplaceIcon: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFF',
        backgroundColor: theme.colors.textMuted,
        width: 28,
        height: 28,
        borderRadius: 14,
        textAlign: 'center',
        textAlignVertical: 'center',
        lineHeight: 28,
        overflow: 'hidden',
    },
    marketplaceName: {
        color: theme.colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    marketplaceStatus: {
        color: theme.colors.textMuted,
        fontSize: 11,
        marginTop: 2,
    },
    connectedStatus: {
        color: theme.colors.success,
    },
    notConnectedStatus: {
        color: theme.colors.textMuted,
        fontStyle: 'italic',
    },
    // Story 11: Depop Style Tags
    styleTagsSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    styleTagsLabel: {
        color: theme.colors.textMuted,
        fontSize: 11,
        marginBottom: 8,
    },
    styleTagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    styleTag: {
        backgroundColor: 'rgba(255, 35, 0, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 35, 0, 0.3)',
    },
    styleTagText: {
        color: '#FF2300',
        fontSize: 11,
        fontWeight: '600',
    },
});
