/**
 * TMDB API Client Configuration
 * Axios instance with interceptors and error handling
 */

import { useSettingsStore } from '@/src/store/useSettingsStore';
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { TMDBErrorResponse } from '../../types';
import { getLocales } from 'expo-localization';
import { useLoadingStore } from '@/src/store/useLoadingStore';

// ============================================
// CONSTANTS
// ============================================

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Image size presets
export const ImageSizes = {
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    original: 'original',
  },
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original',
  },
  profile: {
    small: 'w45',
    medium: 'w185',
    large: 'h632',
    original: 'original',
  },
  still: {
    small: 'w92',
    medium: 'w185',
    large: 'w300',
    original: 'original',
  },
} as const;

// ============================================
// API CLIENT CREATION
// ============================================

/**
 * Create configured Axios instance for TMDB API
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: TMDB_BASE_URL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Request interceptor - Add API key and authorization
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Increment active requests
      useLoadingStore.getState().increment();

      // Get API key from environment
      const apiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;
      
      if (!apiKey) {
        console.warn('TMDB API key not found in environment variables');
      }

      const language = useSettingsStore.getState().language;

      // Determine region from device settings using expo-localization
      // Fallback to 'US' if detection fails
      const region = getLocales()[0]?.regionCode || 'US'; 

      // Add API key as query parameter (v3 auth)
      config.params = {
        ...config.params,
        api_key: apiKey,
        language: language,
        region: region,
      };

      // Optional: Add Bearer token for v4 auth
      // const accessToken = process.env.EXPO_PUBLIC_TMDB_ACCESS_TOKEN;
      // if (accessToken) {
      //   config.headers.Authorization = `Bearer ${accessToken}`;
      // }

      // Log requests in development
      if (__DEV__) {
        console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      }

      return config;
    },
    (error: AxiosError) => {
      useLoadingStore.getState().decrement();
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - Handle errors globally
  client.interceptors.response.use(
    (response) => {
      useLoadingStore.getState().decrement();

      // Log successful responses in development
      if (__DEV__) {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
      }
      return response;
    },
    (error: AxiosError<TMDBErrorResponse>) => {
      useLoadingStore.getState().decrement();

      // Handle specific error cases
      if (error.response) {
        const { status, data } = error.response;

        switch (status) {
          case 401:
            console.error('🔑 Authentication error - Invalid API key');
            break;
          case 404:
            console.error('🔍 Resource not found');
            break;
          case 429:
            console.error('⏳ Rate limit exceeded - Too many requests');
            break;
          case 500:
          case 502:
          case 503:
            console.error('🔥 TMDB server error');
            break;
          default:
            console.error(`❌ API Error: ${status} - ${data?.status_message || 'Unknown error'}`);
        }
      } else if (error.request) {
        console.error('📡 Network error - No response received');
      } else {
        console.error('⚠️ Request setup error:', error.message);
      }

      return Promise.reject(error);
    }
  );

  return client;
};

// ============================================
// EXPORTS
// ============================================

/**
 * Configured Axios instance for TMDB API calls
 */
export const apiClient = createApiClient();

/**
 * Generate full image URL from TMDB path
 * @param path - Image path from TMDB (e.g., "/abc123.jpg")
 * @param size - Size preset (e.g., "w500", "original")
 * @returns Full image URL or null if path is null
 */
export const getImageUrl = (
  path: string | null,
  size: string = ImageSizes.poster.medium
): string | null => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
};

/**
 * Get poster image URL with fallback
 */
export const getPosterUrl = (
  path: string | null,
  size: keyof typeof ImageSizes.poster = 'medium'
): string | null => {
  return getImageUrl(path, ImageSizes.poster[size]);
};

/**
 * Get backdrop image URL with fallback
 */
export const getBackdropUrl = (
  path: string | null,
  size: keyof typeof ImageSizes.backdrop = 'large'
): string | null => {
  return getImageUrl(path, ImageSizes.backdrop[size]);
};

/**
 * Get profile image URL with fallback
 */
export const getProfileUrl = (
  path: string | null,
  size: keyof typeof ImageSizes.profile = 'medium'
): string | null => {
  return getImageUrl(path, ImageSizes.profile[size]);
};

/**
 * Get still image URL (episode thumbnails)
 */
export const getStillUrl = (
  path: string | null,
  size: keyof typeof ImageSizes.still = 'medium'
): string | null => {
  return getImageUrl(path, ImageSizes.still[size]);
};

export default apiClient;
