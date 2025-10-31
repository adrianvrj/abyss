import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSequence,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Pattern } from '../utils/patternDetector';
import { Theme } from '../constants/Theme';

interface PatternLinesProps {
  patterns: Pattern[];
  symbolSize: number;
  gridGap?: number;
  gridPadding?: number;
}

export default function PatternLines({
  patterns,
  symbolSize,
  gridGap = 4,
  gridPadding = 8,
}: PatternLinesProps) {
  if (!patterns || patterns.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {patterns.map((pattern, index) => (
        <PatternLine
          key={`${pattern.type}-${index}-${pattern.positions.map(p => p.join(',')).join('-')}`}
          pattern={pattern}
          symbolSize={symbolSize}
          gridGap={gridGap}
          gridPadding={gridPadding}
          delay={index * 200}
        />
      ))}
    </View>
  );
}

interface PatternLineProps {
  pattern: Pattern;
  symbolSize: number;
  gridGap: number;
  gridPadding: number;
  delay: number;
}

function PatternLine({
  pattern,
  symbolSize,
  gridGap,
  gridPadding,
  delay,
}: PatternLineProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    // Show highlight for longer (2.7 seconds total: 1.5s before score + 1.2s during score display)
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(2700, withTiming(0, { duration: 300 }))
      )
    );
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(2700, withTiming(0.8, { duration: 300 }))
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  // Calculate cell dimensions
  // Each cell has the symbol + padding (2px top + 2px bottom = 4px total vertical padding)
  const cellPaddingVertical = 4;
  const cellHeight = symbolSize + cellPaddingVertical + 4; // 4 extra for spacing
  const cellWidth = symbolSize + gridGap; // Width includes the gap between columns

  // Get line coordinates based on pattern type
  const getLineStyle = () => {
    const positions = pattern.positions;
    if (positions.length === 0) return {};

    const firstPos = positions[0];
    const lastPos = positions[positions.length - 1];

    // Calculate center of first and last symbols
    // X position: padding + (column * cellWidth) + half symbol size
    const startX = gridPadding + firstPos[1] * cellWidth + symbolSize / 2;
    // Y position: padding + (row * cellHeight) + half symbol size
    const startY = gridPadding + firstPos[0] * cellHeight + symbolSize / 2;
    const endX = gridPadding + lastPos[1] * cellWidth + symbolSize / 2;
    const endY = gridPadding + lastPos[0] * cellHeight + symbolSize / 2;

    // Calculate line length and angle
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return {
      width: length,
      left: startX,
      top: startY,
      transform: [{ rotate: `${angle}deg` }],
    };
  };

  const lineStyle = getLineStyle();

  // Draw individual highlight boxes for each position
  const renderHighlightBoxes = () => {
    return pattern.positions.map((pos, index) => {
      const [row, col] = pos;
      const left = gridPadding + col * cellWidth - 4; // -4 to center the box (8px border / 2)
      const top = gridPadding + row * cellHeight - 4; // -4 to center the box

      return (
        <Animated.View
          key={`box-${index}`}
          style={[
            styles.highlightBox,
            animatedStyle,
            {
              left,
              top,
              width: symbolSize + 8,
              height: symbolSize + 8,
            },
          ]}
        />
      );
    });
  };

  return (
    <View style={styles.patternContainer}>
      {/* Highlight boxes around each symbol */}
      {renderHighlightBoxes()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  patternContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  line: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#FFD700', // Gold color for the line
    borderRadius: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  highlightBox: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 3,
  },
});
