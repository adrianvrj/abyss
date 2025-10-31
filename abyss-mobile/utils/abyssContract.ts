import { AegisSDK } from '@cavos/aegis';
import { aegisConfig } from './aegisConfig';
import { ABYSS_CONTRACT_ADDRESS } from './constants';
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

export async function newSession(playerAddress: string, account: AegisSDK, isCompetitive: boolean) {
    try {
        const tx = await account.execute(
            ABYSS_CONTRACT_ADDRESS,
            'create_session',
            [
                account.address,
                isCompetitive ? 1 : 0,
            ]
        );

        return tx.transactionHash;
    } catch (error) {
        console.error('Failed to create session:', error);
        throw error;
    }
}

export async function getSessionData(sessionId: number) {
    await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
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
    await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
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

export async function spin(sessionId: number, score: number) {
    try {
        await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);

        const tx = await aegis.execute(
            ABYSS_CONTRACT_ADDRESS,
            'update_session_score',
            [
                sessionId,
                score,
            ],
        );

        return tx.transactionHash;
    } catch (error) {
        console.error('Contract spin error:', error);
        throw error;
    }
}

export async function endSession(sessionId: number) {
    try {
        await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
        const tx = await aegis.execute(
            ABYSS_CONTRACT_ADDRESS,
            'end_session',
            [sessionId],
        );
    }
    catch (error) {
        console.error('Failed to end session:', error);
        throw error;
    }
}

export async function getLeaderboard() {
    await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
    const data = await aegis.call(
        ABYSS_CONTRACT_ADDRESS,
        'get_leaderboard',
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
    await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
    const data = await aegis.call(
        ABYSS_CONTRACT_ADDRESS,
        'get_session_market',
        [sessionId],
        ABYSS_CONTRACT_ABI
    );
    console.log(data);
    return data as SessionMarket;
}

/**
 * Get all items owned by a session
 * Returns array of PlayerItem with item_id and quantity
 */
export async function getSessionItems(sessionId: number): Promise<PlayerItem[]> {
    await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
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
    await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
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
        return tx.transactionHash;
    } catch (error) {
        console.error('Failed to sell item:', error);
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
    await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
    const data = await aegis.call(
        ABYSS_CONTRACT_ADDRESS,
        'get_session_inventory_count',
        [sessionId],
        ABYSS_CONTRACT_ABI
    );
    return data as number;
}