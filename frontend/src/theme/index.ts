/**
 * RackRank Design System
 * 
 * Brand Guidelines:
 * - Light mode with extreme whitespace
 * - Hermès Orange primary (#F37021)
 * - Inter typography
 * - Card-based UI system
 */

export const theme = {
    colors: {
        // Core palette from brand guide
        background: '#FFFFFF',      // Canvas White
        surface: '#F8F9FA',         // Light gray for cards
        surfaceAlt: '#F0F2F4',      // Slightly darker for depth

        // Primary - Hermès Orange (CTAs and brand)
        primary: '#F37021',         // Hermès Orange
        primaryDark: '#D85A10',     // Pressed state
        primaryLight: '#FFF5F0',    // Subtle background tint

        // Accent - also Hermès Orange variants
        accent: '#F37021',          // Hermès Orange
        accentLight: '#FFF5F0',     // Orange tint

        // Text hierarchy
        text: '#3E3E3E',            // Carbon - primary text
        textSecondary: '#7E8C9C',   // Slate - secondary text
        textMuted: '#D4D0DC',       // Vapor Gray - muted/placeholder
        textInverse: '#FFFFFF',     // On dark backgrounds

        // Status colors
        success: '#4ADE80',         // Green
        successLight: '#D4F0C2',    // Vapor Gray from brand
        warning: '#F59E0B',         // Amber
        error: '#EF4444',           // Red
        errorLight: '#FEE2E2',

        // Borders and dividers
        border: '#E5E7EB',          // Light gray border
        borderDark: '#D1D5DB',      // Darker border

        // Overlay
        overlay: 'rgba(43, 48, 48, 0.5)',
        overlayDark: 'rgba(43, 48, 48, 0.75)',
    },

    // Typography - Inter font weights
    typography: {
        headline: {
            fontWeight: '700' as const,
            fontSize: 28,
            lineHeight: 34,
        },
        title: {
            fontWeight: '700' as const,
            fontSize: 22,
            lineHeight: 28,
        },
        subtitle: {
            fontWeight: '600' as const,
            fontSize: 18,
            lineHeight: 24,
        },
        body: {
            fontWeight: '400' as const,
            fontSize: 16,
            lineHeight: 24,
        },
        label: {
            fontWeight: '600' as const,
            fontSize: 14,
            lineHeight: 20,
        },
        caption: {
            fontWeight: '400' as const,
            fontSize: 12,
            lineHeight: 16,
        },
    },

    // Spacing - generous whitespace
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },

    // Border radius
    roundness: {
        sm: 6,
        md: 12,
        lg: 20,
        xl: 28,
        full: 999,
    },

    // Shadows for cards
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 6,
        },
    },
} as const;

export type Theme = typeof theme;
