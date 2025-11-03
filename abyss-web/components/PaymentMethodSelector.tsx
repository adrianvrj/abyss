'use client';

import React from 'react';
import { PixelButton } from './ui/PixelButton';

export interface PaymentMethodSelectorProps {
  enabled: boolean;
  isProcessing: boolean;
  onStripePayment: () => Promise<void>;
  onWalletPayment: () => Promise<void>;
  walletConnected: boolean;
}

export function PaymentMethodSelector({
  enabled,
  isProcessing,
  onStripePayment,
  onWalletPayment,
  walletConnected,
}: PaymentMethodSelectorProps) {
  const [processingMethod, setProcessingMethod] = React.useState<'stripe' | 'wallet' | null>(null);

  const handleStripePayment = async () => {
    setProcessingMethod('stripe');
    try {
      await onStripePayment();
    } finally {
      setProcessingMethod(null);
    }
  };

  const handleWalletPayment = async () => {
    setProcessingMethod('wallet');
    try {
      await onWalletPayment();
    } finally {
      setProcessingMethod(null);
    }
  };

  return (
    <div className="w-full mt-12">
      <h2 className="font-[family-name:var(--font-ramagothic)] text-primary text-3xl md:text-4xl mb-8 text-center">
        Payment Method
      </h2>
      <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
        <PixelButton
          onClick={handleStripePayment}
          disabled={!enabled || isProcessing}
          loading={processingMethod === 'stripe'}
          variant="primary"
          className="w-full md:w-auto"
        >
          Pay with Card
        </PixelButton>
        <PixelButton
          onClick={handleWalletPayment}
          disabled={!enabled || isProcessing}
          loading={processingMethod === 'wallet'}
          variant="secondary"
          className="w-full md:w-auto"
        >
          {walletConnected ? 'Pay with Wallet' : 'Connect Wallet'}
        </PixelButton>
      </div>
      {!enabled && (
        <p className="font-[family-name:var(--font-press-start)] text-foreground text-xs text-center mt-6 opacity-50">
          Please select a package first
        </p>
      )}
    </div>
  );
}
