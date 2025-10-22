import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export { SCREEN_WIDTH, SCREEN_HEIGHT };

/**
 * Width percentage helper
 * @param percentage - percentage of screen width (0-100)
 */
export const wp = (percentage: number): number => {
  return (SCREEN_WIDTH * percentage) / 100;
};

/**
 * Height percentage helper
 * @param percentage - percentage of screen height (0-100)
 */
export const hp = (percentage: number): number => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

/**
 * Responsive font size based on screen width
 * @param size - base font size
 */
export const responsiveFontSize = (size: number): number => {
  const baseWidth = 375; // iPhone SE width as base
  return (SCREEN_WIDTH / baseWidth) * size;
};
