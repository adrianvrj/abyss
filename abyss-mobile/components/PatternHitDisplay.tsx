import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Theme } from '../constants/Theme';
import { Pattern } from '../utils/patternDetector';
import { calculatePatternBonus } from '../utils/scoreCalculator';
import { DEFAULT_GAME_CONFIG, GameConfig } from '../constants/GameConfig';
import { getHapticsEnabled } from '../utils/settingsStorage';

interface PatternDisplayProps {
  pattern: Pattern;
  isVisible: boolean;
  delay?: number;
  onAnimationComplete?: () => void;
}

export function PatternDisplay({
  pattern,
  isVisible,
  delay = 0,
  onAnimationComplete
}: PatternDisplayProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (isVisible) {
      // Trigger haptic feedback when pattern appears
      const triggerHaptic = async () => {
        const hapticsEnabled = await getHapticsEnabled();
        if (hapticsEnabled) {
          // Different haptic based on pattern type
          if (pattern.type.includes('5')) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } else if (pattern.type.includes('4')) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } else {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      };

      setTimeout(() => triggerHaptic(), delay);

      // Animate in with delay
      opacity.value = withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.2)) }),
          withDelay(1000, withTiming(0, { duration: 300 }))
        )
      );

      translateY.value = withDelay(
        delay,
        withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.2)) })
      );

      scale.value = withDelay(
        delay,
        withSequence(
          withTiming(1.05, { duration: 400, easing: Easing.out(Easing.back(1.2)) }),
          withDelay(1000, withTiming(0.9, { duration: 300 }))
        )
      );

      // Call completion callback after animation
      setTimeout(() => {
        onAnimationComplete?.();
      }, delay + 1700);
    } else {
      opacity.value = 0;
      translateY.value = 30;
      scale.value = 0.8;
    }
  }, [isVisible, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  // Format pattern name
  const formatPatternName = (patternType: string) => {
    return patternType
      .replace('-', ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.patternCard}>
        {/* Pattern Info */}
        <View style={styles.patternInfo}>
          <Text style={styles.patternName}>
            {formatPatternName(pattern.type)}
          </Text>
          <Text style={styles.multiplierText}>
            x{pattern.multiplier}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

interface ScoreDisplayProps {
  score: number;
  isVisible: boolean;
  delay?: number;
  onAnimationComplete?: () => void;
}

export function ScoreDisplay({
  score,
  isVisible,
  delay = 0,
  onAnimationComplete
}: ScoreDisplayProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (isVisible) {
      // Trigger haptic feedback when score appears
      const triggerHaptic = async () => {
        const hapticsEnabled = await getHapticsEnabled();
        if (hapticsEnabled) {
          // Success notification for score reveal
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      };

      setTimeout(() => triggerHaptic(), delay);

      // Animate in with delay
      opacity.value = withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.2)) }),
          withDelay(1000, withTiming(0, { duration: 300 }))
        )
      );

      translateY.value = withDelay(
        delay,
        withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.2)) })
      );

      scale.value = withDelay(
        delay,
        withSequence(
          withTiming(1.05, { duration: 400, easing: Easing.out(Easing.back(1.2)) }),
          withDelay(1000, withTiming(0.9, { duration: 300 }))
        )
      );

      // Call completion callback after animation
      setTimeout(() => {
        onAnimationComplete?.();
      }, delay + 1700);
    } else {
      opacity.value = 0;
      translateY.value = 30;
      scale.value = 0.8;
    }
  }, [isVisible, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.scoreCard}>
        <Text style={styles.scoreValue}>+{score}</Text>
      </View>
    </Animated.View>
  );
}

interface PatternHitAnimationsProps {
  patterns: Pattern[];
  gameConfig?: GameConfig;
  onAllAnimationsComplete?: () => void;
  onCurrentPatternChange?: (index: number) => void;
}

export function PatternHitAnimations({
  patterns,
  gameConfig = DEFAULT_GAME_CONFIG,
  onAllAnimationsComplete,
  onCurrentPatternChange
}: PatternHitAnimationsProps) {
  const [currentPatternIndex, setCurrentPatternIndex] = React.useState(0);
  const [showScore, setShowScore] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);

  useEffect(() => {
    if (patterns.length === 0) return;
    // Start showing patterns - just show highlight (no text message)
    setCurrentPatternIndex(0);
    setIsComplete(false);

    // Notify parent of current pattern
    onCurrentPatternChange?.(0);

    // Show score after a brief delay to see the highlight
    setTimeout(() => {
      setShowScore(true);
    }, 1500);
  }, [patterns]);

  const handleScoreComplete = () => {
    setShowScore(false);

    // Move to next pattern or complete
    setTimeout(() => {
      if (currentPatternIndex + 1 < patterns.length) {
        const nextIndex = currentPatternIndex + 1;
        setCurrentPatternIndex(nextIndex);
        onCurrentPatternChange?.(nextIndex);

        // Show score for next pattern after delay
        setTimeout(() => {
          setShowScore(true);
        }, 1500);
      } else {
        setIsComplete(true);
        onCurrentPatternChange?.(-1); // Signal no pattern should be highlighted
        onAllAnimationsComplete?.();
      }
    }, 200);
  };

  if (patterns.length === 0 || isComplete) {
    return null;
  }

  const currentPattern = patterns[currentPatternIndex];
  const score = calculatePatternBonus(currentPattern, gameConfig);

  return (
    <View style={styles.animationsContainer}>
      {showScore && (
        <ScoreDisplay
          score={score}
          isVisible={true}
          delay={0}
          onAnimationComplete={handleScoreComplete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  animationsContainer: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: "8.1%",
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    marginVertical: 8,
  },
  patternCard: {
    backgroundColor: '#FFD700', // Yellow background
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
    minWidth: 280,
  },
  patternInfo: {
    flex: 1,
    alignItems: 'center',
  },
  patternName: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.background, // Black font
    textAlign: 'center',
    marginBottom: 4,
  },
  multiplierText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.background, // Black font
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: Theme.colors.background, // Black background
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: Theme.colors.primary, // Orange border
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
    minWidth: 120,
  },
  scoreValue: {
    fontFamily: Theme.fonts.body,
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.primary, // Orange font
    textAlign: 'center',
  },
});
