import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionMarket, ContractItem } from './abyssContract';

interface CachedMarket {
  sessionId: number;
  marketData: SessionMarket;
  marketItems: ContractItem[];
  purchasedSlots: number[];
  timestamp: number;
}

const MARKET_CACHE_KEY = 'market_cache_';

/**
 * Save market data to cache
 */
export async function saveMarketCache(
  sessionId: number,
  marketData: SessionMarket,
  marketItems: ContractItem[],
  purchasedSlots: Set<number>
): Promise<void> {
  try {
    // Convert BigInt values to numbers for JSON serialization
    const serializableMarketData = {
      refresh_count: Number(marketData.refresh_count),
      item_slot_1: Number(marketData.item_slot_1),
      item_slot_2: Number(marketData.item_slot_2),
      item_slot_3: Number(marketData.item_slot_3),
      item_slot_4: Number(marketData.item_slot_4),
      item_slot_5: Number(marketData.item_slot_5),
      item_slot_6: Number(marketData.item_slot_6),
    };

    const cache: CachedMarket = {
      sessionId,
      marketData: serializableMarketData,
      marketItems,
      purchasedSlots: Array.from(purchasedSlots),
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(
      `${MARKET_CACHE_KEY}${sessionId}`,
      JSON.stringify(cache)
    );
  } catch (error) {
    console.error('Failed to save market cache:', error);
  }
}

/**
 * Load market data from cache
 */
export async function loadMarketCache(sessionId: number): Promise<CachedMarket | null> {
  try {
    const cached = await AsyncStorage.getItem(`${MARKET_CACHE_KEY}${sessionId}`);
    if (!cached) return null;

    const data: CachedMarket = JSON.parse(cached);
    return data;
  } catch (error) {
    console.error('Failed to load market cache:', error);
    return null;
  }
}

/**
 * Clear market cache for a session (after purchase or refresh)
 */
export async function clearMarketCache(sessionId: number): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${MARKET_CACHE_KEY}${sessionId}`);
  } catch (error) {
    console.error('Failed to clear market cache:', error);
  }
}

/**
 * Update purchased slots in cache without fetching from blockchain
 */
export async function updatePurchasedSlots(
  sessionId: number,
  purchasedSlots: Set<number>
): Promise<void> {
  try {
    const cached = await loadMarketCache(sessionId);
    if (cached) {
      cached.purchasedSlots = Array.from(purchasedSlots);
      cached.timestamp = Date.now();
      await AsyncStorage.setItem(
        `${MARKET_CACHE_KEY}${sessionId}`,
        JSON.stringify(cached)
      );
    }
  } catch (error) {
    console.error('Failed to update purchased slots in cache:', error);
  }
}
