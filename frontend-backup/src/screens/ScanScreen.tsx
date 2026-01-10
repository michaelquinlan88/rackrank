import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { theme } from '../theme';
import { useClothingDetection } from '../hooks/useClothingDetection';

/**
 * ScanScreen
 * 
 * First step in the flow. Real-time clothing detection (placeholder)
 * and initial item identification.
 */
export default function ScanScreen({ navigation }: any) {
    const { hasPermission, requestPermission } = useCameraPermission();
    const device = useCameraDevice('back');
    const { detection, isLoaded } = useClothingDetection();

    React.useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
    }, [hasPermission]);

    if (!hasPermission) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Camera permission is required.</Text>
            </View>
        );
    }

    if (!device) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>No camera device found.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
            />

            {/* Detection Overlay Placeholder */}
            <SafeAreaView style={styles.overlay}>
                <View style={styles.reticle}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                </View>

                <View style={styles.uiContainer}>
                    {detection && (
                        <View style={styles.resultCard}>
                            <Text style={styles.resultLabel}>{detection.label}</Text>
                            <Text style={styles.resultConfidence}>
                                {(detection.confidence * 100).toFixed(0)}% match
                            </Text>
                            <View style={styles.priceBadge}>
                                <Text style={styles.priceText}>Est. $45 - $65</Text>
                            </View>
                        </View>
                    )}

                    <Text style={styles.hint}>
                        {isLoaded ? 'Point at a clothing item' : 'Loading AI...'}
                    </Text>

                    <TouchableOpacity
                        style={styles.captureButton}
                        onPress={() => navigation.navigate('Capture')}
                    >
                        <View style={styles.captureInner} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    text: {
        color: theme.colors.text,
        fontSize: 18,
        textAlign: 'center',
        marginTop: 100,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reticle: {
        width: 250,
        height: 350,
        position: 'relative',
    },
    corner: {
        width: 20,
        height: 20,
        borderColor: theme.colors.primary,
        position: 'absolute',
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 8,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 8,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 8,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 8,
    },
    uiContainer: {
        position: 'absolute',
        bottom: 40,
        alignItems: 'center',
        width: '100%',
    },
    resultCard: {
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 20,
        width: '80%',
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    resultLabel: {
        color: theme.colors.text,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    resultConfidence: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    priceBadge: {
        backgroundColor: 'rgba(74, 222, 128, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderColor: theme.colors.success,
        borderWidth: 1,
    },
    priceText: {
        color: theme.colors.success,
        fontSize: 16,
        fontWeight: 'bold',
    },
    hint: {
        color: theme.colors.text,
        fontSize: 14,
        marginBottom: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: theme.colors.text,
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.text,
    },
});
