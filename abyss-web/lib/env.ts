/**
 * Environment variable validation and access
 */

function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];

  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value || '';
}

export const env = {
  // Stripe
  stripeSecretKey: () => getEnvVar('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: () => getEnvVar('STRIPE_WEBHOOK_SECRET'),
  stripePublishableKey: () => getEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),

  // Starknet
  starknetRpcUrl: () => getEnvVar('STARKNET_RPC_URL'),
  chipContractAddress: () => getEnvVar('CHIP_CONTRACT_ADDRESS'),
  minterPrivateKey: () => getEnvVar('MINTER_PRIVATE_KEY'),
  minterAddress: () => getEnvVar('MINTER_ADDRESS'),

  // App
  baseUrl: () => getEnvVar('NEXT_PUBLIC_BASE_URL'),
} as const;

// Validate environment variables on server startup
// Skip validation during build phase to avoid warnings for static pages
// Validation will happen at runtime when API routes are actually called
const isBuildTime = process.env.npm_lifecycle_event === 'build' || 
                    process.argv.includes('build') ||
                    process.env.NEXT_PHASE === 'phase-production-build';

if (typeof window === 'undefined' && !isBuildTime) {
  try {
    // Only validate in production runtime or when explicitly requested
    if (process.env.NODE_ENV === 'production' || process.env.VALIDATE_ENV === 'true') {
      env.stripeSecretKey();
      env.stripeWebhookSecret();
      env.starknetRpcUrl();
      env.chipContractAddress();
      env.minterPrivateKey();
      env.minterAddress();
    }
  } catch (error) {
    console.warn('Environment validation warning:', error);
  }
}
