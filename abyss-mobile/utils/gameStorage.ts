import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PersistedGameState {
  sessionId: number;
  score: number;
  spinsLeft: number;
  isComplete: boolean;
  is666: boolean;
  timestamp: number;
}

const STORAGE_KEY_PREFIX = 'game_state_';

/**
 * Persist game state to AsyncStorage
 */
export async function persistGameState(state: PersistedGameState): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${state.sessionId}`;
    const stateWithTimestamp = {
      ...state,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(stateWithTimestamp));
  } catch (error) {
    console.error('Failed to persist game state:', error);
    // Non-critical error, continue gameplay
  }
}

/**
 * Load game state from AsyncStorage
 */
export async function loadGameState(sessionId: number): Promise<PersistedGameState | null> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
    const data = await AsyncStorage.getItem(key);

    if (!data) {
      return null;
    }

    const parsed = JSON.parse(data) as PersistedGameState;

    // Validate structure
    if (
      typeof parsed.sessionId === 'number' &&
      typeof parsed.score === 'number' &&
      typeof parsed.spinsLeft === 'number'
    ) {
      return parsed;
    }

    return null;
  } catch (error) {
    console.error('Failed to load game state:', error);
    return null;
  }
}

/**
 * Clear game state from AsyncStorage
 */
export async function clearGameState(sessionId: number): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear game state:', error);
  }
}
