import { Asset } from 'expo-asset';

const requiredImages = [
  require('../assets/images/cavos_logo.png'),
  require('../assets/images/slot_machine.png'),
  require('../assets/images/diamond.png'),
  require('../assets/images/cherry.png'),
  require('../assets/images/lemon.png'),
  require('../assets/images/seven.png'),
  require('../assets/images/six.png'),
  require('../assets/images/coin.png'),
];

/**
 * Preload all required game assets
 */
export const preloadAssets = async (): Promise<void> => {
  try {
    const imageAssets = requiredImages.map((image) => {
      return Asset.fromModule(image).downloadAsync();
    });

    await Promise.all(imageAssets);
    console.log('✓ All assets loaded successfully');
  } catch (error) {
    console.error('✗ Asset loading error:', error);
    throw error;
  }
};

/**
 * Validate that all required assets exist
 */
export const validateAssets = (): boolean => {
  try {
    requiredImages.forEach((image, index) => {
      if (!image) {
        console.warn(`⚠ Missing required asset at index ${index}`);
        return false;
      }
    });
    return true;
  } catch (error) {
    console.error('Asset validation error:', error);
    return false;
  }
};
