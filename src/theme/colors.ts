/**
 * Centralized Color Theme
 * Single source of truth for all color definitions in the app
 */

// App Brand Colors
export const AppColors = {
  // Primary accent color (Netflix-style red)
  primary: '#E50914',
  primaryDark: '#B30710',
  primaryLight: '#FF1A22',

  // Background colors (dark theme)
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceLight: '#2a2a2a',
  surfaceElevated: '#333333',

  // Text colors
  text: '#ffffff',
  textPrimary: '#ffffff',
  textSecondary: '#a0a0a0',
  textMuted: '#666666',

  // Status colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  blue: '#3b82f6', // Alias for info - used in calendar

  // Tracking status colors
  statusWatching: '#22c55e',    // Green
  statusCompleted: '#3b82f6',   // Blue
  statusPlanToWatch: '#f59e0b', // Orange
  statusOnHold: '#8b5cf6',      // Purple
  statusDropped: '#ef4444',     // Red

  // UI elements
  border: '#333333',
  tabBar: 'rgba(10, 10, 10, 0.95)',
  inactive: '#6b6b6b',

  // Rating
  star: '#FFD700',
} as const;

// Type for color keys
export type AppColorKey = keyof typeof AppColors;

// Helper to get status color
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'watching':
      return AppColors.statusWatching;
    case 'completed':
      return AppColors.statusCompleted;
    case 'plan_to_watch':
      return AppColors.statusPlanToWatch;
    case 'on_hold':
      return AppColors.statusOnHold;
    case 'dropped':
      return AppColors.statusDropped;
    default:
      return AppColors.textSecondary;
  }
};

export default AppColors;
