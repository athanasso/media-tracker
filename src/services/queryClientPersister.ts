import { QueryClient, hydrate, dehydrate } from '@tanstack/react-query';
import { storage } from '../store/storage';

const QUERY_CACHE_KEY = 'REACT_QUERY_OFFLINE_CACHE';

/**
 * Saves the current query cache to MMKV
 */
export const saveQueryCache = (client: QueryClient) => {
  const state = dehydrate(client);
  storage.set(QUERY_CACHE_KEY, JSON.stringify(state));
};

/**
 * Restores the query cache from MMKV
 */
export const restoreQueryCache = (client: QueryClient) => {
  try {
    const json = storage.getString(QUERY_CACHE_KEY);
    if (json) {
      const state = JSON.parse(json);
      hydrate(client, state);
      return true;
    }
  } catch (error) {
    console.error('Error restoring query cache:', error);
  }
  return false;
};

/**
 * Sets up auto-save for the query client
 */
export const setupQueryClientPersistence = (client: QueryClient) => {
    // Restore immediately
    restoreQueryCache(client);

    // Subscribe to cache changes
    // We throttle this to avoid excessive writes
    let timeout: ReturnType<typeof setTimeout>;
    
    // Subscribe to the query cache to detect changes
    const unsubscribe = client.getQueryCache().subscribe(() => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            saveQueryCache(client);
        }, 1000); // Debounce 1s
    });

    return unsubscribe;
};
