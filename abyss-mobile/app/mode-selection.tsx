import { View, Text, Pressable, StyleSheet, Linking, Image, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Theme } from '../constants/Theme';
import SettingsIcon from '../components/SettingsIcon';
import { useAegis } from '@cavos/aegis';
import { getLastActiveSessionId } from '../utils/gameStorage';
import { newSession, getPlayerSessions } from '../utils/abyssContract';

export default function ModeSelectionScreen() {
  const router = useRouter();
  const { aegisAccount } = useAegis();
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      checkActiveSession();
    }, [])
  );

  const checkActiveSession = async () => {
    setCheckingSession(true);
    const id = await getLastActiveSessionId();
    setActiveSessionId(id);
    setCheckingSession(false);
  };

  const handleContinue = () => {
    if (activeSessionId) {
      router.push(`/game?sessionId=${activeSessionId}`);
    }
  };

  const handleNewGame = async () => {
    if (isCreating || !aegisAccount) return;

    setIsCreating(true);
    try {
      // Get current sessions count to detect the new one
      const address = aegisAccount.address as string;
      const initialSessions = await getPlayerSessions(address, true);
      const initialCount = initialSessions ? initialSessions.length : 0;
      const lastOldId = initialSessions && initialSessions.length > 0
        ? Number(initialSessions[initialSessions.length - 1])
        : 0;

      console.log(`[NewGame] Initial sessions: ${initialCount}, last ID: ${lastOldId}`);

      // Create new session (always competitive/free now)
      const txHash = await newSession(aegisAccount, true);
      console.log(`[NewGame] Transaction hash: ${txHash}`);

      // Poll for the new session - check for a NEW session ID, not just count
      let retries = 10;
      while (retries > 0) {
        const sessions = await getPlayerSessions(address, true);
        const currentCount = sessions ? sessions.length : 0;
        const latestId = sessions && sessions.length > 0
          ? Number(sessions[sessions.length - 1])
          : 0;

        console.log(`[NewGame] Poll ${11 - retries}: count=${currentCount}, latestId=${latestId}`);

        // Check if we have a NEW session ID (not just count increase)
        if (latestId > lastOldId) {
          console.log(`[NewGame] Found new session: ${latestId}`);
          router.push(`/game?sessionId=${latestId}`);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
        retries--;
      }

      console.error('[NewGame] Timeout waiting for new session to appear');
      Alert.alert('Error', 'Failed to create new session. Please try again.');
    } catch (error) {
      console.error('Failed to create new game:', error);
      Alert.alert('Error', 'Failed to create game. Check console for details.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLeaderboard = () => {
    router.push('/leaderboard');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleTelegram = async () => {
    const telegramUrl = 'https://t.me/+JB4RkO3eZrFhNjYx';
    try {
      const canOpen = await Linking.canOpenURL(telegramUrl);
      if (canOpen) {
        await Linking.openURL(telegramUrl);
      }
    } catch (error) {
      console.error('Failed to open Telegram:', error);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/images/bg-welcome.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* App Icon at Top */}
          <View style={styles.topSection}>
            <Image
              source={require('../assets/images/icon copy.png')}
              style={styles.appIcon}
              resizeMode="contain"
            />
          </View>

          {/* Menu Options in Center */}
          <Animated.View entering={FadeIn.duration(400)} style={styles.menuOptions}>

            {/* Continue Button (if active session exists) */}
            {activeSessionId !== null && (
              <Pressable
                style={styles.option}
                onPress={handleContinue}
                disabled={isCreating}
              >
                <Text style={styles.optionText}>&gt; continue game</Text>
              </Pressable>
            )}

            {/* New Game / Play Button */}
            <Pressable
              style={styles.option}
              onPress={handleNewGame}
              disabled={isCreating}
            >
              {isCreating ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={styles.optionText}>&gt; creating...</Text>
                  <ActivityIndicator size="small" color={Theme.colors.primary} />
                </View>
              ) : (
                <Text style={styles.optionText}>
                  {activeSessionId !== null ? '> new game' : '> play'}
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.option}
              onPress={handleLeaderboard}
              disabled={isCreating}
            >
              <Text style={styles.optionText}>&gt; leaderboard</Text>
            </Pressable>
          </Animated.View>

          {/* Bottom Icons */}
          <View style={styles.bottomSection}>
            <Pressable
              style={styles.iconButton}
              onPress={handleTelegram}
            >
              <Image
                source={require('../assets/images/tg_icon.png')}
                style={styles.telegramIcon}
                resizeMode="contain"
              />
            </Pressable>

            <Pressable
              style={styles.iconButton}
              onPress={handleSettings}
            >
              <SettingsIcon size={32} color={Theme.colors.primary} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl * 2,
  },
  topSection: {
    position: 'absolute',
    top: Theme.spacing.xl,
    alignItems: 'center',
    paddingTop: Theme.spacing.xl,
  },
  appIcon: {
    width: 35,
    height: 35,
  },
  menuOptions: {
    paddingTop: Theme.spacing.xl,
    alignItems: 'center',
    gap: Theme.spacing.xl,
  },
  option: {
    paddingVertical: Theme.spacing.sm,
  },
  optionText: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    color: Theme.colors.white,
  },
  bottomSection: {
    position: 'absolute',
    bottom: Theme.spacing.xl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.xl,
  },
  iconButton: {
    padding: Theme.spacing.xs,
  },
  telegramIcon: {
    width: 32,
    height: 32,
  },
});
