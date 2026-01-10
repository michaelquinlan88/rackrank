import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, SafeAreaView,
    Animated, Dimensions, Vibration, StatusBar, Alert, ActivityIndicator
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Detection result type
interface DetectionResult {
    brand: string;
    confidence: number;
    priceRange: string;
    category: string;
}

interface ScanScreenProps {
    navigation: any;
}

export default function ScanScreen({ navigation }: ScanScreenProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [detection, setDetection] = useState<DetectionResult | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [backendUrl, setBackendUrl] = useState<string>('http://localhost:8000');

    // Story 12: Barcode scanning mode
    const [scanMode, setScanMode] = useState<'ai' | 'barcode'>('ai');
    const [barcodeResult, setBarcodeResult] = useState<string | null>(null);
    const [barcodeLoading, setBarcodeLoading] = useState(false);

    const cameraRef = useRef<CameraView>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const detectionOpacity = useRef(new Animated.Value(0)).current;
    const detectionSlide = useRef(new Animated.Value(30)).current;
    const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const scanLineTranslateY = useMemo(
        () => scanLineAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 320],
        }),
        [scanLineAnim]
    );

    // Load backend URL from settings
    useEffect(() => {
        AsyncStorage.getItem('backendUrl').then(url => {
            if (url) setBackendUrl(url);
        });
    }, []);

    // Pulsing animation
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [pulseAnim]);

    // Scan line animation
    useEffect(() => {
        const scanLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                Animated.timing(scanLineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        scanLoop.start();
        return () => scanLoop.stop();
    }, [scanLineAnim]);

    // Real AI detection using camera frame capture
    const performQuickScan = useCallback(async () => {
        if (!cameraRef.current || isScanning) return;

        setIsScanning(true);
        try {
            // Capture a frame from the camera
            const photo = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.3, // Low quality for fast transfer
                skipProcessing: true,
            });

            if (!photo?.base64) {
                setIsScanning(false);
                return;
            }

            // Call the backend quick-scan API
            const response = await fetch(`${backendUrl}/quick-scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_base64: photo.base64 }),
            });

            if (response.ok) {
                const data = await response.json();
                const result: DetectionResult = {
                    brand: data.brand,
                    confidence: data.confidence,
                    priceRange: `$${data.price_min}-$${data.price_max}`,
                    category: data.category,
                };

                setDetection(result);
                Vibration.vibrate(30);
                detectionSlide.setValue(20);

                Animated.parallel([
                    Animated.timing(detectionOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
                    Animated.spring(detectionSlide, { toValue: 0, tension: 100, friction: 8, useNativeDriver: true }),
                ]).start();
            }
        } catch (error) {
            console.log('Quick scan error:', error);
        }
        setIsScanning(false);
    }, [backendUrl, isScanning, detectionOpacity, detectionSlide]);

    // Start scanning loop when camera is active
    useEffect(() => {
        if (permission?.granted && scanMode === 'ai') {
            // Scan every 3 seconds (to avoid overwhelming the API)
            scanIntervalRef.current = setInterval(performQuickScan, 3000);
            // Initial scan after 1 second
            const initialTimeout = setTimeout(performQuickScan, 1000);

            return () => {
                if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
                clearTimeout(initialTimeout);
            };
        }
    }, [permission?.granted, scanMode, performQuickScan]);

    const handleQuickCapture = useCallback(() => {
        Vibration.vibrate(100);
        navigation.navigate('Capture');
    }, [navigation]);


    // Story 12: Simulate barcode detection
    const handleBarcodeDetected = useCallback(() => {
        if (barcodeLoading) return;
        setBarcodeLoading(true);
        Vibration.vibrate(50);

        // Simulate barcode lookup
        setTimeout(() => {
            const found = Math.random() > 0.3; // 70% success rate
            if (found) {
                setBarcodeResult('Nike Air Max 90 - Size 10');
                Vibration.vibrate([0, 50, 50, 50]);
            } else {
                // Fall back to AI scan
                Alert.alert(
                    '🔍 Barcode Not Found',
                    'This item isn\'t in our database. Switching to AI scan...',
                    [{ text: 'OK', onPress: () => setScanMode('ai') }]
                );
            }
            setBarcodeLoading(false);
        }, 1500);
    }, [barcodeLoading]);

    // Toggle scan mode
    const toggleScanMode = useCallback(() => {
        setScanMode(prev => prev === 'ai' ? 'barcode' : 'ai');
        setBarcodeResult(null);
        Vibration.vibrate(30);
    }, []);

    if (!permission) {
        return (
            <View style={styles.centerContainer}>
                <StatusBar barStyle="dark-content" />
                <Text style={styles.loadingText}>Loading camera...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.centerContainer}>
                <StatusBar barStyle="dark-content" />
                <Text style={styles.permissionIcon}>Camera</Text>
                <Text style={styles.permissionTitle}>Camera Access</Text>
                <Text style={styles.permissionText}>
                    RackRank needs camera access to scan your clothing items.
                </Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Enable Camera</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

            {/* Gradient overlays */}
            <View style={styles.topGradient} />
            <View style={styles.bottomGradient} />

            <SafeAreaView style={styles.overlay}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>RR</Text>
                    </View>
                    <Text style={styles.tagline}>
                        {scanMode === 'ai' ? 'AI-Powered Resale Scanner' : 'Barcode Scanner Mode'}
                    </Text>

                    {/* Story 12: Scan Mode Toggle */}
                    <TouchableOpacity style={styles.modeToggle} onPress={toggleScanMode} activeOpacity={0.7}>
                        <Text style={styles.modeToggleText}>
                            {scanMode === 'ai' ? 'AI' : 'UPC'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Reticle */}
                <View style={styles.reticleContainer}>
                    <Animated.View style={[styles.reticle, { transform: [{ scale: pulseAnim }] }]}>
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                        <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineTranslateY }] }]} />
                    </Animated.View>
                    <Text style={styles.hintText}>Point at a clothing item</Text>
                </View>

                {/* Detection Card */}
                {detection && (
                    <Animated.View style={[styles.detectionCard, { opacity: detectionOpacity, transform: [{ translateY: detectionSlide }] }]}>
                        <View style={styles.detectionHeader}>
                            <View style={styles.brandBadge}>
                                <Text style={styles.brandText}>{detection.brand}</Text>
                            </View>
                            <View style={styles.confidenceBadge}>
                                <Text style={styles.confidenceText}>{Math.round(detection.confidence * 100)}% match</Text>
                            </View>
                        </View>
                        {/* Prominent value display */}
                        <View style={styles.valueHighlight}>
                            <Text style={styles.valueLabel}>Estimated Value</Text>
                            <Text style={styles.valueAmount}>{detection.priceRange}</Text>
                        </View>

                        {/* Story 10: Price Intelligence Dashboard */}
                        <View style={styles.priceIntelSection}>
                            <Text style={styles.priceIntelTitle}>Price Intelligence</Text>

                            <View style={styles.priceIntelGrid}>
                                <View style={styles.priceIntelItem}>
                                    <Text style={styles.priceIntelValue}>12</Text>
                                    <Text style={styles.priceIntelLabel}>Similar Sold</Text>
                                </View>
                                <View style={styles.priceIntelItem}>
                                    <Text style={styles.priceIntelValue}>$52</Text>
                                    <Text style={styles.priceIntelLabel}>Avg Price</Text>
                                </View>
                                <View style={styles.priceIntelItem}>
                                    <Text style={styles.priceIntelValue}>5d</Text>
                                    <Text style={styles.priceIntelLabel}>Avg Days</Text>
                                </View>
                            </View>

                            <View style={styles.confidenceBar}>
                                <View style={[styles.confidenceFill, { width: `${detection.confidence * 100}%` }]} />
                            </View>
                            <Text style={styles.confidenceLabel}>Price confidence: {Math.round(detection.confidence * 100)}%</Text>
                        </View>

                        <View style={styles.detectionDetails}>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Category</Text>
                                <Text style={styles.detailValue}>{detection.category}</Text>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* Capture Button */}
                <View style={styles.bottomActions}>
                    <TouchableOpacity style={styles.captureButton} onPress={handleQuickCapture} activeOpacity={0.8}>
                        <View style={styles.captureOuter}>
                            <View style={styles.captureInner}>
                                <Text style={styles.captureIcon}>+</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.captureLabel}>Tap to Start Listing</Text>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.xl,
    },
    loadingText: {
        color: theme.colors.textMuted,
        fontSize: 16,
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 150,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 280,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlay: {
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        paddingTop: theme.spacing.lg,
    },
    logoContainer: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: theme.roundness.md,
    },
    logoText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 2,
    },
    tagline: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 8,
        fontWeight: '500',
    },
    reticleContainer: {
        alignItems: 'center',
    },
    reticle: {
        width: 280,
        height: 350,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderColor: theme.colors.primary,
    },
    topLeft: {
        top: 0, left: 0,
        borderTopWidth: 4, borderLeftWidth: 4,
        borderTopLeftRadius: 16,
    },
    topRight: {
        top: 0, right: 0,
        borderTopWidth: 4, borderRightWidth: 4,
        borderTopRightRadius: 16,
    },
    bottomLeft: {
        bottom: 0, left: 0,
        borderBottomWidth: 4, borderLeftWidth: 4,
        borderBottomLeftRadius: 16,
    },
    bottomRight: {
        bottom: 0, right: 0,
        borderBottomWidth: 4, borderRightWidth: 4,
        borderBottomRightRadius: 16,
    },
    scanLine: {
        position: 'absolute',
        left: 10,
        right: 10,
        height: 2,
        backgroundColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    hintText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginTop: 20,
        fontWeight: '500',
    },
    detectionCard: {
        marginHorizontal: 20,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: theme.roundness.lg,
        padding: theme.spacing.md,
        ...theme.shadows.lg,
    },
    detectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    brandBadge: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: theme.roundness.md,
    },
    brandText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
    confidenceBadge: {
        backgroundColor: theme.colors.successLight,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: theme.roundness.sm,
    },
    confidenceText: {
        color: theme.colors.success,
        fontSize: 12,
        fontWeight: '600',
    },
    valueHighlight: {
        backgroundColor: theme.colors.primaryLight,
        borderRadius: theme.roundness.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        alignItems: 'center',
    },
    valueLabel: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    valueAmount: {
        color: theme.colors.primary,
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -1,
    },
    detectionDetails: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailItem: {
        flex: 1,
        alignItems: 'center',
    },
    detailLabel: {
        color: theme.colors.textMuted,
        fontSize: 11,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    detailValue: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '700',
        marginTop: 2,
    },
    detailDivider: {
        width: 1,
        height: 30,
        backgroundColor: theme.colors.border,
    },
    bottomActions: {
        alignItems: 'center',
        paddingBottom: 40,
    },
    captureButton: {
        marginBottom: 12,
    },
    captureOuter: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: theme.colors.primary,
    },
    captureInner: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureIcon: {
        fontSize: 32,
        fontWeight: '300',
        color: '#FFFFFF',
    },
    captureLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '600',
    },
    permissionIcon: {
        fontSize: 64,
        marginBottom: 20,
    },
    permissionTitle: {
        color: theme.colors.text,
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 12,
    },
    permissionText: {
        color: theme.colors.textSecondary,
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    permissionButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: theme.roundness.md,
    },
    permissionButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
    // Story 10: Price Intelligence Dashboard Styles
    priceIntelSection: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: theme.roundness.md,
        padding: 12,
        marginTop: 12,
    },
    priceIntelTitle: {
        color: theme.colors.text,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 10,
    },
    priceIntelGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 12,
    },
    priceIntelItem: {
        alignItems: 'center',
    },
    priceIntelValue: {
        color: theme.colors.primary,
        fontSize: 20,
        fontWeight: '700',
    },
    priceIntelLabel: {
        color: theme.colors.textMuted,
        fontSize: 10,
        marginTop: 2,
    },
    confidenceBar: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 6,
    },
    confidenceFill: {
        height: '100%',
        backgroundColor: theme.colors.success,
        borderRadius: 3,
    },
    confidenceLabel: {
        color: theme.colors.textMuted,
        fontSize: 10,
        textAlign: 'center',
    },
    // Story 12: Barcode Scan Mode Toggle
    modeToggle: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    modeToggleText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    barcodePrompt: {
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: theme.roundness.md,
        marginBottom: 16,
        alignItems: 'center',
    },
    barcodePromptText: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    barcodeResult: {
        backgroundColor: theme.colors.success,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: theme.roundness.sm,
    },
    barcodeResultText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
});
