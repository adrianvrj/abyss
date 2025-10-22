import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = 'app_settings';

export interface AppSettings {
  hapticsEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  hapticsEnabled: true,
};

/**
 * Get app settings from storage
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(stored) as AppSettings;
    return { ...DEFAULT_SETTINGS, ...parsed }; // Merge with defaults
  } catch (error) {
    console.error('Failed to retrieve settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save app settings to storage
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

/**
 * Get haptics enabled setting
 */
export async function getHapticsEnabled(): Promise<boolean> {
  const settings = await getSettings();
  return settings.hapticsEnabled;
}

/**
 * Set haptics enabled setting
 */
export async function setHapticsEnabled(enabled: boolean): Promise<void> {
  const settings = await getSettings();
  settings.hapticsEnabled = enabled;
  await saveSettings(settings);
}
