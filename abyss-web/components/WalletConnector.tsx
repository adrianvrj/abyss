'use client';

import React from 'react';
import { PixelButton } from './ui/PixelButton';

export interface WalletConnectorProps {
  onConnect: (address: string) => void;
  onDisconnect: () => void;
  connected: boolean;
  address: string | null;
}

export function WalletConnector({
  onConnect,
  onDisconnect,
  connected,
  address,
}: WalletConnectorProps) {
  const [isConnecting, setIsConnecting] = React.useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { connectWallet } = await import('@/lib/starknet');
      const walletAddress = await connectWallet();
      onConnect(walletAddress);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const { disconnectWallet } = await import('@/lib/starknet');
    await disconnectWallet();
    onDisconnect();
  };

  const formatAddress = (addr: string) => {
    if (addr.length < 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (connected && address) {
    return (
      <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-background border-2 border-primary">
        <div className="font-[family-name:var(--font-press-start)] text-foreground text-xs">
          Connected: {formatAddress(address)}
        </div>
        <PixelButton onClick={handleDisconnect} variant="secondary">
          Disconnect
        </PixelButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <p className="font-[family-name:var(--font-press-start)] text-foreground text-xs text-center">
        Connect your Starknet wallet to pay with crypto
      </p>
      <PixelButton onClick={handleConnect} loading={isConnecting} variant="primary">
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </PixelButton>
    </div>
  );
}
