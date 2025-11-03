'use client';

import React from 'react';

export interface PixelButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export function PixelButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  type = 'button',
  className = '',
}: PixelButtonProps) {
  const baseStyles = 'font-[family-name:var(--font-press-start)] border-4 px-8 py-4 cursor-pointer transition-all duration-100 text-sm';

  const variantStyles = {
    primary: 'bg-primary text-white border-white hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px]',
    secondary: 'bg-background text-primary border-primary hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px]',
  };

  const disabledStyles = 'opacity-50 cursor-not-allowed hover:translate-x-0 hover:translate-y-0 active:translate-x-0 active:translate-y-0';

  const shadowStyles = variant === 'primary'
    ? 'shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.5)] active:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]'
    : 'shadow-[4px_4px_0px_0px_rgba(255,132,28,0.5)] hover:shadow-[6px_6px_0px_0px_rgba(255,132,28,0.7)] active:shadow-[2px_2px_0px_0px_rgba(255,132,28,0.5)]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${disabled || loading ? disabledStyles : shadowStyles}
        ${className}
      `}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
