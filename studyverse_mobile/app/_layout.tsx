import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      console.log('[RootLayoutNav] Auth is loading, waiting...');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inLoginScreen = segments[0] === 'login' || segments.includes('login');

    console.log('[RootLayoutNav] Navigation check:', {
      isAuthenticated,
      segments,
      inAuthGroup,
      inLoginScreen
    });

    if (!isAuthenticated && !inLoginScreen) {
      // Redirect to login if not authenticated and not already on login screen
      console.log('[RootLayoutNav] Redirecting to login');
      router.replace('/login');
    } else if (isAuthenticated && (inAuthGroup || inLoginScreen)) {
      // Redirect to home if authenticated and on auth/login screen
      console.log('[RootLayoutNav] Redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootLayoutNav />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
