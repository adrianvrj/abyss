import { RpcProvider, Contract, Call, shortString, TransactionExecutionStatus } from 'starknet';
import { CONTRACTS, RPC_ENDPOINTS } from '@/lib/constants';

// RPC Provider
const provider = new RpcProvider({
    nodeUrl: RPC_ENDPOINTS.SEPOLIA // Default to Sepolia for now as per useGameContract
});

// Helper for hex
const toHex = (value: number | bigint | string): string => {
    if (typeof value === 'string') {
        return value.startsWith('0x') ? value : `0x${BigInt(value).toString(16)}`;
    }
    return `0x${BigInt(value).toString(16)}`;
};

const waitForPreConfirmation: any = async (txHash: string) => {
    const receipt = await provider.waitForTransaction(txHash, {
        successStates: [
            "PRE_CONFIRMED", "ACCEPTED_ON_L2", "ACCEPTED_ON_L1"
        ],
        retryInterval: 270,
    });
    return receipt;
};

// Types
export enum ItemEffectType {
    ScoreMultiplier = 0,
    PatternMultiplierBoost = 1,
    SymbolProbabilityBoost = 2,
    DirectScoreBonus = 3,
    SpinBonus = 4,
    LevelProgressionBonus = 5,
    SixSixSixProtection = 6,
    CharmEffect = 7,
}

export interface ContractItem {
    item_id: number;
    name: string;
    description: string;
    price: number;
    sell_price: number;
    effect_type: ItemEffectType;
    effect_value: number;
    target_symbol: string;
    image?: string;
}

// Soul Charm types
export interface CharmInfo {
    charm_id: number;
    name: string;
    description: string;
    rarity: string;
    effect: string;
    luck: number;
    shop_cost: number;
    image: string;
    background_color: string;
}

// Check if an item_id represents a charm (>= 1000)
export function isCharmItem(itemId: number): boolean {
    return itemId >= 1000;
}

// Get charm_id from item_id
export function getCharmIdFromItemId(itemId: number): number {
    return itemId - 1000;
}

// Cache to prevent repetitive RPC calls
const charmInfoCache = new Map<number, CharmInfo>();

// Fetch charm info from API
export async function getCharmInfo(charmId: number): Promise<CharmInfo | null> {
    if (charmInfoCache.has(charmId)) {
        return charmInfoCache.get(charmId)!;
    }

    try {
        const response = await fetch(`/api/charms/${charmId}`);
        if (!response.ok) return null;

        const data = await response.json();

        // Extract fields from OpenSea attributes format
        const getAttribute = (trait: string) =>
            data.attributes?.find((a: any) => a.trait_type === trait)?.value;

        const info: CharmInfo = {
            charm_id: Number(getAttribute('Charm ID') || charmId),
            name: data.name,
            description: data.description,
            rarity: getAttribute('Rarity') || 'Common',
            effect: getAttribute('Effect') || '',
            luck: Number(getAttribute('Luck Value') || 0),
            shop_cost: Number(getAttribute('Shop Cost') || 0),
            image: data.image,
            background_color: data.background_color ? `#${data.background_color}` : ''
        };

        charmInfoCache.set(charmId, info);
        return info;
    } catch (e) {
        console.error('Failed to fetch charm info:', e);
        return null;
    }
}

export interface SessionMarket {
    refresh_count: number;
    item_slot_1: number;
    item_slot_2: number;
    item_slot_3: number;
    item_slot_4: number;
    item_slot_5: number;
    item_slot_6: number;
    relicPendingEffect?: number;
}

export interface PlayerItem {
    item_id: number;
    quantity: number;
}

// Contract interaction functions

// Using raw calls since we don't have the full ABI file yet and minimal ABI might miss types if not precise.
// But we can try to use `provider.callContract` and parse results manually like `useGameContract`.

export async function getSessionMarket(sessionId: number): Promise<SessionMarket> {
    const result = await provider.callContract({
        contractAddress: CONTRACTS.ABYSS_GAME,
        entrypoint: 'get_session_market',
        calldata: [toHex(sessionId)]
    });

    // Result is [refresh_count, slot1, slot2, slot3, slot4, slot5, slot6]
    return {
        refresh_count: Number(result[0]),
        item_slot_1: Number(result[1]),
        item_slot_2: Number(result[2]),
        item_slot_3: Number(result[3]),
        item_slot_4: Number(result[4]),
        item_slot_5: Number(result[5]),
        item_slot_6: Number(result[6]),
    };
}

export async function getSessionItems(sessionId: number): Promise<PlayerItem[]> {
    const result = await provider.callContract({
        contractAddress: CONTRACTS.ABYSS_GAME,
        entrypoint: 'get_session_items',
        calldata: [toHex(sessionId)]
    });

    // Result is [len, item1_id, item1_qty, item2_id, item2_qty, ...]
    const len = Number(result[0]);
    const items: PlayerItem[] = [];
    for (let i = 0; i < len; i++) {
        items.push({
            item_id: Number(result[1 + i * 2]),
            quantity: Number(result[1 + i * 2 + 1])
        });
    }
    return items;
}

// Cache to prevent repetitive RPC calls
const itemInfoCache = new Map<number, ContractItem>();

export async function getItemInfo(itemId: number): Promise<ContractItem> {
    if (itemInfoCache.has(itemId)) {
        return itemInfoCache.get(itemId)!;
    }

    const result = await provider.callContract({
        contractAddress: CONTRACTS.ABYSS_GAME,
        entrypoint: 'get_item_info',
        calldata: [toHex(itemId)]
    });

    const item: ContractItem = {
        item_id: Number(result[0]),
        name: decodeString(result[1]),
        description: decodeString(result[2]),
        price: Number(result[3]),
        sell_price: Number(result[4]),
        effect_type: Number(result[5]) as ItemEffectType,
        effect_value: Number(result[6]),
        target_symbol: decodeString(result[7]),
    };

    itemInfoCache.set(itemId, item);
    return item;
}

function decodeString(felt: string): string {
    if (!felt) return '';
    try {
        if (felt.startsWith('0x')) {
            return shortString.decodeShortString(felt);
        }
        return shortString.decodeShortString(BigInt(felt).toString(16));
    } catch (e) {
        console.warn('Failed to decode felt:', felt);
        return '';
    }
}

export async function isMarketSlotPurchased(sessionId: number, marketSlot: number): Promise<boolean> {
    const result = await provider.callContract({
        contractAddress: CONTRACTS.ABYSS_GAME,
        entrypoint: 'is_market_slot_purchased',
        calldata: [toHex(sessionId), toHex(marketSlot)]
    });
    return Number(result[0]) !== 0;
}

export async function getSessionLuck(sessionId: number): Promise<number> {
    try {
        const result = await provider.callContract({
            contractAddress: CONTRACTS.ABYSS_GAME,
            entrypoint: 'get_session_luck',
            calldata: [toHex(sessionId)]
        });
        return Number(result[0]);
    } catch (e) {
        console.warn('Failed to get session luck:', e);
        return 0;
    }
}

export async function getCharmDropChance(sessionId: number): Promise<number> {
    try {
        const result = await provider.callContract({
            contractAddress: CONTRACTS.ABYSS_GAME,
            entrypoint: 'get_charm_drop_chance',
            calldata: [toHex(sessionId)]
        });
        return Number(result[0]);
    } catch (e) {
        console.warn('Failed to get charm drop chance:', e);
        return 0;
    }
}

export async function getSessionInventoryCount(sessionId: number): Promise<number> {
    const result = await provider.callContract({
        contractAddress: CONTRACTS.ABYSS_GAME,
        entrypoint: 'get_session_inventory_count',
        calldata: [toHex(sessionId)]
    });
    return Number(result[0]);
}

export async function buyItemFromMarket(sessionId: number, marketSlot: number, executor: any): Promise<string> {
    const call = {
        contractAddress: CONTRACTS.ABYSS_GAME,
        entrypoint: 'buy_item_from_market',
        calldata: [sessionId, marketSlot],
    };

    const res = await (executor.execute ? executor.execute(call) : executor(call));
    await waitForPreConfirmation(res.transaction_hash);
    return res.transaction_hash;
}

export async function sellItem(sessionId: number, itemId: number, quantity: number, executor: any): Promise<string> {
    const call = {
        contractAddress: CONTRACTS.ABYSS_GAME,
        entrypoint: 'sell_item',
        calldata: [sessionId, itemId, quantity],
    };
    const res = await (executor.execute ? executor.execute(call) : executor(call));
    await waitForPreConfirmation(res.transaction_hash);
    return res.transaction_hash;
}

export async function refreshMarket(sessionId: number, executor: any): Promise<string> {
    const call = {
        contractAddress: CONTRACTS.ABYSS_GAME,
        entrypoint: 'refresh_market',
        calldata: [sessionId],
    };
    const res = await (executor.execute ? executor.execute(call) : executor(call));
    const receipt = await waitForPreConfirmation(res.transaction_hash);
    console.log("Receipt:", receipt);
    return res.transaction_hash;
}

// Leaderboard Types and Functions
export interface LeaderboardEntry {
    player_address: string;
    session_id: number;
    level: number;
    total_score: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
        const result = await provider.callContract({
            contractAddress: CONTRACTS.ABYSS_GAME,
            entrypoint: 'get_leaderboard',
            calldata: [],
        });

        // First element is array length
        const len = Number(result[0]);
        const entries: LeaderboardEntry[] = [];

        // Each LeaderboardEntry has 4 fields
        for (let i = 0; i < len; i++) {
            const offset = 1 + i * 4;
            entries.push({
                player_address: toHex(result[offset]),
                session_id: Number(result[offset + 1]),
                level: Number(result[offset + 2]),
                total_score: Number(result[offset + 3]),
            });
        }

        return entries;
    } catch (err) {
        console.error('Failed to get leaderboard:', err);
        return [];
    }
}

export async function getPrizePool(): Promise<bigint> {
    try {
        const result = await provider.callContract({
            contractAddress: CONTRACTS.ABYSS_GAME,
            entrypoint: 'get_prize_pool',
            calldata: [],
        });

        // u256 returns as [low, high]
        return BigInt(result[0]);
    } catch (err) {
        console.error('Failed to get prize pool:', err);
        return BigInt(0);
    }
}

export interface TokenBalance {
    tokenAddress: string;
    balance: bigint;
    symbol: string;
}

export async function getPrizeTokenBalances(): Promise<TokenBalance[]> {
    try {
        const result = await provider.callContract({
            contractAddress: CONTRACTS.ABYSS_GAME,
            entrypoint: 'get_prize_token_balances',
            calldata: [],
        });

        // Result format: [length, token1_addr, token1_balance_low, token1_balance_high, token2_addr, ...]
        const length = Number(result[0]);
        const balances: TokenBalance[] = [];

        for (let i = 0; i < length; i++) {
            const offset = 1 + i * 3; // Each entry has: address, balance_low, balance_high
            const tokenAddress = toHex(result[offset]);
            const balanceLow = BigInt(result[offset + 1]);
            const balanceHigh = BigInt(result[offset + 2]);
            const balance = balanceLow + (balanceHigh << BigInt(128));

            // Fetch symbol from ERC20 contract
            let symbol = 'TOKEN';
            try {
                const symbolResult = await provider.callContract({
                    contractAddress: tokenAddress,
                    entrypoint: 'symbol',
                    calldata: [],
                });
                symbol = feltToString(symbolResult[0]);
            } catch {
                // Keep default symbol if fetch fails
            }

            balances.push({
                tokenAddress,
                balance,
                symbol,
            });
        }

        return balances;
    } catch (err) {
        console.error('Failed to get prize token balances:', err);
        return [];
    }
}

// Helper to convert felt252 to string
function feltToString(felt: string | bigint): string {
    const hex = typeof felt === 'string' && felt.startsWith('0x')
        ? felt.slice(2)
        : BigInt(felt).toString(16);
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        const charCode = parseInt(hex.substr(i, 2), 16);
        if (charCode > 0) str += String.fromCharCode(charCode);
    }
    return str || 'TOKEN';
}

// === CHIP MONETIZATION ===

export async function getAvailableBeastSessions(playerAddress: string): Promise<number> {
    try {
        const result = await provider.callContract({
            contractAddress: CONTRACTS.ABYSS_GAME,
            entrypoint: 'get_available_beast_sessions',
            calldata: [playerAddress],
        });
        return Number(result[0]);
    } catch (err) {
        console.error('Failed to get beast sessions:', err);
        return 0;
    }
}

export async function getChipsToClaim(sessionId: number): Promise<bigint> {
    try {
        const result = await provider.callContract({
            contractAddress: CONTRACTS.ABYSS_GAME,
            entrypoint: 'get_chips_to_claim',
            calldata: [sessionId],
        });
        // u256 returns as [low, high]
        return BigInt(result[0]);
    } catch (err) {
        console.error('Failed to get chips to claim:', err);
        return BigInt(0);
    }
}

export async function claimChips(sessionId: number, executor: any): Promise<any> {
    const call = {
        contractAddress: CONTRACTS.ABYSS_GAME,
        entrypoint: 'claim_chips',
        calldata: [sessionId],
    };
    const res = await (executor.execute ? executor.execute(call) : executor(call));
    const receipt = await provider.waitForTransaction(res.transaction_hash);
    return receipt;
}
