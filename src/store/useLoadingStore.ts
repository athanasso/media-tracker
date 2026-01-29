
import { create } from 'zustand';

interface LoadingStore {
  activeRequests: number;
  increment: () => void;
  decrement: () => void;
  isLoading: boolean;
}

export const useLoadingStore = create<LoadingStore>((set) => ({
  activeRequests: 0,
  isLoading: false,
  increment: () => set((state) => {
    const newCount = state.activeRequests + 1;
    return { 
        activeRequests: newCount,
        isLoading: newCount > 0
    };
  }),
  decrement: () => set((state) => {
    const newCount = Math.max(0, state.activeRequests - 1);
    return { 
        activeRequests: newCount,
        isLoading: newCount > 0
    };
  }),
}));
