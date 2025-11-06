import { View, Image, StyleSheet, Text } from 'react-native';
import { useEffect, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  withDelay,
} from 'react-native-reanimated';
import { SymbolType } from '../types';
import { Theme } from '../constants/Theme';
import { Pattern } from '../utils/patternDetector';
import PatternLines from './PatternLines';

interface SlotGridProps {
  grid: SymbolType[][];
  symbolSize: number;
  isSpinning?: boolean;
  patterns?: Pattern[];
  showPatternLines?: boolean;
}

export const symbolSources = {
  diamond: require('../assets/images/diamond.png'),
  cherry: require('../assets/images/cherry.png'),
  lemon: require('../assets/images/lemon.png'),
  seven: require('../assets/images/seven.png'),
  six: require('../assets/images/six.png'),
  coin: require('../assets/images/coin.png'),
};

// Available symbols for random generation
const ALL_SYMBOLS: SymbolType[] = ['diamond', 'cherry', 'lemon', 'seven', 'six', 'coin'];

// Generate random symbols for animation
function getRandomSymbols(count: number): SymbolType[] {
  return Array.from({ length: count }, () =>
    ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)]
  );
}

// Component for a single spinning column
function SlotColumn({
  symbols,
  symbolSize,
  isSpinning,
  columnIndex
}: {
  symbols: SymbolType[];
  symbolSize: number;
  isSpinning: boolean;
  columnIndex: number;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Display symbols - random during spin, final when stopped
  const [displaySymbols, setDisplaySymbols] = useState<SymbolType[]>(symbols);

  useEffect(() => {
    if (isSpinning) {
      // Show random symbols during spin
      setDisplaySymbols(getRandomSymbols(symbols.length));

      // Keep randomizing symbols during animation
      const interval = setInterval(() => {
        setDisplaySymbols(getRandomSymbols(symbols.length));
      }, 100); // Change symbols every 100ms

      // Each column starts spinning with a slight delay
      const delay = columnIndex * 100;

      translateY.value = 0;
      opacity.value = withDelay(
        delay,
        withTiming(0.6, { duration: 100 })
      );

      // Rapid spinning motion
      translateY.value = withDelay(
        delay,
        withRepeat(
          withTiming(-symbolSize * 3, {
            duration: 300,
            easing: Easing.linear
          }),
          20, // Spin 20 times for 6 seconds total (20 * 300ms = 6000ms)
          false
        )
      );

      return () => clearInterval(interval);
    } else {
      // Show final symbols when stopped
      setDisplaySymbols(symbols);

      // Stop spinning - bounce to final position
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.back(1.5))
      });
    }
  }, [isSpinning, columnIndex, symbolSize, symbols]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{
      translateY: translateY.value
    }],
  }));

  return (
    <View style={styles.column}>
      <Animated.View style={animatedStyle}>
        {displaySymbols.map((symbol, rowIndex) => (
          <View key={rowIndex} style={[styles.cell, { height: symbolSize + 8 }]}>
            <Image
              source={symbolSources[symbol]}
              style={[styles.symbol, { width: symbolSize, height: symbolSize }]}
              resizeMode="contain"
              onError={(error) => {
                console.error(`Symbol ${symbol} failed to load:`, error.nativeEvent.error);
              }}
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

export default function SlotGrid({
  grid,
  symbolSize,
  isSpinning = false,
  patterns = [],
  showPatternLines = false
}: SlotGridProps) {
  // Temporary test grid for debugging
  const testGrid: SymbolType[][] = [
    ['diamond', 'cherry', 'lemon', 'seven', 'coin'],
    ['cherry', 'diamond', 'seven', 'lemon', 'diamond'],
    ['lemon', 'seven', 'cherry', 'coin', 'lemon']
  ];

  // Use actual grid data with fallback
  const workingGrid = (!grid || grid.length === 0 || !grid[0] || grid[0].length === 0) ? testGrid : grid;

  // Transpose grid from rows to columns for column-based animation
  const columns: SymbolType[][] = [];
  for (let col = 0; col < 5; col++) {
    columns[col] = [];
    for (let row = 0; row < 3; row++) {
      columns[col][row] = workingGrid[row][col];
    }
  }

  return (
    <View style={styles.gridContainer}>
      {/* Debug indicator */}
      {__DEV__ && (!grid || grid.length === 0 || !grid[0] || grid[0].length === 0) && (
        <View style={styles.debugIndicator}>
          <Text style={styles.debugText}>Using Test Grid</Text>
        </View>
      )}

      {columns.map((columnSymbols, colIndex) => (
        <SlotColumn
          key={colIndex}
          symbols={columnSymbols}
          symbolSize={symbolSize}
          isSpinning={isSpinning}
          columnIndex={colIndex}
        />
      ))}

      {/* Pattern lines overlay */}
      {showPatternLines && patterns.length > 0 && (
        <PatternLines
          patterns={patterns}
          symbolSize={symbolSize}
          gridGap={4}
          gridPadding={8}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4, // Reduced gap for better fit
    paddingHorizontal: 8,
    borderWidth: 3,
    borderColor: Theme.colors.primary,
    borderRadius: 8,
    padding: 8,
  },
  column: {
    overflow: 'hidden',
    alignItems: 'center',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2, // Small padding for better spacing
  },
  symbol: {
    // Dynamic size set via props
  },
  debugIndicator: {
    position: 'absolute',
    top: -30,
    left: -50,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 4,
    borderRadius: 4,
    zIndex: 1000,
  },
  debugText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
