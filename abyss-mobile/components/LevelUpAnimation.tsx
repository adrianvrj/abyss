import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSequence,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Theme } from '../constants/Theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LevelUpAnimationProps {
    level: number;
    onComplete: () => void;
}

export default function LevelUpAnimation({ level, onComplete }: LevelUpAnimationProps) {
    useEffect(() => {
        // Call onComplete after animation duration (1.5 seconds)
        const timeout = setTimeout(() => {
            onComplete();
        }, 1500);

        return () => clearTimeout(timeout);
    }, [onComplete]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: withSequence(
                withTiming(1, { duration: 0 }),
                withDelay(1200, withTiming(0, { duration: 300 })) // Fade out at end
            ),
            transform: [
                {
                    translateY: withSequence(
                        withTiming(SCREEN_HEIGHT, { duration: 0 }), // Start BELOW screen
                        withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }), // Slide up to Center
                        withDelay(700, withTiming(SCREEN_HEIGHT, { duration: 400, easing: Easing.in(Easing.cubic) })), // Slide back DOWN
                    ),
                },
            ],
        };
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.content, animatedStyle]}>
                <Text style={styles.text}>LEVEL UP!</Text>
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
    },
    text: {
        fontFamily: Theme.fonts.body,
        fontSize: 54,
        fontWeight: 'bold',
        color: Theme.colors.primary,
        textAlign: 'center',
    },
});
