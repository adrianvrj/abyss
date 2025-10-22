import { View, Text, Pressable, StyleSheet, Linking, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Theme } from '../constants/Theme';
import TelegramIcon from '../components/TelegramIcon';
import SettingsIcon from '../components/SettingsIcon';

export default function ModeSelectionScreen() {
  const router = useRouter();

  const handleModeSelect = (mode: 'casual' | 'competitive') => {
    router.push(`/sessions?mode=${mode}`);
  };

  const handleLeaderboard = () => {
    router.push('/leaderboard');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleTelegram = async () => {
    // Replace with your actual Telegram link
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
          <Pressable
            style={styles.option}
            onPress={() => handleModeSelect('casual')}
          >
            <Text style={styles.optionText}>&gt; free to play</Text>
          </Pressable>

          <Pressable
            style={styles.option}
            onPress={() => handleModeSelect('competitive')}
          >
            <Text style={styles.optionText}>&gt; gambling</Text>
          </Pressable>

          <Pressable
            style={styles.option}
            onPress={handleLeaderboard}
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
            <TelegramIcon size={32} color={Theme.colors.primary} />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
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
  },
  appIcon: {
    width: 35,
    height: 35,
  },
  menuOptions: {
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  option: {
    paddingVertical: Theme.spacing.sm,
  },
  optionText: {
    fontFamily: Theme.fonts.body,
    fontSize: 24,
    color: Theme.colors.primary,
  },
  bottomSection: {
    position: 'absolute',
    bottom: Theme.spacing.xl,
    flexDirection: 'row',
    gap: Theme.spacing.xl,
  },
  iconButton: {
    padding: Theme.spacing.xs,
  },
});
