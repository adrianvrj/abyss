import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { Theme } from '../constants/Theme';

export default function TitleScreen() {
  const router = useRouter();

  // Animation for the subtitle tick effect
  const tickScale = useSharedValue(1);
  const tickOpacity = useSharedValue(1);

  // Start tick animation
  React.useEffect(() => {
    tickScale.value = withRepeat(
      withTiming(1.1, { duration: 1000 }),
      -1, // infinite repeat
      true // reverse
    );
    
    tickOpacity.value = withRepeat(
      withTiming(0.6, { duration: 1000 }),
      -1, // infinite repeat
      true // reverse
    );
  }, []);

  const tickAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tickScale.value }],
    opacity: tickOpacity.value,
  }));

  const handlePress = () => {
    router.push('/mode-selection');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.pressable} onPress={handlePress}>
        <Animated.View entering={FadeIn.duration(600)} style={styles.content}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>ABYSS</Text>
            <Image
              source={require('../assets/images/abyss-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Animated.Text style={[styles.subtitle, tickAnimatedStyle]}>tap to continue...</Animated.Text>
        </Animated.View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  pressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xl,
  },
  logo: {
    width: 80,
    height: 80,
    marginLeft: Theme.spacing.lg,
  },
  title: {
    fontFamily: Theme.fonts.title,
    fontSize: 120,
    color: Theme.colors.primary,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    color: Theme.colors.white,
  },
});
