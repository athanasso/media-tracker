/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Mode Theme - Aligned with src/theme/colors.ts
        background: '#0a0a0a',
        surface: '#1a1a1a',
        surfaceLight: '#2a2a2a',
        surfaceElevated: '#333333',
        
        // Primary (Netflix-style red accent)
        primary: {
          DEFAULT: '#E50914',
          dark: '#B30710',
          light: '#FF1A22',
        },
        
        // Text colors
        textPrimary: '#FFFFFF',
        textSecondary: '#A0A0A0',
        textMuted: '#666666',
        
        // Status colors
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        
        // Tracking status colors
        statusWatching: '#22C55E',
        statusCompleted: '#3B82F6',
        statusPlanToWatch: '#F59E0B',
        statusOnHold: '#8B5CF6',
        statusDropped: '#EF4444',
        
        // Border
        border: '#333333',
      },
      fontFamily: {
        sans: ['Inter', 'System'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'card': '0 4px 12px rgba(0, 0, 0, 0.4)',
        'elevated': '0 8px 24px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [],
};

