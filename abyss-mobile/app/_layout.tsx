import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { PixelifySans_400Regular } from '@expo-google-fonts/pixelify-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import { AegisProvider } from '@cavos/aegis';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Ramagothic: require('../assets/fonts/ramagothicbold.ttf'),
    PixelifySans_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontError) {
      console.error('Font loading error:', fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AegisProvider config={{
      network: 'SN_SEPOLIA',
      appName: 'Abyss Game',
      appId: 'app-pwoeZT2RJ5SbVrz9yMdzp8sRXYkLrL6Z',
      enableLogging: true,
    }}>
      <ErrorBoundary>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            animationDuration: 500,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="terms-of-service" />
          <Stack.Screen name="title" />
          <Stack.Screen name="mode-selection" />
          <Stack.Screen name="sessions" />
          <Stack.Screen name="game" />
          <Stack.Screen name="leaderboard" />
          <Stack.Screen name="settings" />
        </Stack>
      </ErrorBoundary>
    </AegisProvider>
  );
}
