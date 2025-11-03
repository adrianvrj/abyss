'use client';

import React from 'react';

export interface PixelCardProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  hoverable?: boolean;
}

export function PixelCard({
  children,
  selected = false,
  onClick,
  className = '',
  hoverable = false,
}: PixelCardProps) {
  const baseStyles = 'bg-background border-4 p-6 transition-all duration-200';

  const selectedStyles = selected
    ? 'border-primary shadow-[4px_4px_0px_0px_rgba(255,132,28,1)]'
    : 'border-white shadow-[4px_4px_0px_0px_rgba(255,132,28,0.5)]';

  const hoverStyles = hoverable && !selected
    ? 'hover:border-primary hover:shadow-[4px_4px_0px_0px_rgba(255,132,28,0.7)] cursor-pointer'
    : '';

  const clickableStyles = onClick ? 'cursor-pointer' : '';

  return (
    <div
      onClick={onClick}
      className={`
        ${baseStyles}
        ${selectedStyles}
        ${hoverStyles}
        ${clickableStyles}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
