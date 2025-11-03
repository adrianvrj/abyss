'use client';

import React, { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { PackageOption } from '@/types/package';
import { AppError, createValidationError, createPaymentError } from '@/types/error';
import { validateStarknetAddress, sanitizeStarknetAddress } from '@/lib/validation';
import { PackageSelector } from '@/components/PackageSelector';
import { PixelButton } from '@/components/ui/PixelButton';
import { ErrorDisplay } from '@/components/ErrorDisplay';

interface PageProps {
  params: Promise<{ address: string }>;
}

export default function PurchasePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [address, setAddress] = React.useState<string>('');
  const [selectedPackage, setSelectedPackage] = React.useState<PackageOption | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<AppError | null>(null);
  const [showSuccess, setShowSuccess] = React.useState(false);

  // Initialize and validate address
  React.useEffect(() => {
    const rawAddress = resolvedParams.address;
    const sanitized = sanitizeStarknetAddress(rawAddress);

    if (!validateStarknetAddress(sanitized)) {
      setError(createValidationError(
        'The wallet address in the URL is invalid. Please check the link and try again.'
      ));
      return;
    }

    setAddress(sanitized);

    // Check for success/cancel query params
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      setShowSuccess(true);
    }

    if (canceled === 'true') {
      setError(createPaymentError('Payment was canceled. No charges were made.'));
    }
  }, [resolvedParams.address, searchParams]);

  const handleStripePayment = async () => {
    if (!selectedPackage) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          recipientAddress: address,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment session');
      }

      const { url } = await response.json();

      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url;
      }
    } catch (err) {
      setError(createPaymentError(
        'Unable to create payment session. Please try again.'
      ));
      setIsProcessing(false);
    }
  };


  if (error && !address) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <ErrorDisplay
          error={error}
          onDismiss={() => router.push('/')}
        />
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <Image
              src="/images/abyss-logo.png"
              alt="Abyss Logo"
              width={100}
              height={100}
              className="mx-auto"
            />
          </div>
          <h1 className="font-[family-name:var(--font-ramagothic)] text-primary text-4xl md:text-6xl mb-8">
            Success!
          </h1>
          <p className="font-[family-name:var(--font-press-start)] text-foreground text-sm mb-8">
            Your payment was successful. CHIP tokens will be minted to your address shortly.
          </p>
          <p className="font-[family-name:var(--font-press-start)] text-foreground text-xs mb-8 opacity-75">
            Address: {address.slice(0, 10)}...{address.slice(-8)}
          </p>
          <button
            onClick={() => setShowSuccess(false)}
            className="font-[family-name:var(--font-press-start)] text-primary text-sm underline"
          >
            Buy More Chips
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background p-4 md:p-8"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <Image
              src="/images/abyss-logo.png"
              alt="Abyss Logo"
              width={80}
              height={80}
              className="mx-auto"
            />
          </div>
          <h1 className="font-[family-name:var(--font-ramagothic)] text-primary text-4xl md:text-6xl mb-4">
            BUY CHIPS
          </h1>
          <p className="font-[family-name:var(--font-press-start)] text-foreground text-xs opacity-75">
            Sending to: {address.slice(0, 10)}...{address.slice(-8)}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8">
            <ErrorDisplay
              error={error}
              onRetry={error.retryable ? () => setError(null) : undefined}
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {/* Package Selection */}
        <div className="mb-12">
          <PackageSelector
            selectedPackage={selectedPackage}
            onSelect={setSelectedPackage}
            disabled={isProcessing}
          />
        </div>

        {/* Payment Button */}
        <div className="flex justify-center">
          <PixelButton
            onClick={handleStripePayment}
            disabled={!selectedPackage || isProcessing}
            loading={isProcessing}
            variant="primary"
            className="text-lg px-12 py-6"
          >
            Purchase Now
          </PixelButton>
        </div>
        {!selectedPackage && (
          <p className="font-[family-name:var(--font-press-start)] text-foreground text-xs text-center mt-6 opacity-50">
            Please select a package first
          </p>
        )}
      </div>
    </div>
  );
}
