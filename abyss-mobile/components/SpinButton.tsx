import { Pressable, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Theme } from '../constants/Theme';

interface SpinButtonProps {
  onPress: () => void;
  disabled: boolean;
  isSpinning: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SpinButton({ onPress, disabled, isSpinning }: SpinButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedPressable
      style={[styles.button, animatedStyle, (disabled || isSpinning) && styles.disabled]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || isSpinning}
    >
      <Text style={styles.text}>{isSpinning ? 'SPINNING...' : 'SPIN'}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: Theme.fonts.body,
    fontSize: 28,
    color: Theme.colors.background,
    fontWeight: 'bold',
  },
});
