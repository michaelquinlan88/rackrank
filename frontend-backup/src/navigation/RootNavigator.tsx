import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScanScreen from '../screens/ScanScreen';
import CaptureScreen from '../screens/CaptureScreen';
import ReviewScreen from '../screens/ReviewScreen';
import { theme } from '../theme';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerStyle: {
                        backgroundColor: theme.colors.background,
                    },
                    headerTintColor: theme.colors.text,
                    headerShadowVisible: false,
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            >
                <Stack.Screen
                    name="Scan"
                    component={ScanScreen}
                    options={{ title: 'RackRank' }}
                />
                <Stack.Screen
                    name="Capture"
                    component={CaptureScreen}
                    options={{ title: 'Guide' }}
                />
                <Stack.Screen
                    name="Review"
                    component={ReviewScreen}
                    options={{ title: 'AI Result' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
