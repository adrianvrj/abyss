/**
 * Validation utilities for addresses, packages, and payments
 */

import { PACKAGES } from '@/types/package';

/**
 * Validates a Starknet address format
 * Must start with 0x and be 66 characters (0x + 64 hex chars)
 */
export function validateStarknetAddress(address: string): boolean {
  if (!address) return false;

  // Must start with 0x
  if (!address.startsWith('0x')) return false;

  // Must be 66 characters (0x + 64 hex chars)
  if (address.length !== 66) return false;

  // Must contain only valid hex characters
  if (!/^0x[0-9a-fA-F]{64}$/.test(address)) return false;

  return true;
}

/**
 * Validates a package ID against known packages
 */
export function validatePackage(packageId: string): boolean {
  return packageId in PACKAGES;
}

/**
 * Validates that a payment amount matches the package price
 */
export function validatePaymentAmount(packageId: string, amountInCents: number): boolean {
  const pkg = PACKAGES[packageId];
  if (!pkg) return false;

  return pkg.priceInCents === amountInCents;
}

/**
 * Sanitizes a Starknet address (ensures lowercase with 0x prefix)
 */
export function sanitizeStarknetAddress(address: string): string {
  if (!address) return '';

  // Remove any whitespace
  let sanitized = address.trim();

  // Ensure 0x prefix
  if (!sanitized.startsWith('0x')) {
    sanitized = '0x' + sanitized;
  }

  // Convert to lowercase
  return sanitized.toLowerCase();
}
