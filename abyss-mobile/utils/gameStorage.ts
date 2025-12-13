import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PersistedGameState {
  sessionId: number;
  score: number;
  level: number;
  spinsLeft: number;
  bonusSpins: number; // Persist bonus spins
  isComplete: boolean;
  is666: boolean;
  timestamp: number;
}

const STORAGE_KEY_PREFIX = 'game_state_';
const LAST_SESSION_KEY = 'last_active_session_id';

/**
 * Set the last active session ID
 */
export async function setLastActiveSessionId(sessionId: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SESSION_KEY, sessionId.toString());
  } catch (error) {
    console.error('Failed to set last session ID:', error);
  }
}

/**
 * Get the last active session ID
 */
export async function getLastActiveSessionId(): Promise<number | null> {
  try {
    const id = await AsyncStorage.getItem(LAST_SESSION_KEY);
    return id ? parseInt(id, 10) : null;
  } catch (error) {
    console.error('Failed to get last session ID:', error);
    return null;
  }
}

/**
 * Clear the last active session ID
 */
export async function clearLastActiveSessionId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LAST_SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear last session ID:', error);
  }
}

/**
 * Persist game state to AsyncStorage
 * Also updates the last active session ID tracking
 */
export async function persistGameState(state: PersistedGameState): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${state.sessionId}`;
    const stateWithTimestamp = {
      ...state,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(stateWithTimestamp));

    // Update last active session tracking
    if (!state.isComplete) {
      await setLastActiveSessionId(state.sessionId);
    } else {
      // If completed, we might want to clear it, but maybe safer to let the UI decide?
      // Actually, if it's complete, it's no longer "active".
      // But let's check if this was the stored last session before clearing
      const lastId = await getLastActiveSessionId();
      if (lastId === state.sessionId) {
        await clearLastActiveSessionId();
      }
    }
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
      typeof parsed.level === 'number' &&
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

    // Also clear last active session if it matches
    const lastId = await getLastActiveSessionId();
    if (lastId === sessionId) {
      await clearLastActiveSessionId();
    }
  } catch (error) {
    console.error('Failed to clear game state:', error);
  }
}
