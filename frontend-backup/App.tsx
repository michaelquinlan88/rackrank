import { StatusBar } from 'expo-status-bar';
import React from 'react';
import RootNavigator from './src/navigation/RootNavigator';

/**
 * RackRank Mobile App
 * 
 * AI-first clothing resale scanner.
 * Root component for the Expo app.
 */
export default function App() {
    return (
        <>
            <RootNavigator />
            <StatusBar style="light" />
        </>
    );
}
