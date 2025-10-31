import { Dimensions } from 'react-native';

// Get fresh dimensions each time to avoid caching issues
function getScreenDimensions() {
  const { width, height } = Dimensions.get('window');
  return { width, height };
}

// Add dimension change listener to ensure positioning updates
Dimensions.addEventListener('change', () => {
  console.log('Screen dimensions changed, positioning will be recalculated');
});

/**
 * Slot machine positioning utilities
 * The grid should be positioned relative to the slot machine image center,
 * not the screen, to ensure consistent placement across all devices
 */

export interface SlotMachinePosition {
  top: string;
  left: string;
  width: number;
  height: number;
}

/**
 * Get the positioning configuration for the slot grid
 * Using percentage-based positioning relative to slot machine container
 * This ensures the grid stays centered regardless of device size
 */
export function getSlotGridPosition(): SlotMachinePosition {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = getScreenDimensions();

  return {
    // Use percentage positioning to stay centered on the slot machine
    top: '54%', // Center vertically
    left: '46%', // Center horizontally

    // Grid container dimensions - adjusted for proper fit within the slot machine screen
    width: SCREEN_WIDTH * 0.65,  // Slightly narrower for better fit
    height: SCREEN_HEIGHT * 0.45, // Taller to accommodate 3 rows properly
  };
}

/**
 * Get responsive symbol size based on screen dimensions
 * Ensures symbols are visible but not too large
 */
export function getSymbolSize(): number {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = getScreenDimensions();
  return Math.min(SCREEN_HEIGHT * 0.086, SCREEN_WIDTH * 0.12);
}