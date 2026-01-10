import React, { useState, useRef, useCallback } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, SafeAreaView,
    Animated, Dimensions, Vibration, StatusBar, Image, ActivityIndicator, Alert
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

interface CapturedImage {
    uri: string;
    base64: string;
}

interface ScanScreenProps {
    navigation: any;
}

type ScanState = 'camera' | 'preview' | 'analyzing' | 'result' | 'error';

export default function ScanScreen({ navigation }: ScanScreenProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanState, setScanState] = useState<ScanState>('camera');
    const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
    const [detection, setDetection] = useState<DetectionResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
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
        if (!cameraRef.current) {
            console.log('Camera ref not available');
            return;
        }

        if (scanState !== 'camera') {
            console.log('Not in camera state:', scanState);
            return;
        }

        Vibration.vibrate(50);

        try {
            console.log('Taking picture...');
            const photo = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.7,
                exif: false,
            });

            console.log('Photo result:', photo ? 'Got photo' : 'No photo', 'URI:', photo?.uri?.substring(0, 50));

            if (photo && photo.uri) {
                // Store both URI and base64
                setCapturedImage({
                    uri: photo.uri,
                    base64: photo.base64 || '',
                });
                setScanState('preview');
                console.log('Transitioned to preview state');
            } else {
                console.log('No photo URI returned');
                setErrorMessage('Failed to capture photo. Please try again.');
                setScanState('error');
            }
        } catch (error: any) {
            console.log('Capture error:', error);
            setErrorMessage(error.message || 'Camera error. Please try again.');
            setScanState('error');
        }
    }, [scanState]);

    // Reset to camera
    const handleRetake = useCallback(() => {
        setCapturedImage(null);
        setDetection(null);
        setErrorMessage('');
        setScanState('camera');
        resultOpacity.setValue(0);
        resultSlide.setValue(30);
    }, [resultOpacity, resultSlide]);

    // Analyze photo
    const handleAnalyze = useCallback(async () => {
        if (!capturedImage?.base64) {
            setErrorMessage('No image data available. Please retake the photo.');
            setScanState('error');
            return;
        }

        setScanState('analyzing');
        Vibration.vibrate(30);

        try {
            console.log('Sending to backend:', backendUrl);
            const apiResponse = await fetch(`${backendUrl}/quick-scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_base64: capturedImage.base64 }),
            });

            console.log('API response status:', apiResponse.status);

            if (apiResponse.ok) {
                const data = await apiResponse.json();
                console.log('API response data:', data);

                const result: DetectionResult = {
                    brand: data.brand || 'Unknown',
                    confidence: data.confidence || 0.5,
                    priceRange: `$${data.price_min || 20}-$${data.price_max || 50}`,
                    category: data.category || 'Casual',
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
                const errorText = await apiResponse.text();
                console.log('API error:', errorText);
                setErrorMessage(`Analysis failed: ${apiResponse.status}`);
                setScanState('error');
            }
        } catch (error: any) {
            console.log('Analysis error:', error);
            setErrorMessage(`Connection error: ${error.message || 'Cannot reach server'}`);
            setScanState('error');
        }
    }, [capturedImage, backendUrl, resultOpacity, resultSlide]);

    // Continue to full capture flow
    const handleContinue = useCallback(() => {
        Vibration.vibrate(50);
        navigation.navigate('Capture');
    }, [navigation]);

    // Permission loading
    if (!permission) {
        return (
            <View style={styles.centerContainer}>
                <StatusBar barStyle="dark-content" />
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading camera...</Text>
            </View>
        );
    }

    // Permission denied
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

            {/* Camera View - only show when in camera state */}
            {scanState === 'camera' && (
                <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    facing="back"
                />
            )}

            {/* Preview Image - show when we have a captured image and not in camera state */}
            {capturedImage && scanState !== 'camera' && (
                <Image
                    source={{ uri: capturedImage.uri }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                />
            )}

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
                        {scanState === 'error' && 'Something went wrong'}
                    </Text>
                </View>

                {/* Center content */}
                <View style={styles.centerContent}>
                    {/* Camera reticle */}
                    {scanState === 'camera' && (
                        <View style={styles.reticle}>
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />
                            <Text style={styles.hintText}>Position item in frame</Text>
                        </View>
                    )}

                    {/* Preview confirmation */}
                    {scanState === 'preview' && (
                        <View style={styles.previewConfirm}>
                            <Text style={styles.previewTitle}>📸 Photo Captured!</Text>
                            <Text style={styles.previewText}>
                                Does the item look clear? Make sure the brand label is visible.
                            </Text>
                        </View>
                    )}

                    {/* Loading spinner */}
                    {scanState === 'analyzing' && (
                        <View style={styles.analyzingContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={styles.analyzingText}>Identifying brand...</Text>
                            <Text style={styles.analyzingSubtext}>Reading labels and estimating price</Text>
                        </View>
                    )}

                    {/* Error display */}
                    {scanState === 'error' && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorIcon}>⚠️</Text>
                            <Text style={styles.errorTitle}>Oops!</Text>
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    )}

                    {/* Result card */}
                    {scanState === 'result' && detection && (
                        <Animated.View style={[styles.resultCard, { opacity: resultOpacity, transform: [{ translateY: resultSlide }] }]}>
                            <View style={styles.resultHeader}>
                                <View style={styles.brandBadge}>
                                    <Text style={styles.brandText}>{detection.brand}</Text>
                                </View>
                                <View style={[
                                    styles.confidenceBadge,
                                    detection.confidence < 0.5 && styles.confidenceLow
                                ]}>
                                    <Text style={[
                                        styles.confidenceText,
                                        detection.confidence < 0.5 && styles.confidenceTextLow
                                    ]}>
                                        {Math.round(detection.confidence * 100)}% match
                                    </Text>
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
                    {/* Camera mode - capture button */}
                    {scanState === 'camera' && (
                        <>
                            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                                <TouchableOpacity
                                    style={styles.captureButton}
                                    onPress={handleCapture}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.captureOuter}>
                                        <View style={styles.captureInner} />
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                            <Text style={styles.captureLabel}>Tap to capture</Text>
                        </>
                    )}

                    {/* Preview mode - retake or analyze */}
                    {scanState === 'preview' && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.secondaryButton} onPress={handleRetake}>
                                <Text style={styles.secondaryButtonText}>↩ Retake</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryButton} onPress={handleAnalyze}>
                                <Text style={styles.primaryButtonText}>✨ Analyze</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Error mode - try again */}
                    {scanState === 'error' && (
                        <TouchableOpacity style={styles.primaryButton} onPress={handleRetake}>
                            <Text style={styles.primaryButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    )}

                    {/* Result mode - scan another or continue */}
                    {scanState === 'result' && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.secondaryButton} onPress={handleRetake}>
                                <Text style={styles.secondaryButtonText}>Scan Another</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
                                <Text style={styles.primaryButtonText}>Continue →</Text>
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
        height: 320,
        backgroundColor: 'rgba(0,0,0,0.75)',
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
        paddingHorizontal: 24,
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
    previewConfirm: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: theme.roundness.lg,
        padding: theme.spacing.lg,
        alignItems: 'center',
        maxWidth: 300,
    },
    previewTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 8,
    },
    previewText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    analyzingContainer: {
        alignItems: 'center',
    },
    analyzingText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 20,
    },
    analyzingSubtext: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        marginTop: 8,
    },
    errorContainer: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: theme.roundness.lg,
        padding: theme.spacing.lg,
        alignItems: 'center',
        maxWidth: 300,
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    resultCard: {
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderRadius: theme.roundness.lg,
        padding: theme.spacing.lg,
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
        flexShrink: 1,
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
    confidenceLow: {
        backgroundColor: '#FFF3E0',
    },
    confidenceText: {
        color: theme.colors.success,
        fontSize: 13,
        fontWeight: '600',
    },
    confidenceTextLow: {
        color: '#E65100',
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
        paddingHorizontal: 24,
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
    actionRow: {
        flexDirection: 'row',
        gap: 16,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: theme.roundness.md,
        minWidth: 140,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: theme.roundness.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        minWidth: 120,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#FFF',
        fontSize: 16,
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
});
