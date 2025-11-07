import { View, StyleSheet, Image, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BibliaSaveAnimationProps {
  onComplete: () => void;
}

export default function BibliaSaveAnimation({ onComplete }: BibliaSaveAnimationProps) {
  useEffect(() => {
    // Call onComplete after animation duration (3 seconds)
    const timeout = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(timeout);
  }, [onComplete]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withSequence(
        withTiming(0, { duration: 0 }), // Start invisible
        withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }), // Fade in
        withDelay(2000, withTiming(0, { duration: 500, easing: Easing.in(Easing.ease) })) // Hold then fade out
      ),
      transform: [
        {
          scale: withSequence(
            withTiming(0.5, { duration: 0 }), // Start small
            withTiming(1.2, { duration: 500, easing: Easing.out(Easing.back(1.5)) }), // Pop in
            withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) }), // Settle
            withDelay(1800, withTiming(0.8, { duration: 500, easing: Easing.in(Easing.ease) })) // Shrink out
          ),
        },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.imageContainer, animatedStyle]}>
        <Image
          source={require('../assets/images/item40.png')}
          style={styles.bibliaImage}
          resizeMode="contain"
        />
        {/* Glow effect */}
        <View style={styles.glowOuter} />
        <View style={styles.glowInner} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  imageContainer: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bibliaImage: {
    width: '100%',
    height: '100%',
    zIndex: 3,
  },
  glowOuter: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: 9999,
    backgroundColor: '#FFD700',
    opacity: 0.3,
    zIndex: 1,
  },
  glowInner: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    backgroundColor: '#FFD700',
    opacity: 0.5,
    zIndex: 2,
  },
});
