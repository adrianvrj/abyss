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
 * These values can be easily adjusted to fine-tune the grid positioning
 * on the slot machine image
 */

export interface SlotMachinePosition {
  top: number;
  left: number;
  translateX: number;
  translateY: number;
  width: number;
  height: number;
}

/**
 * Get the positioning configuration for the slot grid
 * Adjust these values to center the grid on the slot machine's screen
 */
export function getSlotGridPosition(): SlotMachinePosition {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = getScreenDimensions();
  
  return {
    // Position the grid at the center of the screen
    top: SCREEN_HEIGHT * 0.5,
    left: SCREEN_WIDTH * 0.5,
    
    // Translate to center the grid on the slot machine's screen
    // Fine-tuned positioning for better centering
    translateX: -(SCREEN_WIDTH * 0.3779), // Horizontal centering - increased for better alignment
    translateY: -(SCREEN_HEIGHT * 0.134), // Vertical centering - increased for better alignment
    
    // Grid container dimensions - adjusted for better fit
    width: SCREEN_WIDTH * 0.7,  // Width of the grid area - increased for better visibility
    height: SCREEN_HEIGHT * 0.15, // Height of the grid area - increased for better visibility
  };
}

/**
 * Get responsive symbol size based on screen dimensions
 */
export function getSymbolSize(): number {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = getScreenDimensions();
  return Math.min(SCREEN_HEIGHT * 0.08, SCREEN_WIDTH * 0.12);
}

