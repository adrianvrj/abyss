/**
 * Error types and utilities
 */

export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  PAYMENT = 'payment',
  WALLET = 'wallet',
  CONTRACT = 'contract',
  SERVER = 'server',
}

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  retryable: boolean;
  technicalDetails?: string;
}

export function createValidationError(message: string, details?: string): AppError {
  return {
    type: ErrorType.VALIDATION,
    message,
    userMessage: message,
    retryable: false,
    technicalDetails: details,
  };
}

export function createNetworkError(message: string, details?: string): AppError {
  return {
    type: ErrorType.NETWORK,
    message,
    userMessage: 'Connection failed. Please check your internet and try again.',
    retryable: true,
    technicalDetails: details,
  };
}

export function createPaymentError(message: string, details?: string): AppError {
  return {
    type: ErrorType.PAYMENT,
    message,
    userMessage: message,
    retryable: false,
    technicalDetails: details,
  };
}

export function createWalletError(message: string, details?: string): AppError {
  return {
    type: ErrorType.WALLET,
    message,
    userMessage: message,
    retryable: true,
    technicalDetails: details,
  };
}

export function createContractError(message: string, details?: string): AppError {
  return {
    type: ErrorType.CONTRACT,
    message,
    userMessage: 'Unable to process transaction. Please try again later.',
    retryable: true,
    technicalDetails: details,
  };
}

export function createServerError(message: string, details?: string): AppError {
  return {
    type: ErrorType.SERVER,
    message,
    userMessage: 'Server error. Please try again later.',
    retryable: true,
    technicalDetails: details,
  };
}
