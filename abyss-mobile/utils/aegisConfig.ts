
export const aegisConfig = {
  network: process.env.EXPO_PUBLIC_AEGIS_NETWORK as 'SN_SEPOLIA' | 'SN_MAINNET' || '',
  appName: "Abyss",
  appId: process.env.EXPO_PUBLIC_AEGIS_APP_ID || '',
  enableLogging: false,
  paymasterApiKey: process.env.EXPO_PUBLIC_AEGIS_PAYMASTER_API_KEY || '',
};