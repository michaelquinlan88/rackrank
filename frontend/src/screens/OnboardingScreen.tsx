/**
 * OnboardingScreen
 * 
 * Welcome carousel shown to first-time users.
 * Story 20: Onboarding Flow
 */

import React, { useState, useRef } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, SafeAreaView,
    Dimensions, FlatList, Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

const ONBOARDING_COMPLETE_KEY = '@rackrank:onboarding_complete';

interface OnboardingSlide {
    id: string;
    title: string;
    description: string;
    icon: string;
}

const slides: OnboardingSlide[] = [
    {
        id: '1',
        title: 'Snap Your Finds',
        description: 'Take photos of thrift store finds and let AI identify the brand, condition, and value instantly.',
        icon: 'camera',
    },
    {
        id: '2',
        title: 'List Everywhere',
        description: 'Create listings for eBay, Poshmark, Depop, and Facebook Marketplace with one tap.',
        icon: 'trending-up',
    },
    {
        id: '3',
        title: 'Start Selling',
        description: 'AI-powered pricing helps you maximize profits. Ready to find some gems?',
        icon: 'dollar-sign',
    },
];

export default function OnboardingScreen({ navigation }: any) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex(currentIndex + 1);
        } else {
            completeOnboarding();
        }
    };

    const handleSkip = () => {
        completeOnboarding();
    };

    const completeOnboarding = async () => {
        await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
        navigation.replace('MainTabs');
    };

    const renderSlide = ({ item }: { item: OnboardingSlide }) => (
        <View style={[styles.slide, { width }]}>
            <View style={styles.iconContainer}>
                <Text style={styles.iconPlaceholder}>
                    {item.icon === 'camera' ? '[]' : item.icon === 'trending-up' ? '//' : '$$'}
                </Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
        </View>
    );

    const renderDots = () => (
        <View style={styles.dotsContainer}>
            {slides.map((_, index) => {
                const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
                const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [8, 24, 8],
                    extrapolate: 'clamp',
                });
                const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                });

                return (
                    <Animated.View
                        key={index}
                        style={[styles.dot, { width: dotWidth, opacity }]}
                    />
                );
            })}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderSlide}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
            />

            {renderDots()}

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.nextButton}
                    onPress={handleNext}
                    activeOpacity={0.8}
                >
                    <Text style={styles.nextText}>
                        {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

/**
 * Check if onboarding has been completed
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
    try {
        const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
        return value === 'true';
    } catch {
        return false;
    }
}

/**
 * Reset onboarding (for testing)
 */
export async function resetOnboarding(): Promise<void> {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    skipButton: {
        padding: 10,
    },
    skipText: {
        color: theme.colors.textMuted,
        fontSize: 16,
    },
    slide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    iconPlaceholder: {
        fontSize: 40,
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: theme.colors.textMuted,
        textAlign: 'center',
        lineHeight: 24,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.primary,
        marginHorizontal: 4,
    },
    footer: {
        paddingHorizontal: 40,
        paddingBottom: 40,
    },
    nextButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    nextText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
