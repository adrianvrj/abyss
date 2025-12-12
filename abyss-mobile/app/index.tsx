import { View, Image, StyleSheet, Text } from 'react-native';
import { useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Theme } from '../constants/Theme';
import { useAegis } from '@cavos/aegis';
import { storePrivateKey, getPrivateKey, hasPrivateKey } from '../utils/secureStorage';
import { hasAcceptedCurrentToS } from '../utils/tosStorage';
import { CURRENT_TOS } from '../constants/TermsOfServiceContent';

export default function SplashScreen() {
  const router = useRouter();

  const { aegisAccount } = useAegis();

  const deployAccount = useCallback(async () => {
    try {
      const pk = await aegisAccount.deployAccount();
      // Store the private key securely
      await storePrivateKey(pk);
    } catch (error) {
      console.error('Failed to deploy account:', error);
      // Continue anyway to avoid blocking the app
    }
  }, [aegisAccount]);

  const restoreAccount = useCallback(async () => {
    try {
      const pk = await getPrivateKey();
      if (pk) {
        await aegisAccount.connectAccount(pk);
      } else {
        await deployAccount();
      }
    } catch (error) {
      // If restoration fails, try to deploy a new account
      await deployAccount();
    }
  }, [aegisAccount, deployAccount]);

  const initializeAccount = useCallback(async () => {
    try {
      const hasStoredKey = await hasPrivateKey();
      if (hasStoredKey) {
        await restoreAccount();
      } else {
        await deployAccount();
      }
    } catch (error) {
      console.error('Failed to initialize account:', error);
      // Continue anyway
    }
  }, [restoreAccount, deployAccount]);

  useEffect(() => {
    const init = async () => {
      // Initialize account
      await initializeAccount();

      // Warm up the server (fire and forget)
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://abyss-server-gilt.vercel.app';
      fetch(`${API_URL}/health`).catch(err => console.log('Server warm-up ping failed (expected if offline/sleeping):', err.message));

      // Check ToS acceptance
      let hasAcceptedToS = false;
      try {
        hasAcceptedToS = await hasAcceptedCurrentToS(CURRENT_TOS.version);
      } catch (error) {
        console.error('Failed to check ToS acceptance:', error);
        // On error, default to showing ToS
        hasAcceptedToS = false;
      }

      // Navigate based on ToS acceptance state
      setTimeout(() => {
        if (!hasAcceptedToS) {
          router.replace('/terms-of-service');
        } else {
          router.replace('/title');
        }
      }, 3000);
    };

    init();
  }, [router, initializeAccount]);

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(800)}>
        <Text style={styles.loadingText}>POWERED BY</Text>
        <Image
          source={require('../assets/images/cavos_logo.png')}
          style={styles.logo}
          resizeMode="contain"
          onError={(error) => {
            console.error('Logo image failed to load:', error.nativeEvent.error);
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    alignSelf: 'center',
  },
  loadingText: {
    fontFamily: Theme.fonts.body,
    fontSize: 25,
    color: Theme.colors.white,
    textAlign: 'center',
    marginBottom: 30,
  },
});
