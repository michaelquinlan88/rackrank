import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { theme } from '../theme';

interface CaptureStep {
    id: string;
    label: string;
    description: string;
    required: boolean;
    image?: string;
}

const INITIAL_STEPS: CaptureStep[] = [
    { id: 'front', label: 'Front View', description: 'Capture the full front of the item.', required: true },
    { id: 'back', label: 'Back View', description: 'Flip it over and show the back.', required: true },
    { id: 'label', label: 'Brand Label', description: 'Zoom in on the brand & size tag.', required: true },
    { id: 'material', label: 'Material Tag', description: 'Show the fabric/care instructions.', required: false },
    { id: 'defects', label: 'Defects', description: 'Any stains, holes, or wear?', required: false },
    { id: 'detail', label: 'Detail Shot', description: 'Logo, buttons, or unique features.', required: false },
];

/**
 * CaptureScreen
 * 
 * Guided workflow to ensure high-quality listings.
 * Each step prompts the user for a specific photo.
 */
export default function CaptureScreen({ navigation }: any) {
    const [steps, setSteps] = useState<CaptureStep[]>(INITIAL_STEPS);
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [isCapturing, setIsCapturing] = useState(false);
    const camera = useRef<Camera>(null);
    const device = useCameraDevice('back');

    const activeStep = steps[activeStepIndex];
    const progress = ((activeStepIndex) / steps.length) * 100;
    const isComplete = steps.filter((s: CaptureStep) => s.required).every((s: CaptureStep) => s.image);

    const handleCapture = async () => {
        if (!camera.current) return;

        try {
            setIsCapturing(true);
            const photo = await camera.current.takePhoto({
                flash: 'auto',
            });

            const newSteps = [...steps];
            newSteps[activeStepIndex] = {
                ...activeStep,
                image: 'file://' + photo.path,
            };
            setSteps(newSteps);

            if (activeStepIndex < steps.length - 1) {
                setActiveStepIndex(activeStepIndex + 1);
            }
        } catch (err) {
            Alert.alert('Capture Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsCapturing(false);
        }
    };

    const handleFinish = () => {
        const images = steps.filter((s: CaptureStep) => s.image).map((s: CaptureStep) => s.image);
        navigation.navigate('Review', { images });
    };

    if (!device) return <View style={styles.container}><Text style={styles.text}>No camera found</Text></View>;

    return (
        <SafeAreaView style={styles.container}>
            {/* Progress Header */}
            <View style={styles.header}>
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.stepCounter}>STEP {activeStepIndex + 1} OF {steps.length}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Active Prompts */}
                <View style={styles.promptCard}>
                    <Text style={styles.stepLabel}>{activeStep.label}</Text>
                    <Text style={styles.stepDesc}>{activeStep.description}</Text>

                    <View style={styles.cameraPlaceholder}>
                        {activeStep.image ? (
                            <Image source={{ uri: activeStep.image }} style={styles.previewImage} />
                        ) : (
                            <Camera
                                ref={camera}
                                style={StyleSheet.absoluteFill}
                                device={device}
                                isActive={true}
                                photo={true}
                            />
                        )}
                        {isCapturing && (
                            <View style={styles.captureOverlay}>
                                <ActivityIndicator color="#fff" />
                            </View>
                        )}
                    </View>
                </View>

                {/* Thumbnail Strip */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailStrip}>
                    {steps.map((step, index) => (
                        <TouchableOpacity
                            key={step.id}
                            onPress={() => setActiveStepIndex(index)}
                            style={[
                                styles.thumbnail,
                                activeStepIndex === index && styles.activeThumbnail,
                                step.image && styles.capturedThumbnail
                            ]}
                        >
                            {step.image ? (
                                <Image source={{ uri: step.image }} style={styles.thumbImage} />
                            ) : (
                                <Text style={styles.thumbIcon}>{step.required ? '*' : ''}</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </ScrollView>

            {/* Action Bar */}
            <View style={styles.actionBar}>
                <TouchableOpacity
                    style={styles.captureButton}
                    onPress={handleCapture}
                >
                    <Text style={styles.captureButtonText}>Take Photo</Text>
                </TouchableOpacity>

                {activeStepIndex === steps.length - 1 && (
                    <TouchableOpacity
                        style={[styles.finishButton, !isComplete && styles.disabledButton]}
                        disabled={!isComplete}
                        onPress={handleFinish}
                    >
                        <Text style={styles.finishText}>Analyze Listing</Text>
                    </TouchableOpacity>
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
    header: {
        padding: 20,
        backgroundColor: theme.colors.surface,
    },
    progressContainer: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 2,
    },
    stepCounter: {
        color: theme.colors.textMuted,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    scrollContent: {
        padding: 20,
    },
    promptCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    stepLabel: {
        color: theme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    stepDesc: {
        color: theme.colors.textMuted,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    cameraPlaceholder: {
        width: '100%',
        height: 350,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderRadius: 16,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(255,255,255,0.2)',
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
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    thumbnailStrip: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    thumbnail: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    activeThumbnail: {
        borderColor: theme.colors.primary,
    },
    capturedThumbnail: {
        backgroundColor: theme.colors.surface,
    },
    thumbImage: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    thumbIcon: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    actionBar: {
        padding: 20,
        flexDirection: 'row',
        gap: 12,
    },
    captureButton: {
        flex: 1,
        backgroundColor: theme.colors.text,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    captureButtonText: {
        color: theme.colors.background,
        fontSize: 16,
        fontWeight: 'bold',
    },
    finishButton: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.5,
    },
    finishText: {
        color: theme.colors.background,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
