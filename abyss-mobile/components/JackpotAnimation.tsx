import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSequence,
    withTiming,
    withDelay,
    withRepeat,
    Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Theme } from '../constants/Theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface JackpotAnimationProps {
    onComplete: () => void;
}

export default function JackpotAnimation({ onComplete }: JackpotAnimationProps) {
    useEffect(() => {
        // Call onComplete after animation duration (2.5 seconds)
        const timeout = setTimeout(() => {
            onComplete();
        }, 2500);

        return () => clearTimeout(timeout);
    }, [onComplete]);

    // Main text animation - slide up, pause, slide down
    const textStyle = useAnimatedStyle(() => {
        return {
            opacity: withSequence(
                withTiming(1, { duration: 0 }),
                withDelay(2000, withTiming(0, { duration: 500 }))
            ),
            transform: [
                {
                    translateY: withSequence(
                        withTiming(SCREEN_HEIGHT, { duration: 0 }),
                        withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }),
                        withDelay(1500, withTiming(-SCREEN_HEIGHT, { duration: 500, easing: Easing.in(Easing.cubic) })),
                    ),
                },
                {
                    scale: withSequence(
                        withTiming(0.8, { duration: 0 }),
                        withTiming(1.2, { duration: 300, easing: Easing.out(Easing.back(2)) }),
                        withTiming(1, { duration: 200 }),
                    ),
                },
            ],
        };
    });

    // White screen flash effect
    const flashStyle = useAnimatedStyle(() => {
        return {
            opacity: withRepeat(
                withSequence(
                    withTiming(0.6, { duration: 80 }),
                    withTiming(0, { duration: 80 }),
                ),
                15,
                true
            ),
        };
    });

    return (
        <View style={styles.container}>
            {/* White screen flash */}
            <Animated.View style={[styles.flashOverlay, flashStyle]} />

            {/* Main jackpot text */}
            <Animated.View style={[styles.content, textStyle]}>
                <Text style={styles.jackpotText}>JACKPOT!</Text>
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
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 1000,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
    },
    jackpotText: {
        fontFamily: Theme.fonts.body,
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFD700', // Gold/Yellow
        textAlign: 'center',
        textShadowColor: 'rgba(255, 165, 0, 0.8)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    flashOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
    },
});
