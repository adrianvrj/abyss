/**
 * Starknet wallet connection utilities
 */

import { getStarknet } from '@starknet-io/get-starknet-core';

export interface WalletConnection {
  address: string;
  isConnected: boolean;
}

/**
 * Connect to Starknet wallet (ArgentX, Braavos, etc.)
 */
export async function connectWallet(): Promise<string> {
  try {
    const starknetInstance = getStarknet();

    if (!starknetInstance.getLastConnectedWallet) {
      throw new Error('Starknet wallet provider not found');
    }

    const wallet = await starknetInstance.getLastConnectedWallet();

    if (!wallet) {
      throw new Error('No wallet found. Please install ArgentX or Braavos.');
    }

    await starknetInstance.enable(wallet);

    // Request accounts from the wallet
    const accounts = await wallet.request({ type: 'wallet_requestAccounts' });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found in wallet');
    }

    return accounts[0];
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw new Error('Failed to connect wallet. Please make sure you have ArgentX or Braavos installed.');
  }
}

/**
 * Disconnect from Starknet wallet
 */
export async function disconnectWallet(): Promise<void> {
  try {
    const starknet = getStarknet();
    await starknet.disconnect();
    console.log('Wallet disconnected');
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
  }
}

/**
 * Get currently connected wallet address
 */
export function getConnectedAddress(): string | null {
  try {
    // This would need to be implemented with actual wallet state management
    return null;
  } catch {
    return null;
  }
}
