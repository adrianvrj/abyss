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
        withTiming(1, { duration: 0 }),
        withDelay(2500, withTiming(0, { duration: 500 })) // Fade out at end
      ),
      transform: [
        {
          translateY: withSequence(
            withTiming(SCREEN_HEIGHT, { duration: 0 }), // Start BELOW screen
            withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) }), // Slide up to Center
            withDelay(1200, withTiming(SCREEN_HEIGHT, { duration: 600, easing: Easing.in(Easing.cubic) })), // Slide back DOWN
          ),
        },
        // No scale animation, just pure slide
      ],
    };
  });

  // Screen Flash / Ambient Light
  const flashStyle = useAnimatedStyle(() => {
    return {
      opacity: withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(0.5, { duration: 800 }), // Ambient white light fills screen
        withDelay(1200, withTiming(0, { duration: 600 }))
      ),
    };
  });

  return (
    <View style={styles.container}>
      {/* Full Screen Flash Background */}
      <Animated.View style={[styles.flashOverlay, flashStyle]} />

      <Animated.View style={[styles.contentContainer, animatedStyle]}>
        <View style={styles.imageContainer}>
          <Image
            source={require('../assets/images/item40.png')}
            style={styles.bibliaImage}
            resizeMode="contain"
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, // Cover entire screen
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF', // Pure white light
    zIndex: 1,
  },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  imageContainer: {
    width: SCREEN_WIDTH * 0.55, // Larger for better visibility
    height: SCREEN_WIDTH * 0.55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bibliaImage: {
    width: '100%',
    height: '100%',
  },
});
