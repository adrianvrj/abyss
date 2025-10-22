import { getPrivateKey, hasPrivateKey } from './secureStorage';

/**
 * Account management utilities for the Aegis account
 */

export interface AccountStatus {
  isConnected: boolean;
  hasStoredKey: boolean;
}

/**
 * Check the current account status
 * @returns Account status information
 */
export async function getAccountStatus(): Promise<AccountStatus> {
  try {
    const hasStoredKey = await hasPrivateKey();
    const privateKey = await getPrivateKey();
    
    return {
      isConnected: privateKey !== null,
      hasStoredKey,
    };
  } catch (error) {
    console.error('Failed to get account status:', error);
    return {
      isConnected: false,
      hasStoredKey: false,
    };
  }
}

/**
 * Check if the account is properly initialized and ready to use
 * @returns True if account is ready, false otherwise
 */
export async function isAccountReady(): Promise<boolean> {
  try {
    const status = await getAccountStatus();
    return status.isConnected && status.hasStoredKey;
  } catch (error) {
    console.error('Failed to check if account is ready:', error);
    return false;
  }
}
