import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export type NotificationTiming = 
  | '1 day'
  | '3 days'
  | '1 week';

export interface NotificationPreference {
  id: number; // showId or movieId
  type: 'show' | 'movie';
  name: string; // show name or movie title
  airDate: string; // ISO date string
  timing: NotificationTiming;
  notificationId: string | null; // expo notification identifier
}

// ============================================
// STORE INTERFACE
// ============================================

interface NotificationState {
  // Data
  preferences: NotificationPreference[];

  // Actions
  addNotification: (preference: Omit<NotificationPreference, 'notificationId'>) => Promise<void>;
  removeNotification: (id: number, type: 'show' | 'movie') => Promise<void>;
  updateNotificationTiming: (id: number, type: 'show' | 'movie', timing: NotificationTiming) => Promise<void>;
  hasNotification: (id: number, type: 'show' | 'movie') => boolean;
  getNotificationPreference: (id: number, type: 'show' | 'movie') => NotificationPreference | undefined;
  clearAllNotifications: () => Promise<void>;
}

// ============================================
// NOTIFICATION CONFIGURATION
// ============================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

const getTimingMs = (timing: NotificationTiming): number => {
  switch (timing) {
    case '1 day':
      return 24 * 60 * 60 * 1000;
    case '3 days':
      return 3 * 24 * 60 * 60 * 1000;
    case '1 week':
      return 7 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000; // Default to 1 day
  }
};

const scheduleNotification = async (
  title: string,
  body: string,
  triggerDate: Date
): Promise<string> => {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return identifier;
};

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // Initial state
      preferences: [],

      // ==========================================
      // NOTIFICATION ACTIONS
      // ==========================================

      addNotification: async (preference) => {
        const state = get();
        
        // Check if notification already exists
        const existing = state.preferences.find(
          p => p.id === preference.id && p.type === preference.type
        );
        
        if (existing) {
          // Cancel existing notification
          if (existing.notificationId) {
            await Notifications.cancelScheduledNotificationAsync(existing.notificationId);
          }
        }

        // Calculate notification trigger date
        const airDate = new Date(preference.airDate);
        const timingMs = getTimingMs(preference.timing);
        const triggerDate = new Date(airDate.getTime() - timingMs);

        // Only schedule if trigger date is in the future
        if (triggerDate > new Date()) {
          const title = preference.type === 'show' 
            ? `📺 ${preference.name} is airing soon!`
            : `🎬 ${preference.name} is releasing soon!`;
          
          const body = preference.type === 'show'
            ? `Don't miss the new episode!`
            : `The movie is coming out soon!`;

          const notificationId = await scheduleNotification(title, body, triggerDate);

          const newPreference: NotificationPreference = {
            ...preference,
            notificationId,
          };

          set((state) => ({
            preferences: existing
              ? state.preferences.map(p =>
                  p.id === preference.id && p.type === preference.type
                    ? newPreference
                    : p
                )
              : [...state.preferences, newPreference],
          }));
        } else {
          // If trigger date is in the past, just store the preference without scheduling
          const newPreference: NotificationPreference = {
            ...preference,
            notificationId: null,
          };

          set((state) => ({
            preferences: existing
              ? state.preferences.map(p =>
                  p.id === preference.id && p.type === preference.type
                    ? newPreference
                    : p
                )
              : [...state.preferences, newPreference],
          }));
        }
      },

      removeNotification: async (id, type) => {
        const state = get();
        const preference = state.preferences.find(
          p => p.id === id && p.type === type
        );

        if (preference?.notificationId) {
          await Notifications.cancelScheduledNotificationAsync(preference.notificationId);
        }

        set((state) => ({
          preferences: state.preferences.filter(
            p => !(p.id === id && p.type === type)
          ),
        }));
      },

      updateNotificationTiming: async (id, type, timing) => {
        const state = get();
        const preference = state.preferences.find(
          p => p.id === id && p.type === type
        );

        if (!preference) return;

        // Cancel existing notification
        if (preference.notificationId) {
          await Notifications.cancelScheduledNotificationAsync(preference.notificationId);
        }

        // Reschedule with new timing
        await get().addNotification({
          id,
          type,
          name: preference.name,
          airDate: preference.airDate,
          timing,
        });
      },

      hasNotification: (id, type) => {
        return get().preferences.some(
          p => p.id === id && p.type === type
        );
      },

      getNotificationPreference: (id, type) => {
        return get().preferences.find(
          p => p.id === id && p.type === type
        );
      },

      clearAllNotifications: async () => {
        const state = get();
        
        // Cancel all scheduled notifications
        for (const pref of state.preferences) {
          if (pref.notificationId) {
            await Notifications.cancelScheduledNotificationAsync(pref.notificationId);
          }
        }

        // Clear all notifications
        await Notifications.cancelAllScheduledNotificationsAsync();

        set({ preferences: [] });
      },
    }),
    {
      name: 'Media-Tracker-notifications',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useNotificationStore;
