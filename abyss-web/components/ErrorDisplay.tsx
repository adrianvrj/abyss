'use client';

import React from 'react';
import { AppError } from '@/types/error';
import { PixelButton } from './ui/PixelButton';

export interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss: () => void;
}

export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  return (
    <div className="bg-background border-4 border-error p-6 shadow-[4px_4px_0px_0px_rgba(255,68,68,0.5)] max-w-2xl mx-auto">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 text-error text-2xl">⚠</div>
        <div className="flex-1">
          <h3 className="font-[family-name:var(--font-press-start)] text-error text-sm mb-4">
            Error
          </h3>
          <p className="font-[family-name:var(--font-press-start)] text-foreground text-xs leading-relaxed mb-6">
            {error.userMessage}
          </p>
          <div className="flex gap-4 flex-wrap">
            {error.retryable && onRetry && (
              <PixelButton onClick={onRetry} variant="primary">
                Retry
              </PixelButton>
            )}
            <PixelButton onClick={onDismiss} variant="secondary">
              Dismiss
            </PixelButton>
          </div>
        </div>
      </div>
    </div>
  );
}
