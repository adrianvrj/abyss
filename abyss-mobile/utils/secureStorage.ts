import * as SecureStore from 'expo-secure-store';

const PRIVATE_KEY_STORAGE_KEY = 'aegis_account_private_key';

/**
 * Securely store the private key for the Aegis account
 * @param privateKey - The private key to store securely
 */
export async function storePrivateKey(privateKey: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, privateKey);
    console.log('Private key stored securely');
  } catch (error) {
    console.error('Failed to store private key:', error);
    throw new Error('Failed to store private key securely');
  }
}

/**
 * Retrieve the stored private key
 * @returns The private key if found, null otherwise
 */
export async function getPrivateKey(): Promise<string | null> {
  try {
    const privateKey = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
    return privateKey;
  } catch (error) {
    console.error('Failed to retrieve private key:', error);
    return null;
  }
}

/**
 * Check if a private key exists in secure storage
 * @returns True if private key exists, false otherwise
 */
export async function hasPrivateKey(): Promise<boolean> {
  try {
    const privateKey = await getPrivateKey();
    return privateKey !== null && privateKey.length > 0;
  } catch (error) {
    console.error('Failed to check for private key:', error);
    return false;
  }
}

/**
 * Remove the stored private key from secure storage
 */
export async function removePrivateKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY);
    console.log('Private key removed from secure storage');
  } catch (error) {
    console.error('Failed to remove private key:', error);
    throw new Error('Failed to remove private key from secure storage');
  }
}

/**
 * Clear all secure storage (useful for logout/reset functionality)
 */
export async function clearSecureStorage(): Promise<void> {
  try {
    await removePrivateKey();
    console.log('Secure storage cleared');
  } catch (error) {
    console.error('Failed to clear secure storage:', error);
    throw new Error('Failed to clear secure storage');
  }
}
