import { AegisSDK } from '@cavos/aegis';
import { aegisConfig } from './aegisConfig';
import { ABYSS_CONTRACT_ADDRESS, CHIP_CONTRACT_ADDRESS } from './constants';
import { ABYSS_CONTRACT_ABI } from '@/abi/abyssContract';
import { shortString } from 'starknet';

const aegis = new AegisSDK(aegisConfig);

// ═══════════════════════════════════════════════════════════════════════════
// ITEM SHOP TYPES
// ═══════════════════════════════════════════════════════════════════════════

export enum ItemEffectType {
    ScoreMultiplier = 0,
    PatternMultiplierBoost = 1,
    SymbolProbabilityBoost = 2,
    DirectScoreBonus = 3,
    SpinBonus = 4,
    LevelProgressionBonus = 5,
    SixSixSixProtection = 6,
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
}

export interface SessionMarket {
    refresh_count: number;
    item_slot_1: number;
    item_slot_2: number;
    item_slot_3: number;
    item_slot_4: number;
    item_slot_5: number;
    item_slot_6: number;
}

export interface PlayerItem {
    item_id: number;
    quantity: number;
}

export async function newSession(account: AegisSDK, isCompetitive: boolean) {
    try {
        let calls = [
            {
                contractAddress: CHIP_CONTRACT_ADDRESS,
                entrypoint: "approve",
                calldata: [
                    ABYSS_CONTRACT_ADDRESS,
                    5 * 10 ** 18,
                    0n
                ]

            },
            {
                contractAddress: ABYSS_CONTRACT_ADDRESS,
                entrypoint: 'create_session',
                calldata: [
                    account.address,
                    isCompetitive ? 1 : 0,
                ]
            },
        ]
        const tx = await account.executeBatch(calls);
        await aegis.waitForTransaction(tx.transactionHash);
        return tx.transactionHash;
    } catch (error) {
        console.error('Failed to create session:', error);
        throw error;
    }
}

export async function getSessionData(sessionId: number) {
    // Admin PK removed. View functions should not need admin rights.
    // If they do (e.g. for access control), they should be moved to server or made public.
    // Assuming getSessionData is public view.
    // await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true); 

    const data = await aegis.call(
        ABYSS_CONTRACT_ADDRESS,
        'get_session_data',
        [
            sessionId,
        ],
        ABYSS_CONTRACT_ABI
    )
    return data;
}

export async function getPlayerSessions(playerAddress: string, isCompetitive: boolean) {
    // await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
    let data: any = [];
    if (isCompetitive) {
        const data = await aegis.call(
            ABYSS_CONTRACT_ADDRESS,
            'get_player_competitive_sessions',
            [
                playerAddress,
            ],
            ABYSS_CONTRACT_ABI
        )
        return data;
    }
    else {
        const data = await aegis.call(
            ABYSS_CONTRACT_ADDRESS,
            'get_player_casual_sessions',
            [
                playerAddress,
            ],
            ABYSS_CONTRACT_ABI
        )
        return data;
    }
}

// Direct spin and endSession are now handled by the server
// to ensure game integrity. Do not re-enable client-side signing for these.

export async function spin(sessionId: number, score: number) {
    console.warn("Client-side spin is deprecated. Use server API.");
    return "";
}

export async function endSession(sessionId: number) {
    console.warn("Client-side endSession is deprecated. Use server API.");
    return "";
}

export async function getLeaderboard() {
    // await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
    const data = await aegis.call(
        ABYSS_CONTRACT_ADDRESS,
        'get_leaderboard',
        [],
        ABYSS_CONTRACT_ABI
    )
    return data;
}

export async function getPrizePool() {
    // await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
    const data = await aegis.call(
        ABYSS_CONTRACT_ADDRESS,
        'get_prize_pool',
        [],
        ABYSS_CONTRACT_ABI
    )
    return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// ITEM SHOP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the current market state for a session
 * Returns 6 item IDs available in the market and refresh count
 */
export async function getSessionMarket(sessionId: number): Promise<SessionMarket> {
    // await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
    const data = await aegis.call(
        ABYSS_CONTRACT_ADDRESS,
        'get_session_market',
        [sessionId],
        ABYSS_CONTRACT_ABI
    );
    return data as SessionMarket;
}

/**
 * Get all items owned by a session
 * Returns array of PlayerItem with item_id and quantity
 */
export async function getSessionItems(sessionId: number): Promise<PlayerItem[]> {
    // await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
    const data = await aegis.call(
        ABYSS_CONTRACT_ADDRESS,
        'get_session_items',
        [sessionId],
        ABYSS_CONTRACT_ABI
    );
    return data as PlayerItem[];
}

/**
 * Get detailed information about a specific item
 * Returns item properties including name, description, price, effects
 */
export async function getItemInfo(itemId: number): Promise<ContractItem> {
    // await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
    const data: any = await aegis.call(
        ABYSS_CONTRACT_ADDRESS,
        'get_item_info',
        [itemId],
        ABYSS_CONTRACT_ABI
    );

    // Helper to decode felt252 to string
    const decodeString = (felt: any): string => {
        try {
            if (felt === 0n || felt === 0 || !felt) return '';
            return shortString.decodeShortString(felt.toString());
        } catch (e) {
            console.warn('Failed to decode felt252:', felt);
            return '';
        }
    };

    // Convert BigInt values to Number and decode felt252 strings
    const item = {
        item_id: Number(data.item_id),
        name: decodeString(data.name),
        description: decodeString(data.description),
        price: Number(data.price),
        sell_price: Number(data.sell_price),
        effect_type: Number(data.effect_type) as ItemEffectType,
        effect_value: Number(data.effect_value),
        target_symbol: decodeString(data.target_symbol),
    };

    return item;
}

/**
 * Buy an item from the market for a session
 * @param sessionId - The session ID
 * @param marketSlot - Market slot (0-5) to purchase from
 * @returns Transaction hash
 */
export async function buyItemFromMarket(sessionId: number, marketSlot: number, account: AegisSDK): Promise<string> {
    try {
        const tx = await account.execute(
            ABYSS_CONTRACT_ADDRESS,
            'buy_item_from_market',
            [sessionId, marketSlot]
        );
        await aegis.waitForTransaction(tx.transactionHash);
        return tx.transactionHash;
    } catch (error) {
        console.error('Failed to buy item:', error);
        throw error;
    }
}

/**
 * Sell an item from session inventory
 * @param sessionId - The session ID
 * @param itemId - The item ID to sell
 * @param quantity - Quantity to sell (typically 1)
 * @returns Transaction hash
 */
export async function sellItem(sessionId: number, itemId: number, quantity: number, account: AegisSDK): Promise<string> {
    try {
        const tx = await account.execute(
            ABYSS_CONTRACT_ADDRESS,
            'sell_item',
            [sessionId, itemId, quantity]
        );
        await aegis.waitForTransaction(tx.transactionHash);
        return tx.transactionHash;
    } catch (error) {
        console.error('Failed to sell item:', error);
        throw error;
    }
}

/**
 * Consume an item (remove from inventory without getting score back)
 * Used for consumable items like Biblia
 * @param sessionId - The session ID
 * @param itemId - The item ID to consume
 * @param quantity - The quantity to consume (always 1 for now)
 * @param account - The user's Aegis account
 * @returns Transaction hash
 */
export async function consumeItem(sessionId: number, itemId: number, quantity: number, account: AegisSDK): Promise<string> {
    try {
        const tx = await account.execute(
            ABYSS_CONTRACT_ADDRESS,
            'consume_item',
            [sessionId, itemId, quantity]
        );
        await aegis.waitForTransaction(tx.transactionHash);
        return tx.transactionHash;
    } catch (error) {
        console.error('Failed to consume item:', error);
        throw error;
    }
}

/**
 * Refresh the market items for a session
 * Costs increase with each refresh
 * @param sessionId - The session ID
 * @param account - The user's Aegis account
 * @returns Transaction hash
 */
export async function refreshMarket(sessionId: number, account: AegisSDK): Promise<string> {
    try {
        const tx = await account.execute(
            ABYSS_CONTRACT_ADDRESS,
            'refresh_market',
            [sessionId]
        );
        await aegis.waitForTransaction(tx.transactionHash);
        return tx.transactionHash;
    } catch (error) {
        console.error('Failed to refresh market:', error);
        throw error;
    }
}

/**
 * Get the total inventory count for a session
 * @param sessionId - The session ID
 * @returns Number of unique items owned (0-6)
 */
export async function getSessionInventoryCount(sessionId: number): Promise<number> {
    // await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
    const data = await aegis.call(
        ABYSS_CONTRACT_ADDRESS,
        'get_session_inventory_count',
        [sessionId],
        ABYSS_CONTRACT_ABI
    );
    return data as number;
}

/**
 * Check if a market slot has been purchased in the current market
 * @param sessionId - The session ID
 * @param marketSlot - The market slot (1-6)
 * @returns true if the slot has been purchased, false otherwise
 */
export async function isMarketSlotPurchased(sessionId: number, marketSlot: number): Promise<boolean> {
    // await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
    const data = await aegis.call(
        ABYSS_CONTRACT_ADDRESS,
        'is_market_slot_purchased',
        [sessionId, marketSlot],
        ABYSS_CONTRACT_ABI
    );

    // Cairo/Starknet returns values as arrays
    // Extract the first element and check if it's not "0x0"
    const value = Array.isArray(data) ? data[0] : data;
    const isTrue = value !== '0x0' && value !== 0 && value !== '0';

    return isTrue;
}

/**
 * Get 666 probability based on level
 * Returns probability * 10 (e.g., 6 = 0.6%, 12 = 1.2%)
 * @param level - Current level
 * @returns Probability value (multiply by 0.1 to get percentage)
 */
export async function get666Probability(level: number): Promise<number> {
    // await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
    const data = await aegis.call(
        ABYSS_CONTRACT_ADDRESS,
        'get_666_probability',
        [level],
        ABYSS_CONTRACT_ABI
    );
    return Number(data);
}