import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, ScrollView,
    SafeAreaView, Image, FlatList, Dimensions, RefreshControl, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme';
import { getAllListings, getListingStats, Listing, ListingStatus } from '../services/listingStorage';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - 48) / COLUMN_COUNT;

export default function HistoryScreen({ navigation }: any) {
    const [listings, setListings] = useState<Listing[]>([]);
    const [filter, setFilter] = useState<'all' | 'draft' | 'listed' | 'sold'>('all');
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ total: 0, drafts: 0, listed: 0, sold: 0 });

    // Load listings when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadListings();
        }, [])
    );

    const loadListings = async () => {
        try {
            const allListings = await getAllListings();
            const listingStats = await getListingStats();
            setListings(allListings);
            setStats(listingStats);
        } catch (e) {
            console.error('Failed to load listings:', e);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadListings();
        setRefreshing(false);
    };

    const filteredListings = listings.filter(item =>
        filter === 'all' ? true : item.status === filter
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'listed': return theme.colors.primary;
            case 'sold': return theme.colors.success;
            case 'draft': return theme.colors.textMuted;
            default: return theme.colors.textMuted;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'listed': return '';
            case 'sold': return '';
            case 'draft': return '';
            default: return '';
        }
    };

    const handleRelist = (item: Listing) => {
        // Navigate to Review screen with pre-filled data from sold listing
        Alert.alert(
            'Relist Item',
            `Relist "${item.title}" for $${item.price.toFixed(2)}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Adjust Price & Relist',
                    onPress: () => {
                        // Navigate with pre-filled data
                        navigation.navigate('Review', {
                            relistFrom: item,
                            suggestedPrice: item.price
                        });
                    }
                },
                {
                    text: 'Relist Same Price',
                    style: 'default',
                    onPress: () => {
                        navigation.navigate('Review', {
                            relistFrom: item,
                            suggestedPrice: item.price
                        });
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Listing }) => (
        <TouchableOpacity style={styles.itemCard} activeOpacity={0.8}>
            <Image
                source={{ uri: item.photoUris[0] || 'https://via.placeholder.com/300x400.png?text=No+Image' }}
                style={styles.itemImage}
            />
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{getStatusIcon(item.status)} {item.status.toUpperCase()}</Text>
            </View>
            <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={2}>{item.title || 'Untitled Item'}</Text>
                <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
            </View>
            {/* Quick Relist button for sold items */}
            {item.status === 'sold' && (
                <TouchableOpacity
                    style={styles.relistButton}
                    onPress={() => handleRelist(item)}
                >
                    <Text style={styles.relistButtonText}>Relist</Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );

    const renderStats = () => {
        const total = listings.length;
        const listed = listings.filter(i => i.status === 'listed').length;
        const sold = listings.filter(i => i.status === 'sold').length;
        const revenue = listings.filter(i => i.status === 'sold').reduce((sum, i) => sum + i.price, 0);

        return (
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{total}</Text>
                    <Text style={styles.statLabel}>Total Items</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{listed}</Text>
                    <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{sold}</Text>
                    <Text style={styles.statLabel}>Sold</Text>
                </View>
                <View style={[styles.statCard, styles.revenueCard]}>
                    <Text style={[styles.statValue, { color: theme.colors.success }]}>${revenue.toFixed(0)}</Text>
                    <Text style={styles.statLabel}>Revenue</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Stats */}
            {renderStats()}

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {(['all', 'draft', 'listed', 'sold'] as const).map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterTab, filter === f && styles.filterTabActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Listings Grid */}
            {filteredListings.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>Empty</Text>
                    <Text style={styles.emptyTitle}>No {filter === 'all' ? '' : filter + ' '}items yet</Text>
                    <Text style={styles.emptyText}>Start scanning to build your inventory</Text>
                    <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={() => navigation.navigate('Scan')}
                    >
                        <Text style={styles.emptyButtonText}>Start Scanning</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={filteredListings}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={COLUMN_COUNT}
                    contentContainerStyle={styles.grid}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.colors.primary}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    statsContainer: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        gap: 8,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.roundness.md,
        padding: 12,
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    revenueCard: {
        backgroundColor: theme.colors.successLight,
    },
    statValue: {
        color: theme.colors.text,
        fontSize: 20,
        fontWeight: '700',
    },
    statLabel: {
        color: theme.colors.textMuted,
        fontSize: 10,
        marginTop: 2,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
        gap: 8,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: theme.roundness.full,
        backgroundColor: theme.colors.surface,
        ...theme.shadows.sm,
    },
    filterTabActive: {
        backgroundColor: theme.colors.primary,
    },
    filterText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#FFF',
    },
    grid: {
        paddingHorizontal: theme.spacing.md,
        paddingBottom: 100,
    },
    itemCard: {
        width: ITEM_WIDTH,
        marginRight: 16,
        marginBottom: 16,
        borderRadius: theme.roundness.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
        ...theme.shadows.md,
    },
    itemImage: {
        width: '100%',
        height: ITEM_WIDTH * 1.3,
        backgroundColor: theme.colors.surfaceAlt,
    },
    statusBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.roundness.sm,
    },
    statusText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '700',
    },
    itemInfo: {
        padding: 12,
    },
    itemTitle: {
        color: theme.colors.text,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
        lineHeight: 18,
    },
    itemPrice: {
        color: theme.colors.primary,
        fontSize: 16,
        fontWeight: '700',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        color: theme.colors.text,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginBottom: 24,
    },
    emptyButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: theme.roundness.md,
        ...theme.shadows.md,
    },
    emptyButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 15,
    },
    relistButton: {
        backgroundColor: theme.colors.success,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: theme.roundness.sm,
        marginTop: 8,
        alignItems: 'center',
    },
    relistButtonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
});

