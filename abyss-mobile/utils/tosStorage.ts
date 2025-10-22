import AsyncStorage from '@react-native-async-storage/async-storage';

const TOS_STORAGE_KEY = 'app_tos_acceptance';

export interface ToSAcceptance {
  version: string;
  acceptedAt: string; // ISO 8601 timestamp
  accepted: boolean;
}

/**
 * Retrieve the stored ToS acceptance state
 * @returns The ToS acceptance object if found, null otherwise
 */
export async function getToSAcceptance(): Promise<ToSAcceptance | null> {
  try {
    const stored = await AsyncStorage.getItem(TOS_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as ToSAcceptance;

    // Validate the structure
    if (!parsed.version || !parsed.acceptedAt || typeof parsed.accepted !== 'boolean') {
      console.error('ToS acceptance data is corrupted, treating as non-acceptance');
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to retrieve ToS acceptance:', error);
    return null;
  }
}

/**
 * Store ToS acceptance with version and timestamp
 * @param version - The version of ToS being accepted
 */
export async function storeToSAcceptance(version: string): Promise<void> {
  try {
    const acceptance: ToSAcceptance = {
      version,
      acceptedAt: new Date().toISOString(),
      accepted: true,
    };

    await AsyncStorage.setItem(TOS_STORAGE_KEY, JSON.stringify(acceptance));
    console.log('ToS acceptance stored successfully');
  } catch (error) {
    console.error('Failed to store ToS acceptance:', error);
    throw new Error('Failed to store ToS acceptance');
  }
}

/**
 * Check if the user has accepted the current version of ToS
 * @param currentVersion - The current version to check against
 * @returns True if user has accepted the current version, false otherwise
 */
export async function hasAcceptedCurrentToS(currentVersion: string): Promise<boolean> {
  try {
    const acceptance = await getToSAcceptance();

    if (!acceptance) {
      return false;
    }

    // Check if version matches and accepted is true
    if (acceptance.version !== currentVersion) {
      console.log('ToS version mismatch - new acceptance required');
      return false;
    }

    return acceptance.accepted;
  } catch (error) {
    console.error('Failed to check ToS acceptance:', error);
    return false;
  }
}
