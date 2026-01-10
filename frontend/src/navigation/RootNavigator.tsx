import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ScanScreen from '../screens/ScanScreen';
import CaptureScreen from '../screens/CaptureScreen';
import ReviewScreen from '../screens/ReviewScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import OnboardingScreen, { hasCompletedOnboarding } from '../screens/OnboardingScreen';
import { theme } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

// Custom tab bar icon
const TabIcon = ({ icon, focused }: { icon: string; focused: boolean }) => (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
        <Text style={styles.tabEmoji}>{icon}</Text>
    </View>
);

// Main scanning flow as a stack
function ScanStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: theme.colors.background,
                },
                headerTintColor: theme.colors.text,
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                contentStyle: {
                    backgroundColor: theme.colors.background,
                },
            }}
        >
            <Stack.Screen
                name="ScanHome"
                component={ScanScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Capture"
                component={CaptureScreen}
                options={{ title: 'Capture Photos' }}
            />
            <Stack.Screen
                name="Review"
                component={ReviewScreen}
                options={{ title: 'AI Listing' }}
            />
        </Stack.Navigator>
    );
}

// Main tab navigator
function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: theme.colors.background,
                    borderTopColor: theme.colors.border,
                    borderTopWidth: 1,
                    height: 85,
                    paddingTop: 8,
                    paddingBottom: 20,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 4,
                },
                headerStyle: {
                    backgroundColor: theme.colors.background,
                },
                headerTintColor: theme.colors.text,
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Tab.Screen
                name="Scan"
                component={ScanStack}
                options={{
                    headerShown: false,
                    tabBarIcon: ({ focused }) => <TabIcon icon="[]" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="History"
                component={HistoryScreen}
                options={{
                    title: 'My Listings',
                    tabBarIcon: ({ focused }) => <TabIcon icon="[=]" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarIcon: ({ focused }) => <TabIcon icon="[*]" focused={focused} />,
                }}
            />
        </Tab.Navigator>
    );
}

// Loading screen while checking onboarding status
function LoadingScreen() {
    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
        </View>
    );
}

export default function RootNavigator() {
    const [isLoading, setIsLoading] = useState(true);
    const [hasOnboarded, setHasOnboarded] = useState(false);

    useEffect(() => {
        checkOnboardingStatus();
    }, []);

    const checkOnboardingStatus = async () => {
        try {
            const completed = await hasCompletedOnboarding();
            setHasOnboarded(completed);
        } catch (error) {
            console.error('Error checking onboarding status:', error);
            setHasOnboarded(false);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <NavigationContainer>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                {!hasOnboarded ? (
                    <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
                ) : null}
                <RootStack.Screen name="MainTabs" component={MainTabs} />
            </RootStack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    tabIcon: {
        width: 40,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
    },
    tabIconFocused: {
        backgroundColor: theme.colors.primaryLight,
    },
    tabEmoji: {
        fontSize: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: theme.colors.textMuted,
    },
});
