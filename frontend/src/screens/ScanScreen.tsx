import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, SafeAreaView,
    Animated, Dimensions, Vibration, StatusBar, Image, ActivityIndicator
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

type ScanState = 'camera' | 'preview' | 'analyzing' | 'result';

export default function ScanScreen({ navigation }: ScanScreenProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanState, setScanState] = useState<ScanState>('camera');
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [detection, setDetection] = useState<DetectionResult | null>(null);
    const [backendUrl, setBackendUrl] = useState<string>('http://localhost:8000');

    const cameraRef = useRef<CameraView>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const resultOpacity = useRef(new Animated.Value(0)).current;
    const resultSlide = useRef(new Animated.Value(30)).current;

    // Load backend URL from settings
    React.useEffect(() => {
        AsyncStorage.getItem('backendUrl').then(url => {
            if (url) setBackendUrl(url);
        });
    }, []);

    // Pulsing animation for capture button
    React.useEffect(() => {
        if (scanState === 'camera') {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [pulseAnim, scanState]);

    // Capture photo
    const handleCapture = useCallback(async () => {
        if (!cameraRef.current || scanState !== 'camera') return;

        Vibration.vibrate(50);

        try {
            const photo = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.7,
            });

            if (photo?.uri && photo?.base64) {
                setCapturedPhoto(photo.uri);
                setScanState('preview');
            }
        } catch (error) {
            console.log('Capture error:', error);
        }
    }, [scanState]);

    // Retake photo
    const handleRetake = useCallback(() => {
        setCapturedPhoto(null);
        setDetection(null);
        setScanState('camera');
        resultOpacity.setValue(0);
        resultSlide.setValue(30);
    }, [resultOpacity, resultSlide]);

    // Analyze photo
    const handleAnalyze = useCallback(async () => {
        if (!capturedPhoto) return;

        setScanState('analyzing');
        Vibration.vibrate(30);

        try {
            // Get base64 from the captured photo
            const response = await fetch(capturedPhoto);
            const blob = await response.blob();
            const reader = new FileReader();

            reader.onloadend = async () => {
                const base64String = (reader.result as string).split(',')[1];

                try {
                    const apiResponse = await fetch(`${backendUrl}/quick-scan`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image_base64: base64String }),
                    });

                    if (apiResponse.ok) {
                        const data = await apiResponse.json();
                        const result: DetectionResult = {
                            brand: data.brand,
                            confidence: data.confidence,
                            priceRange: `$${data.price_min}-$${data.price_max}`,
                            category: data.category,
                        };

                        setDetection(result);
                        setScanState('result');

                        // Animate result in
                        Animated.parallel([
                            Animated.timing(resultOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                            Animated.spring(resultSlide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
                        ]).start();

                        Vibration.vibrate([0, 30, 50, 30]);
                    } else {
                        console.log('API error:', apiResponse.status);
                        handleRetake();
                    }
                } catch (error) {
                    console.log('Analysis error:', error);
                    handleRetake();
                }
            };

            reader.readAsDataURL(blob);
        } catch (error) {
            console.log('Photo read error:', error);
            handleRetake();
        }
    }, [capturedPhoto, backendUrl, resultOpacity, resultSlide, handleRetake]);

    // Continue to full capture flow
    const handleContinue = useCallback(() => {
        Vibration.vibrate(50);
        navigation.navigate('Capture');
    }, [navigation]);

    if (!permission) {
        return (
            <View style={styles.centerContainer}>
                <StatusBar barStyle="dark-content" />
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading camera...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.centerContainer}>
                <StatusBar barStyle="dark-content" />
                <Text style={styles.permissionIcon}>📷</Text>
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

            {/* Camera or Preview */}
            {scanState === 'camera' ? (
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
            ) : capturedPhoto ? (
                <Image source={{ uri: capturedPhoto }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : null}

            {/* Overlay gradients */}
            <View style={styles.topGradient} />
            <View style={styles.bottomGradient} />

            <SafeAreaView style={styles.overlay}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>RR</Text>
                    </View>
                    <Text style={styles.tagline}>
                        {scanState === 'camera' && 'Snap a photo to get started'}
                        {scanState === 'preview' && 'Review your photo'}
                        {scanState === 'analyzing' && 'Analyzing item...'}
                        {scanState === 'result' && 'Analysis complete'}
                    </Text>
                </View>

                {/* Center content */}
                <View style={styles.centerContent}>
                    {scanState === 'camera' && (
                        <View style={styles.reticle}>
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />
                            <Text style={styles.hintText}>Position item in frame</Text>
                        </View>
                    )}

                    {scanState === 'analyzing' && (
                        <View style={styles.analyzingContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={styles.analyzingText}>Identifying brand...</Text>
                        </View>
                    )}

                    {scanState === 'result' && detection && (
                        <Animated.View style={[styles.resultCard, { opacity: resultOpacity, transform: [{ translateY: resultSlide }] }]}>
                            <View style={styles.resultHeader}>
                                <View style={styles.brandBadge}>
                                    <Text style={styles.brandText}>{detection.brand}</Text>
                                </View>
                                <View style={styles.confidenceBadge}>
                                    <Text style={styles.confidenceText}>{Math.round(detection.confidence * 100)}% match</Text>
                                </View>
                            </View>

                            <View style={styles.priceHighlight}>
                                <Text style={styles.priceLabel}>Estimated Value</Text>
                                <Text style={styles.priceAmount}>{detection.priceRange}</Text>
                            </View>

                            <View style={styles.categoryRow}>
                                <Text style={styles.categoryLabel}>Category</Text>
                                <Text style={styles.categoryValue}>{detection.category}</Text>
                            </View>
                        </Animated.View>
                    )}
                </View>

                {/* Bottom actions */}
                <View style={styles.bottomActions}>
                    {scanState === 'camera' && (
                        <>
                            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                                <TouchableOpacity style={styles.captureButton} onPress={handleCapture} activeOpacity={0.8}>
                                    <View style={styles.captureOuter}>
                                        <View style={styles.captureInner} />
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                            <Text style={styles.captureLabel}>Tap to capture</Text>
                        </>
                    )}

                    {scanState === 'preview' && (
                        <View style={styles.previewActions}>
                            <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                                <Text style={styles.retakeText}>Retake</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.analyzeButton} onPress={handleAnalyze}>
                                <Text style={styles.analyzeText}>✨ Analyze</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {scanState === 'result' && (
                        <View style={styles.resultActions}>
                            <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                                <Text style={styles.retakeText}>Scan Another</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                                <Text style={styles.continueText}>Continue →</Text>
                            </TouchableOpacity>
                        </View>
                    )}
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
        marginTop: 16,
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 180,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 300,
        backgroundColor: 'rgba(0,0,0,0.7)',
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
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: theme.roundness.md,
    },
    logoText: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 3,
    },
    tagline: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 12,
        fontWeight: '600',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reticle: {
        width: 280,
        height: 350,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
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
    hintText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '500',
        position: 'absolute',
        bottom: -40,
    },
    analyzingContainer: {
        alignItems: 'center',
    },
    analyzingText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
    },
    resultCard: {
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderRadius: theme.roundness.lg,
        padding: theme.spacing.lg,
        marginHorizontal: 24,
        width: SCREEN_WIDTH - 48,
        ...theme.shadows.lg,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    brandBadge: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: theme.roundness.md,
    },
    brandText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 18,
    },
    confidenceBadge: {
        backgroundColor: theme.colors.successLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.roundness.sm,
    },
    confidenceText: {
        color: theme.colors.success,
        fontSize: 13,
        fontWeight: '600',
    },
    priceHighlight: {
        backgroundColor: theme.colors.primaryLight,
        borderRadius: theme.roundness.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    priceLabel: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    priceAmount: {
        color: theme.colors.primary,
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -1,
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryLabel: {
        color: theme.colors.textMuted,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    categoryValue: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    bottomActions: {
        alignItems: 'center',
        paddingBottom: 50,
    },
    captureButton: {
        marginBottom: 12,
    },
    captureOuter: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FFF',
    },
    captureInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFF',
    },
    captureLabel: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 15,
        fontWeight: '600',
    },
    previewActions: {
        flexDirection: 'row',
        gap: 16,
    },
    retakeButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 28,
        paddingVertical: 16,
        borderRadius: theme.roundness.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    retakeText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    analyzeButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 36,
        paddingVertical: 16,
        borderRadius: theme.roundness.md,
    },
    analyzeText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    resultActions: {
        flexDirection: 'row',
        gap: 16,
    },
    continueButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: theme.roundness.md,
    },
    continueText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
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
});
