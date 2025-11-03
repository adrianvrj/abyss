/**
 * Payment-related types
 */

export type PaymentMethod = 'stripe' | 'wallet';
export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface PaymentLog {
  id: string;
  timestamp: number;
  paymentSource: PaymentMethod;
  paymentId: string; // Session ID or transaction hash
  recipientAddress: string;
  packageId: string;
  chipAmount: number;
  priceUSD: number;
  status: PaymentStatus;
  mintTransactionHash?: string;
  error?: string;
}

export interface PendingMint {
  idempotencyKey: string;
  recipientAddress: string;
  chipAmount: number;
  paymentSource: PaymentMethod;
  paymentId: string;
  createdAt: number;
  retryCount: number;
  lastRetryAt?: number;
  error?: string;
}

export interface MintRequest {
  idempotencyKey: string;
  recipientAddress: string;
  chipAmount: number;
  paymentSource: PaymentMethod;
  paymentId: string;
}

export interface MintResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  retryable: boolean;
}
