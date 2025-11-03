/**
 * Package option types and constants
 */

export interface PackageOption {
  id: 'starter' | 'standard' | 'premium';
  chips: number;
  price: number;
  priceInCents: number;
}

export const PACKAGES: Record<string, PackageOption> = {
  starter: {
    id: 'starter',
    chips: 5,
    price: 2.50,
    priceInCents: 250,
  },
  standard: {
    id: 'standard',
    chips: 12,
    price: 10.00,
    priceInCents: 1000,
  },
  premium: {
    id: 'premium',
    chips: 40,
    price: 20.00,
    priceInCents: 2000,
  },
} as const;

export function getPackageById(id: string): PackageOption | null {
  return PACKAGES[id] || null;
}

export function getPackageByChipAmount(chips: number): PackageOption | null {
  return Object.values(PACKAGES).find(pkg => pkg.chips === chips) || null;
}

export function getAllPackages(): PackageOption[] {
  return Object.values(PACKAGES);
}
