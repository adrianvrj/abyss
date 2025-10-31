import { View, Text, StyleSheet, Pressable, Switch, Alert, ScrollView, ImageBackground } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../constants/Theme';
import { getSettings, saveSettings, AppSettings } from '../utils/settingsStorage';
import { getPrivateKey, clearSecureStorage } from '../utils/secureStorage';
import * as Haptics from 'expo-haptics';
import { useAegis } from '@cavos/aegis';

export default function SettingsScreen() {
  const router = useRouter();
  const { aegisAccount } = useAegis();
  const [settings, setSettings] = useState<AppSettings>({
    hapticsEnabled: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHapticsToggle = async (value: boolean) => {
    const newSettings = { ...settings, hapticsEnabled: value };
    setSettings(newSettings);

    try {
      await saveSettings(newSettings);
    } catch (error) {
      console.error('Failed to save haptics setting:', error);
      // Revert on error
      setSettings(settings);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleCopyAddress = async () => {
    try {
      const address = aegisAccount.address;
      if (!address) {
        Alert.alert('error', 'no wallet address found');
        return;
      }

      // Copy to clipboard
      await Clipboard.setStringAsync(address);

      // Haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Show success alert
      Alert.alert(
        'copied!',
        'your wallet address has been copied to clipboard',
        [{ text: 'ok' }]
      );
    } catch (error) {
      console.error('Failed to copy address:', error);
      Alert.alert('error', 'failed to copy wallet address');
    }
  };

  const handleExportPrivateKey = async () => {
    // Show warning alert first
    Alert.alert(
      'export private key',
      'your private key gives full access to your wallet. keep it safe and never share it with anyone.',
      [
        {
          text: 'cancel',
          style: 'cancel',
        },
        {
          text: 'export',
          style: 'destructive',
          onPress: async () => {
            try {
              const privateKey = await getPrivateKey();
              if (!privateKey) {
                Alert.alert('error', 'no private key found');
                return;
              }

              // Copy to clipboard
              await Clipboard.setStringAsync(privateKey);

              // Haptic feedback
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              // Show success alert
              Alert.alert(
                'copied!',
                'your private key has been copied to clipboard',
                [{ text: 'ok' }]
              );
            } catch (error) {
              console.error('Failed to export private key:', error);
              Alert.alert('error', 'failed to export private key');
            }
          },
        },
      ]
    );
  };

  const handleClearWallet = async () => {
    Alert.alert(
      'clear wallet & data',
      'this will DELETE your wallet and all app data. you will get a NEW wallet address. make sure you have exported your private key if you need it!',
      [
        {
          text: 'cancel',
          style: 'cancel',
        },
        {
          text: 'clear everything',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear secure storage (private key)
              await clearSecureStorage();

              // Clear all AsyncStorage data (settings, etc.)
              await AsyncStorage.clear();

              // Haptic feedback
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              // Show success alert
              Alert.alert(
                'data cleared!',
                'all data has been cleared. the app will restart with a new wallet.',
                [
                  {
                    text: 'restart',
                    onPress: () => {
                      // Navigate to root to trigger new wallet generation
                      router.replace('/');
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Failed to clear wallet:', error);
              Alert.alert('error', 'failed to clear wallet data');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ImageBackground
        source={require('../assets/images/bg-welcome.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/images/bg-welcome.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.primary} />
          </Pressable>
          <View style={styles.spacer} />
        </View>

        {/* Settings List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.settingsList}
          showsVerticalScrollIndicator={false}
        >
          {/* Haptics Setting */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>haptics</Text>
              <Text style={styles.settingDescription}>
                vibration feedback during gameplay
              </Text>
            </View>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={handleHapticsToggle}
              trackColor={{ false: '#333333', true: Theme.colors.primary }}
              thumbColor={settings.hapticsEnabled ? Theme.colors.white : '#999999'}
              ios_backgroundColor="#333333"
            />
          </View>

          {/* Copy Wallet Address */}
          <Pressable style={styles.settingItem} onPress={handleCopyAddress}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>wallet address</Text>
              <Text style={styles.settingDescription}>
                copy your wallet address to clipboard
              </Text>
            </View>
            <Ionicons name="copy-outline" size={24} color={Theme.colors.primary} />
          </Pressable>

          {/* Export Private Key */}
          <Pressable style={styles.dangerItem} onPress={handleExportPrivateKey}>
            <View style={styles.settingInfo}>
              <Text style={styles.dangerLabel}>export private key</Text>
              <Text style={styles.settingDescription}>
                copy your wallet private key to clipboard
              </Text>
            </View>
            <Ionicons name="download-outline" size={24} color="#ff0000" />
          </Pressable>

          {/* Clear Wallet & Data */}
          <Pressable style={styles.dangerItem} onPress={handleClearWallet}>
            <View style={styles.settingInfo}>
              <Text style={styles.dangerLabel}>clear wallet & data</Text>
              <Text style={styles.settingDescription}>
                delete wallet and get a new address (cannot be undone)
              </Text>
            </View>
            <Ionicons name="trash-outline" size={24} color="#ff0000" />
          </Pressable>
        </ScrollView>
      </Animated.View>
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
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xl,
  },
  backButton: {
    padding: Theme.spacing.xs,
  },
  header: {
    fontFamily: Theme.fonts.body,
    fontSize: 24,
    color: Theme.colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  spacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  settingsList: {
    gap: Theme.spacing.md,
    paddingBottom: Theme.spacing.xl,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  settingInfo: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  settingLabel: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    color: Theme.colors.primary,
    marginBottom: Theme.spacing.xs,
  },
  settingDescription: {
    fontFamily: Theme.fonts.body,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.3)',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
  },
  dangerLabel: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    color: '#ff0000',
    marginBottom: Theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.primary,
  },
});
