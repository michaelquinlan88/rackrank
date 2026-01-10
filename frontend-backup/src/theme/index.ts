/**
 * Design system tokens for RackRank.
 * High-performance, premium aesthetic.
 */
export const theme = {
    colors: {
        background: '#0F172A', // Slate 900
        surface: '#1E293B',    // Slate 800
        primary: '#38BDF8',    // Sky 400
        secondary: '#818CF8',  // Indigo 400
        accent: '#F472B6',     // Pink 400
        text: '#F8FAFC',       // Slate 50
        textMuted: '#94A3B8',  // Slate 400
        success: '#4ADE80',    // Green 400
        error: '#FB7185',      // Rose 400
        overlay: 'rgba(15, 23, 42, 0.75)',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    roundness: {
        sm: 4,
        md: 8,
        lg: 16,
        full: 999,
    },
} as const;

export type Theme = typeof theme;
