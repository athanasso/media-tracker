import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type DateFormat = 'eu' | 'us' | 'custom';
export type Language = 'en' | 'el';

interface SettingsState {
  dateFormat: DateFormat;
  customDateFormat: string; // Used only if dateFormat is 'custom'
  language: Language;
  showDroppedTab: boolean;
  
  setDateFormat: (format: DateFormat) => void;
  setCustomDateFormat: (format: string) => void;
  setLanguage: (lang: Language) => void;
  toggleShowDroppedTab: () => void;
  getFormattedDate: (dateString: string | Date | null | undefined) => string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      dateFormat: 'eu', // Default to European DD/MM/YYYY
      customDateFormat: 'DD/MM/YYYY',
      language: 'en',
      showDroppedTab: true,

      setDateFormat: (format) => set({ dateFormat: format }),
      setCustomDateFormat: (format) => set({ customDateFormat: format }),
      setLanguage: (lang) => set({ language: lang }),
      toggleShowDroppedTab: () => set((state) => ({ showDroppedTab: !state.showDroppedTab })),

      // Helper to format date based on current settings
      getFormattedDate: (dateInput) => {
        if (!dateInput) return 'TBA';
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return 'TBA';

        const { dateFormat, customDateFormat } = get();

        // Standard options
        if (dateFormat === 'eu') {
          return date.toLocaleDateString('en-GB'); // 27/01/2026
        } else if (dateFormat === 'us') {
          return date.toLocaleDateString('en-US'); // 1/27/2026
        }
        
        // Custom formatting
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        
        const pad = (n: number) => n.toString().padStart(2, '0');
        
        let result = customDateFormat;
        
        // Using regex for global replacement
        result = result.replace(/YYYY/g, year.toString());
        result = result.replace(/YY/g, year.toString().slice(-2));
        result = result.replace(/MM/g, pad(month));
        result = result.replace(/M/g, month.toString());
        result = result.replace(/DD/g, pad(day));
        result = result.replace(/D/g, day.toString());
        
        return result;
      },
    }),
    {
      name: 'Media-Tracker-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useSettingsStore;
