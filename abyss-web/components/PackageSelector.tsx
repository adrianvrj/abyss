'use client';

import React from 'react';
import { PackageOption, getAllPackages } from '@/types/package';
import { PixelCard } from './ui/PixelCard';

export interface PackageSelectorProps {
  selectedPackage: PackageOption | null;
  onSelect: (pkg: PackageOption) => void;
  disabled?: boolean;
}

export function PackageSelector({
  selectedPackage,
  onSelect,
  disabled = false,
}: PackageSelectorProps) {
  const packages = getAllPackages();

  return (
    <div className="w-full">
      <h2 className="font-[family-name:var(--font-ramagothic)] text-primary text-3xl md:text-4xl mb-8 text-center">
        Select Package
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <PixelCard
            key={pkg.id}
            selected={selectedPackage?.id === pkg.id}
            onClick={() => !disabled && onSelect(pkg)}
            hoverable={!disabled}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-4">
              <div className="font-[family-name:var(--font-ramagothic)] text-primary text-5xl md:text-6xl">
                {pkg.chips}
              </div>
              <div className="font-[family-name:var(--font-press-start)] text-foreground text-xs mt-2">
                CHIPS
              </div>
            </div>
            <div className="font-[family-name:var(--font-press-start)] text-primary text-2xl">
              ${pkg.price.toFixed(2)}
            </div>
            {pkg.chips === 12 && (
              <div className="mt-4 font-[family-name:var(--font-press-start)] text-xs text-primary">
                BEST VALUE
              </div>
            )}
          </PixelCard>
        ))}
      </div>
    </div>
  );
}
