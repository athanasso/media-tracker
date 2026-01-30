/**
 * Root Layout
 * Configures providers and global navigation structure
 */

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { handleOAuthCallback } from '@/src/services/googleAuth';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - data is fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Cache time - data stays in cache for 24 hours (processed garbage collection)
      gcTime: 1000 * 60 * 60 * 24,
      // Retry failed requests 2 times
      retry: 2,
      // Refetch on window focus
      refetchOnWindowFocus: false,
    },
  },
});

import { setupQueryClientPersistence } from '@/src/services/queryClientPersister';

// Initialize persistence
setupQueryClientPersistence(queryClient);

export const unstable_settings = {
  anchor: '(tabs)',
};


export default function RootLayout() {
  // Hide splash screen after layout is ready
  useEffect(() => {
    // Hide splash screen after layout is ready
    SplashScreen.hideAsync();

    // Deep link handler for OAuth
    const handleDeepLink = async (event: { url: string }) => {
      // Check for OAuth parameters in the URL
      if (event.url && (event.url.includes('access_token') || event.url.includes('code') || event.url.includes('refresh_token'))) {
        console.log('Received deep link:', event.url);
        try {
          await handleOAuthCallback(event.url);
          // Redirect to Settings after successful auth
          router.replace('/settings');
        } catch (error) {
          console.error('Deep link error:', error);
        }
      }
    };

    // Listen for incoming links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check initial URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={DarkTheme}>
            {/* Dark mode status bar */}
            <StatusBar style="light" />
            
            {/* Navigation Stack */}
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0a0a0a' },
                animation: 'slide_from_right',
              }}
            >
              {/* Tab Navigator Group */}
              <Stack.Screen 
                name="(tabs)" 
                options={{ headerShown: false }} 
              />
              
              {/* Show Details Screen */}
              <Stack.Screen
                name="show/[id]"
                options={{
                  presentation: 'card',
                  headerShown: true,
                  headerStyle: { backgroundColor: '#0a0a0a' },
                  headerTintColor: '#ffffff',
                  headerTitleStyle: { fontWeight: '600' },
                  headerBackTitle: 'Back',
                }}
              />
              
              {/* Movie Details Screen */}
              <Stack.Screen
                name="movie/[id]"
                options={{
                  presentation: 'card',
                  headerShown: true,
                  headerStyle: { backgroundColor: '#0a0a0a' },
                  headerTintColor: '#ffffff',
                  headerTitleStyle: { fontWeight: '600' },
                  headerBackTitle: 'Back',
                }}
              />
              
              {/* Settings Screen */}
              <Stack.Screen
                name="settings"
                options={{
                  presentation: 'card',
                  headerShown: true,
                  headerStyle: { backgroundColor: '#121212' },
                  headerTintColor: '#ffffff',
                  headerTitleStyle: { fontWeight: '600' },
                  headerBackTitle: 'Back',
                }}
              />
            </Stack>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
