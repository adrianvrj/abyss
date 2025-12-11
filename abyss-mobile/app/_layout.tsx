import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { PixelifySans_400Regular } from '@expo-google-fonts/pixelify-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import ErrorBoundary from '../components/ErrorBoundary';
import { AegisProvider } from '@cavos/aegis';
import { aegisConfig } from '@/utils/aegisConfig';
import { GameSessionProvider } from '../contexts/GameSessionContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Ramagothic: require('../assets/fonts/ramagothicbold.ttf'),
    PressStart2P: require('../assets/fonts/PressStart2P.ttf'),
    PixelifySans_400Regular,
  });
  const [backgroundsLoaded, setBackgroundsLoaded] = useState(false);

  // Preload background images
  useEffect(() => {
    async function loadBackgrounds() {
      try {
        await Promise.all([
          Asset.fromModule(require('../assets/images/bg-welcome.png')).downloadAsync(),
          Asset.fromModule(require('../assets/images/bg-in-game.png')).downloadAsync(),
        ]);
        setBackgroundsLoaded(true);
      } catch (error) {
        console.error('Background loading error:', error);
        setBackgroundsLoaded(true); // Continue anyway
      }
    }
    loadBackgrounds();
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && backgroundsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, backgroundsLoaded]);

  useEffect(() => {
    if (fontError) {
      console.error('Font loading error:', fontError);
    }
  }, [fontError]);

  if ((!fontsLoaded && !fontError) || !backgroundsLoaded) {
    return null;
  }

  return (
    <AegisProvider config={aegisConfig}>
      <GameSessionProvider>
        <ErrorBoundary>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              animationDuration: 200,
              gestureEnabled: false,
              contentStyle: {
                backgroundColor: 'transparent',
              },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="terms-of-service" />
            <Stack.Screen name="title" />
            <Stack.Screen name="mode-selection" />
            <Stack.Screen name="sessions" />
            <Stack.Screen name="game" />
            <Stack.Screen name="market" />
            <Stack.Screen name="inventory" />
            <Stack.Screen name="leaderboard" />
            <Stack.Screen name="settings" />
          </Stack>
        </ErrorBoundary>
      </GameSessionProvider>
    </AegisProvider>
  );
}
