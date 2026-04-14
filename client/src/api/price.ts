import { CONTRACTS } from "@/lib/constants";

// Ekubo quoter API
const EKUBO_QUOTER_URL = "https://prod-api-quoter.ekubo.org";
// Starknet mainnet chain ID (decimal of 0x534e5f4d41494e)
const STARKNET_CHAIN_ID = "23448594291968334";
// USDC address used in the Ekubo CHIP pool
const POOL_USDC = "0x33068f6539f8e6e6b131e6b2b814e6c34a5224bc66947c47dab9dfee93b35fb";
// 1 USDC = 10^6
const ONE_USDC = "1000000";

/**
 * Fetches how many CHIP tokens you get for 1 USDC via Ekubo quoter.
 * Returns the amount as a float (e.g. 988.57 means 1 USDC = 988.57 CHIP).
 * Returns null if the quote fails.
 */
export async function fetchChipsPerUsdc(): Promise<number | null> {
  try {
    const chipToken = CONTRACTS.CHIP_TOKEN.replace(/^0x0+/, "0x");
    const url = `${EKUBO_QUOTER_URL}/${STARKNET_CHAIN_ID}/${ONE_USDC}/${POOL_USDC}/${chipToken}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const totalCalculated = data?.total_calculated;
    if (!totalCalculated) return null;

    // total_calculated is CHIP amount in 18 decimals
    return Number(BigInt(totalCalculated)) / 1e18;
  } catch {
    return null;
  }
}
