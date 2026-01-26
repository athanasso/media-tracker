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
        // Dark Mode Theme
        background: '#121212',
        surface: '#1E1E1E',
        surfaceLight: '#2A2A2A',
        surfaceElevated: '#333333',
        
        // Primary (Yellow accent)
        primary: {
          DEFAULT: '#F5C518',
          dark: '#D4A817',
          light: '#FFD93D',
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
        
        // Border
        border: '#3A3A3A',
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
