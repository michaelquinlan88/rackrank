import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, Image,
    ScrollView, SafeAreaView, Animated, Vibration, StatusBar
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { theme } from '../theme';
import { savePhoto, saveAllToMediaLibrary } from '../services/photoStorage';

interface CaptureStep {
    id: string;
    label: string;
    description: string;
    required: boolean;
    image?: string;
}

// 4 photos max as per acceptance criteria
const INITIAL_STEPS: readonly CaptureStep[] = Object.freeze([
    { id: 'front', label: 'Front View', description: 'Capture the full front of the item.', required: true },
    { id: 'back', label: 'Back View', description: 'Flip it over and show the back.', required: true },
    { id: 'label', label: 'Brand Label', description: 'Zoom in on the brand & size tag.', required: true },
    { id: 'detail', label: 'Detail Shot', description: 'Optional: Logo, buttons, defects, or unique features.', required: false },
]);

interface CaptureScreenProps {
    navigation: any;
}

export default function CaptureScreen({ navigation }: CaptureScreenProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [steps, setSteps] = useState<CaptureStep[]>([...INITIAL_STEPS]);
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [isCapturing, setIsCapturing] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    const flashAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    const activeStep = steps[activeStepIndex];
    const capturedCount = useMemo(() => steps.filter(s => s.image).length, [steps]);
    const progress = (capturedCount / steps.length) * 100;
    const requiredComplete = useMemo(() => steps.filter(s => s.required).every(s => s.image), [steps]);
    const requiredRemaining = useMemo(() => steps.filter(s => s.required && !s.image).length, [steps]);

    useEffect(() => {
        Animated.timing(progressAnim, { toValue: progress, duration: 300, useNativeDriver: false }).start();
    }, [progress, progressAnim]);

    const handleCapture = useCallback(async () => {
        if (!cameraRef.current || isCapturing) return;
        setIsCapturing(true);
        Vibration.vibrate(50);

        Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
            Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();

        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
            if (photo?.uri) {
                setSteps(prev => {
                    const updated = [...prev];
                    updated[activeStepIndex] = { ...updated[activeStepIndex], image: photo.uri };
                    return updated;
                });
                setShowCamera(false);
                // Check if all required photos are now complete
                const updatedSteps = [...steps];
                updatedSteps[activeStepIndex] = { ...updatedSteps[activeStepIndex], image: photo.uri };
                const allRequiredDone = updatedSteps.filter(s => s.required).every(s => s.image);

                if (allRequiredDone && activeStepIndex === steps.length - 1) {
                    // Auto-advance to Review when last photo captured and all required done
                    setTimeout(() => handleFinish(), 500);
                } else if (activeStepIndex < steps.length - 1) {
                    setTimeout(() => setActiveStepIndex(prev => prev + 1), 300);
                }
            }
        } catch (error) {
            console.error('Failed to capture photo:', error);
        } finally {
            setIsCapturing(false);
        }
    }, [isCapturing, activeStepIndex, steps.length, flashAnim]);

    const handleSimulatedCapture = useCallback(() => {
        Vibration.vibrate(50);
        setSteps(prev => {
            const updated = [...prev];
            updated[activeStepIndex] = {
                ...updated[activeStepIndex],
                image: `https://via.placeholder.com/400x500.png?text=${encodeURIComponent(activeStep.label)}`,
            };
            return updated;
        });
        if (activeStepIndex < steps.length - 1) {
            setTimeout(() => setActiveStepIndex(prev => prev + 1), 300);
        }
    }, [activeStepIndex, activeStep.label, steps.length]);

    // Skip button for optional photos - advances to next or navigates to Review
    const handleSkip = useCallback(() => {
        if (activeStepIndex < steps.length - 1) {
            setActiveStepIndex(prev => prev + 1);
        } else {
            // Last step - go to Review if required photos are done
            const allRequiredDone = steps.filter(s => s.required).every(s => s.image);
            if (allRequiredDone) {
                const capturedImages = steps.filter(s => s.image).map(s => s.image as string);
                navigation.navigate('Review', { images: capturedImages, base64Images: [] });
            }
        }
    }, [activeStepIndex, steps, navigation]);

    const handleFinish = useCallback(async () => {
        const capturedImages = steps.filter(s => s.image).map(s => s.image as string);
        const base64Images: string[] = [];
        const savedPhotoUris: string[] = [];

        // Generate a listing ID for this capture session
        const listingId = `listing_${Date.now()}`;

        for (const uri of capturedImages) {
            if (uri.startsWith('file://')) {
                try {
                    // Save photo to persistent storage
                    const result = await savePhoto(uri, listingId);
                    if (result.success && result.photo) {
                        savedPhotoUris.push(result.photo.uri);
                    }

                    // Convert to base64 for API
                    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                    base64Images.push(base64);
                } catch (e) {
                    console.warn('Failed to process image:', e);
                }
            }
        }

        // Save photos to camera roll for FB Marketplace
        if (savedPhotoUris.length > 0) {
            await saveAllToMediaLibrary(savedPhotoUris);
        }

        navigation.navigate('Review', {
            images: savedPhotoUris.length > 0 ? savedPhotoUris : capturedImages,
            base64Images,
            listingId
        });
    }, [steps, navigation]);

    const openCamera = useCallback(() => {
        if (permission?.granted) setShowCamera(true);
        else handleSimulatedCapture();
    }, [permission?.granted, handleSimulatedCapture]);

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
                <Text style={styles.permissionTitle}>Camera Access Needed</Text>
                <Text style={styles.permissionText}>
                    RackRank needs camera access to capture photos of your clothing items.
                </Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Enable Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.skipButton} onPress={() => handleSimulatedCapture()}>
                    <Text style={styles.skipButtonText}>Skip (Use Demo Mode)</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (showCamera) {
        return (
            <View style={styles.cameraContainer}>
                <StatusBar barStyle="light-content" />
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
                <Animated.View style={[styles.flashOverlay, { opacity: flashAnim }]} />

                <SafeAreaView style={styles.cameraUI}>
                    <View style={styles.cameraHeader}>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setShowCamera(false)}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                        <View style={styles.stepBadge}>
                            <Text style={styles.stepBadgeText}>{activeStep.label}</Text>
                        </View>
                        <View style={{ width: 44 }} />
                    </View>

                    <View style={styles.cameraGuide}>
                        <View style={styles.guideFrame}>
                            <View style={[styles.guideCorner, styles.topLeft]} />
                            <View style={[styles.guideCorner, styles.topRight]} />
                            <View style={[styles.guideCorner, styles.bottomLeft]} />
                            <View style={[styles.guideCorner, styles.bottomRight]} />
                        </View>
                        <Text style={styles.guideText}>{activeStep.description}</Text>
                    </View>

                    <View style={styles.cameraControls}>
                        <TouchableOpacity
                            style={[styles.shutterButton, isCapturing && styles.shutterCapturing]}
                            onPress={handleCapture}
                            disabled={isCapturing}
                        >
                            <View style={styles.shutterInner} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Progress Header */}
            <View style={styles.header}>
                <View style={styles.progressContainer}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            { width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
                        ]}
                    />
                </View>
                <Text style={styles.stepCounter}>
                    STEP {activeStepIndex + 1} OF {steps.length} • {capturedCount} CAPTURED
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Prompt Card */}
                <View style={styles.promptCard}>
                    <View style={styles.stepHeader}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>{activeStepIndex + 1}</Text>
                        </View>
                        <View style={styles.stepInfo}>
                            <Text style={styles.stepLabel}>{activeStep.label}</Text>
                            <Text style={styles.stepDesc}>{activeStep.description}</Text>
                        </View>
                        {activeStep.required && (
                            <View style={styles.requiredBadge}>
                                <Text style={styles.requiredText}>Required</Text>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity style={styles.cameraPlaceholder} onPress={openCamera} activeOpacity={0.8}>
                        {activeStep.image ? (
                            <Image source={{ uri: activeStep.image }} style={styles.previewImage} />
                        ) : (
                            <View style={styles.emptyCamera}>
                                <Text style={styles.cameraIcon}>+</Text>
                                <Text style={styles.cameraText}>Tap to capture</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {activeStep.image && (
                        <TouchableOpacity style={styles.retakeButton} onPress={() => setShowCamera(true)}>
                            <Text style={styles.retakeText}>Retake Photo</Text>
                        </TouchableOpacity>
                    )}

                    {/* Skip button for optional photos */}
                    {!activeStep.required && !activeStep.image && (
                        <TouchableOpacity style={styles.skipOptionalButton} onPress={handleSkip}>
                            <Text style={styles.skipOptionalText}>Skip Optional Photo →</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Thumbnails */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailStrip}>
                    {steps.map((step, index) => (
                        <TouchableOpacity
                            key={step.id}
                            onPress={() => setActiveStepIndex(index)}
                            style={[
                                styles.thumbnail,
                                activeStepIndex === index && styles.activeThumbnail,
                                step.image && styles.capturedThumbnail,
                            ]}
                        >
                            {step.image ? (
                                <Image source={{ uri: step.image }} style={styles.thumbImage} />
                            ) : (
                                <View style={styles.thumbEmpty}>
                                    <Text style={styles.thumbNumber}>{index + 1}</Text>
                                    {step.required && <Text style={styles.thumbRequired}>*</Text>}
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </ScrollView>

            {/* Action Bar */}
            <View style={styles.actionBar}>
                {requiredComplete ? (
                    <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
                        <Text style={styles.finishEmoji}>✨</Text>
                        <Text style={styles.finishText}>Analyze Listing</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.incompleteBar}>
                        <Text style={styles.incompleteText}>
                            {requiredRemaining} required photo{requiredRemaining !== 1 ? 's' : ''} remaining
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
    header: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    progressContainer: {
        height: 6,
        backgroundColor: theme.colors.border,
        borderRadius: 3,
        marginBottom: 12,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 3,
    },
    stepCounter: {
        color: theme.colors.textMuted,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingTop: 0,
    },
    promptCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.roundness.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        ...theme.shadows.md,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        gap: 12,
    },
    stepNumber: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumberText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
    stepInfo: {
        flex: 1,
    },
    stepLabel: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: '700',
    },
    stepDesc: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        marginTop: 2,
    },
    requiredBadge: {
        backgroundColor: theme.colors.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: theme.roundness.sm,
    },
    requiredText: {
        color: theme.colors.primary,
        fontSize: 11,
        fontWeight: '700',
    },
    cameraPlaceholder: {
        width: '100%',
        height: 280,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.roundness.md,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: theme.colors.border,
    },
    emptyCamera: {
        alignItems: 'center',
    },
    cameraIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    cameraText: {
        color: theme.colors.textMuted,
        fontSize: 14,
        fontWeight: '500',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    retakeButton: {
        alignSelf: 'center',
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    retakeText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    skipOptionalButton: {
        alignSelf: 'center',
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.roundness.md,
    },
    skipOptionalText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    thumbnailStrip: {
        flexDirection: 'row',
        marginBottom: theme.spacing.lg,
    },
    thumbnail: {
        width: 60,
        height: 60,
        borderRadius: theme.roundness.md,
        backgroundColor: theme.colors.surface,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        ...theme.shadows.sm,
    },
    activeThumbnail: {
        borderColor: theme.colors.primary,
    },
    capturedThumbnail: {
        borderColor: theme.colors.success,
    },
    thumbImage: {
        width: '100%',
        height: '100%',
    },
    thumbEmpty: {
        alignItems: 'center',
    },
    thumbNumber: {
        color: theme.colors.textMuted,
        fontSize: 14,
        fontWeight: '600',
    },
    thumbRequired: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '700',
    },
    actionBar: {
        padding: theme.spacing.lg,
        paddingBottom: 36,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    finishButton: {
        backgroundColor: theme.colors.primary,
        padding: 18,
        borderRadius: theme.roundness.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...theme.shadows.md,
    },
    finishEmoji: {
        fontSize: 18,
    },
    finishText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
    },
    incompleteBar: {
        backgroundColor: theme.colors.surfaceAlt,
        padding: 18,
        borderRadius: theme.roundness.md,
        alignItems: 'center',
    },
    incompleteText: {
        color: theme.colors.textMuted,
        fontSize: 14,
        fontWeight: '500',
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
    skipButton: {
        marginTop: 16,
        paddingVertical: 12,
    },
    skipButtonText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    flashOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#fff',
    },
    cameraUI: {
        flex: 1,
        justifyContent: 'space-between',
    },
    cameraHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    stepBadge: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    stepBadgeText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    cameraGuide: {
        alignItems: 'center',
    },
    guideFrame: {
        width: 280,
        height: 350,
        position: 'relative',
    },
    guideCorner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: theme.colors.primary,
        borderWidth: 3,
    },
    topLeft: {
        top: 0, left: 0,
        borderRightWidth: 0, borderBottomWidth: 0,
        borderTopLeftRadius: 12,
    },
    topRight: {
        top: 0, right: 0,
        borderLeftWidth: 0, borderBottomWidth: 0,
        borderTopRightRadius: 12,
    },
    bottomLeft: {
        bottom: 0, left: 0,
        borderRightWidth: 0, borderTopWidth: 0,
        borderBottomLeftRadius: 12,
    },
    bottomRight: {
        bottom: 0, right: 0,
        borderLeftWidth: 0, borderTopWidth: 0,
        borderBottomRightRadius: 12,
    },
    guideText: {
        color: '#fff',
        fontSize: 14,
        marginTop: 16,
        fontWeight: '500',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    cameraControls: {
        alignItems: 'center',
        paddingBottom: 40,
    },
    shutterButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: theme.colors.primary,
    },
    shutterCapturing: {
        opacity: 0.5,
    },
    shutterInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.colors.primary,
    },
});
