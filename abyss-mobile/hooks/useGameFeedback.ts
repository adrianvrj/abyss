import { useCallback, useRef, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { getHapticsEnabled } from '../utils/settingsStorage';

export interface GameFeedbackActions {
  playPatternHit: (patternType: string) => Promise<void>;
  playLevelUp: () => Promise<void>;
  playSpin: () => Promise<void>;
  playSpinAnimation: () => { stopSpinSound: () => void };
  playGameOver: () => Promise<void>;
}

export function useGameFeedback(): GameFeedbackActions {
  const spinSound = useRef<Audio.Sound | null>(null);

  // Initialize audio on mount
  useEffect(() => {
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        // Load spin sound
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/spin.mp3')
        );
        spinSound.current = sound;
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    };

    initAudio();

    // Cleanup on unmount
    return () => {
      if (spinSound.current) {
        spinSound.current.unloadAsync();
      }
    };
  }, []);

  // Load sound effects
  const loadSounds = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Failed to set audio mode:', error);
    }
  }, []);

  const playPatternHit = useCallback(async (patternType: string) => {
    const hapticsEnabled = await getHapticsEnabled();
    if (!hapticsEnabled) return;

    try {
      // Multi-impact feedback based on pattern type
      if (patternType.includes('5')) {
        // Triple heavy impact for 5-match
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 100);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 200);
      } else if (patternType.includes('4')) {
        // Double medium impact for 4-match
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 80);
      } else if (patternType.includes('diagonal')) {
        // Special pattern for diagonal
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 50);
      } else {
        // Single impact for 3-match
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Failed to play pattern hit feedback:', error);
    }
  }, []);

  // Play level up feedback - celebratory pattern
  const playLevelUp = useCallback(async () => {
    const hapticsEnabled = await getHapticsEnabled();
    if (!hapticsEnabled) return;

    try {
      // Ascending pattern: light -> medium -> heavy -> heavy
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 80);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 160);
      setTimeout(async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 240);
    } catch (error) {
      console.error('Failed to play level up feedback:', error);
    }
  }, []);

  // Play spin feedback - quick tap response
  const playSpin = useCallback(async () => {
    const hapticsEnabled = await getHapticsEnabled();
    if (!hapticsEnabled) return;

    try {
      // Quick, crisp feedback for button press
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Failed to play spin feedback:', error);
    }
  }, []);

  // Play game over feedback - dramatic failure pattern
  const playGameOver = useCallback(async () => {
    const hapticsEnabled = await getHapticsEnabled();
    if (!hapticsEnabled) return;

    try {
      // Heavy descending pattern to indicate loss
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 100);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 200);
      setTimeout(async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }, 300);
    } catch (error) {
      console.error('Failed to play game over feedback:', error);
    }
  }, []);

  // Play spin animation feedback (rhythmic during animation)
  // Returns a function to stop the sound when animation ends
  const playSpinAnimation = useCallback(() => {
    let intervalHandle: ReturnType<typeof setInterval> | null = null;
    let isStopped = false;

    const startAsync = async () => {
      const hapticsEnabled = await getHapticsEnabled();

      try {
        // Play spin sound
        if (spinSound.current) {
          try {
            await spinSound.current.setPositionAsync(0);
            await spinSound.current.setIsLoopingAsync(true); // Loop until stopped
            await spinSound.current.playAsync();
          } catch (error) {
            console.error('Failed to play spin sound:', error);
          }
        }

        // Play haptic feedback if enabled
        if (!hapticsEnabled) return;

        // Start with stronger initial feedback
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Continue rhythmic haptic feedback during animation
        intervalHandle = setInterval(async () => {
          if (isStopped) {
            if (intervalHandle) clearInterval(intervalHandle);
            return;
          }
          try {
            const stillEnabled = await getHapticsEnabled();
            if (stillEnabled) {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          } catch (error) {
            console.error('Failed to play continuous haptic feedback:', error);
          }
        }, 750);

      } catch (error) {
        console.error('Failed to play spin animation feedback:', error);
      }
    };

    // Start the sound/haptics async
    startAsync();

    // Return stop function
    return {
      stopSpinSound: async () => {
        isStopped = true;
        if (intervalHandle) {
          clearInterval(intervalHandle);
        }
        if (spinSound.current) {
          try {
            await spinSound.current.stopAsync();
            await spinSound.current.setIsLoopingAsync(false);
          } catch (error) {
            console.error('Failed to stop spin sound:', error);
          }
        }
      }
    };
  }, []);

  return {
    playPatternHit,
    playLevelUp,
    playSpin,
    playSpinAnimation,
    playGameOver,
  };
}
