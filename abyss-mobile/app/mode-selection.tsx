import { View, Text, Pressable, StyleSheet, Linking, Image, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Theme } from '../constants/Theme';
import SettingsIcon from '../components/SettingsIcon';
import { useAegis } from '@cavos/aegis';

export default function ModeSelectionScreen() {
  const router = useRouter();
  const { aegisAccount } = useAegis();

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
            <Text style={styles.optionText}>&gt; degen</Text>
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
