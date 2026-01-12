"use client";

import { useCallback, useMemo } from "react";
import { RpcProvider, CallData } from "starknet";
import { CONTRACTS, RPC_ENDPOINTS } from "@/lib/constants";
import { delay } from "@/lib/utils";
import { parseReceiptEvents, ParsedEvents } from "@/utils/gameEvents";
import { ItemEffectType, ContractItem, SessionMarket, PlayerItem, LeaderboardEntry } from "@/utils/abyssContract";

export interface SessionData {
    sessionId: number;
    playerAddress: string;
    level: number;
    score: number;
    totalScore: number;
    spinsRemaining: number;
    isCompetitive: boolean;
    isActive: boolean;
    chipsClaimed: boolean;
    equippedRelic: bigint;
    relicLastUsedSpin: number;
    relicPendingEffect: number;
    totalSpins: number; // For stale data protection
    luck: number;
    blocked666: boolean;
    tickets: number;
}

export interface SpinResult {
    sessionId: number;
    grid: number[];
    score: number;
    patternsCount: number;
    is666: boolean;
    isJackpot: boolean;
    isPending: boolean;
    bibliaUsed: boolean;
}

// Unified Hook for all Game Interactions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAbyssGame(account: any | null) {
    const provider = useMemo(() => new RpcProvider({
        nodeUrl: RPC_ENDPOINTS.SEPOLIA
    }), []);

    // -------------------------------------------------------------------------
    // HELPERS
    // -------------------------------------------------------------------------

    const waitForPreConfirmation = useCallback(async (txHash: string, retries: number = 0): Promise<any> => {
        if (retries > 300) { // Extended retries (~60s with 200ms delay)
            throw new Error("Transaction validation timed out");
        }

        try {
            // If we have an account, use its provider/waiter which might be better connected
            const waiter = account || provider;

            const receipt = await waiter.waitForTransaction(
                txHash,
                {
                    retryInterval: 100, // CHECK EVERY 200ms
                    successStates: ["PRE_CONFIRMED", "ACCEPTED_ON_L2", "ACCEPTED_ON_L1"]
                }
            );

            return receipt;
        } catch (error) {
            // console.log(`Waiting for tx ${txHash}... retry ${retries}`);
            await delay(200); // Retry faster
            return waitForPreConfirmation(txHash, retries + 1);
        }
    }, [account, provider]);

    // -------------------------------------------------------------------------
    // WRITE FUNCTIONS (Mutations)
    // -------------------------------------------------------------------------

    const createSession = useCallback(async (paymentToken: string = CONTRACTS.ETH_TOKEN): Promise<number> => {
        if (!account) throw new Error("Not connected");

        try {
            // 1. Get cost
            const amountResult = await provider.callContract({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "get_usd_cost_in_token",
                calldata: [paymentToken],
            });
            const amountLow = amountResult[0];
            const amountHigh = amountResult[1] || "0";

            // 2. Approve & Create
            const tx = await account.execute([
                {
                    contractAddress: paymentToken,
                    entrypoint: "approve",
                    calldata: [CONTRACTS.ABYSS_GAME, amountLow, amountHigh],
                },
                {
                    contractAddress: CONTRACTS.ABYSS_GAME,
                    entrypoint: "create_session",
                    calldata: [account.address, paymentToken],
                }
            ]);

            await provider.waitForTransaction(tx.transaction_hash);
            return 1;
        } catch (err) {
            console.error("Create session error:", err);
            throw err;
        }
    }, [account, provider, waitForPreConfirmation]);

    const requestSpin = useCallback(async (sessionId: number): Promise<ParsedEvents> => {
        if (!account) throw new Error("Not connected");

        try {
            const calls = [
                {
                    contractAddress: CONTRACTS.CARTRIDGE_VRF,
                    entrypoint: "request_random",
                    calldata: [CONTRACTS.ABYSS_GAME, "0", account.address],
                },
                {
                    contractAddress: CONTRACTS.ABYSS_GAME,
                    entrypoint: "request_spin",
                    calldata: [sessionId.toString()],
                },
            ];

            // Optimistic MaxFee to skip estimation roundtrip (saves ~300-500ms)
            // 0.002 ETH should be plenty for Sepolia
            const maxFee = BigInt(2000000000000000);

            const tx = await account.execute(calls, undefined, { maxFee });
            const receipt = await waitForPreConfirmation(tx.transaction_hash);

            return parseReceiptEvents(receipt);
        } catch (err) {
            console.error("Request spin error:", err);
            throw err;
        }
    }, [account, waitForPreConfirmation]);

    const buyItem = useCallback(async (sessionId: number, marketSlot: number): Promise<ParsedEvents> => {
        if (!account) throw new Error("Not connected");

        try {
            const tx = await account.execute({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: 'buy_item_from_market',
                calldata: [sessionId.toString(), marketSlot.toString()],
            });
            const receipt = await waitForPreConfirmation(tx.transaction_hash);
            return parseReceiptEvents(receipt);
        } catch (err) {
            console.error("Buy item error:", err);
            throw err;
        }
    }, [account, waitForPreConfirmation]);

    const sellItem = useCallback(async (sessionId: number, itemId: number): Promise<ParsedEvents> => {
        if (!account) throw new Error("Not connected");

        try {
            const tx = await account.execute({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: 'sell_item',
                calldata: [sessionId.toString(), itemId.toString(), '1'], // qty 1 always for now
            });
            const receipt = await waitForPreConfirmation(tx.transaction_hash);
            return parseReceiptEvents(receipt);
        } catch (err) {
            console.error("Sell item error:", err);
            throw err;
        }
    }, [account, waitForPreConfirmation]);

    const refreshMarket = useCallback(async (sessionId: number): Promise<ParsedEvents> => {
        if (!account) throw new Error("Not connected");

        try {
            const tx = await account.execute({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: 'refresh_market',
                calldata: [sessionId.toString()],
            });
            const receipt = await waitForPreConfirmation(tx.transaction_hash);
            return parseReceiptEvents(receipt);
        } catch (err) {
            console.error("Refresh market error:", err);
            throw err;
        }
    }, [account, waitForPreConfirmation]);

    const equipRelic = useCallback(async (sessionId: number, tokenId: bigint): Promise<ParsedEvents> => {
        if (!account) throw new Error("Not connected");

        const low = tokenId & ((BigInt(1) << BigInt(128)) - BigInt(1));
        const high = tokenId >> BigInt(128);

        try {
            const tx = await account.execute({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "equip_relic",
                calldata: [sessionId.toString(), low.toString(), high.toString()],
            });
            const receipt = await waitForPreConfirmation(tx.transaction_hash);
            return parseReceiptEvents(receipt);
        } catch (err) {
            console.error("Equip relic error:", err);
            throw err;
        }
    }, [account, waitForPreConfirmation]);

    const activateRelic = useCallback(async (sessionId: number): Promise<ParsedEvents> => {
        if (!account) throw new Error("Not connected");

        try {
            const tx = await account.execute({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "activate_relic",
                calldata: [sessionId.toString()],
            });
            const receipt = await waitForPreConfirmation(tx.transaction_hash);
            return parseReceiptEvents(receipt);
        } catch (err) {
            console.error("Activate relic error:", err);
            throw err;
        }
    }, [account, waitForPreConfirmation]);

    const endSession = useCallback(async (sessionId: number): Promise<void> => {
        if (!account) throw new Error("Not connected");
        try {
            const tx = await account.execute({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "end_own_session",
                calldata: [sessionId.toString()],
            });
            await waitForPreConfirmation(tx.transaction_hash);
        } catch (err) {
            console.error("End session error:", err);
            throw err;
        }
    }, [account, waitForPreConfirmation]);

    // -------------------------------------------------------------------------
    // READ FUNCTIONS
    // -------------------------------------------------------------------------

    const getSessionData = useCallback(async (sessionId: number): Promise<SessionData | null> => {
        try {
            const result = await provider.callContract({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "get_session_data",
                calldata: CallData.compile([sessionId]),
            });

            if (result && result.length >= 15) {
                const equippedRelicLow = BigInt(result[10]);
                const equippedRelicHigh = BigInt(result[11]);
                const equippedRelic = equippedRelicLow + (equippedRelicHigh << BigInt(128));

                return {
                    sessionId: Number(result[0]),
                    playerAddress: result[1].toString(),
                    level: Number(result[2]),
                    score: Number(result[3]),
                    totalScore: Number(result[4]),
                    spinsRemaining: Number(result[5]),
                    isCompetitive: Number(result[6]) === 1,
                    isActive: Number(result[7]) === 1,
                    chipsClaimed: Number(result[9]) === 1,
                    equippedRelic,
                    relicLastUsedSpin: Number(result[12]),
                    relicPendingEffect: Number(result[13]),
                    totalSpins: Number(result[14]),
                    luck: Number(result[15]),
                    blocked666: Number(result[16]) === 1,
                    tickets: Number(result[17]),
                };
            }
            return null;
        } catch (err) {
            console.error("Get session data error:", err);
            return null;
        }
    }, [provider]);

    const getLastSpinResult = useCallback(async (sessionId: number): Promise<SpinResult | null> => {
        try {
            const result = await provider.callContract({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "get_last_spin_result",
                calldata: CallData.compile([sessionId]),
            });

            if (result && result.length >= 15) {
                // Determine if there's a length prefix (Offset 1 or 2)
                const gridLength = Number(result[1]);
                let gridStart = 1;
                if (gridLength === 15) gridStart = 2;

                const grid: number[] = [];
                for (let i = 0; i < 15; i++) {
                    grid.push(Number(result[gridStart + i]));
                }

                const offset = gridStart + 15;

                return {
                    sessionId: Number(result[0]),
                    grid,
                    score: Number(result[offset]),
                    patternsCount: Number(result[offset + 1]),
                    is666: Number(result[offset + 2]) === 1,
                    isJackpot: Number(result[offset + 3]) === 1,
                    isPending: Number(result[offset + 4]) === 1,
                    bibliaUsed: Number(result[offset + 5]) === 1,
                };
            }
            return null;
        } catch (err) {
            console.error("Get spin result error:", err);
            return null;
        }
    }, [provider]);

    const getPlayerSessions = useCallback(async (address: string): Promise<number[]> => {
        try {
            const result = await provider.callContract({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "get_player_sessions",
                calldata: CallData.compile([address]),
            });

            // [len, s1, s2...]
            if (result && result.length > 0) {
                const len = Number(result[0]);
                const sessions = [];
                for (let i = 0; i < len; i++) sessions.push(Number(result[1 + i]));
                return sessions;
            }
            return [];
        } catch (err) {
            console.error("Get player sessions error:", err);
            return [];
        }
    }, [provider]);

    // Additional Helpers
    const getLevelThreshold = useCallback(async (level: number): Promise<number> => {
        try {
            const result = await provider.callContract({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "get_level_threshold",
                calldata: [level.toString()],
            });
            return Number(result[0]);
        } catch (err) { return 0; }
    }, [provider]);

    const get666Probability = useCallback(async (level: number): Promise<number> => {
        try {
            const result = await provider.callContract({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "get_666_probability",
                calldata: [level.toString()],
            });
            return Number(result[0]);
        } catch (err) { return 0; }
    }, [provider]);

    const getSessionItems = useCallback(async (sessionId: number): Promise<PlayerItem[]> => {
        try {
            const result = await provider.callContract({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "get_session_items",
                calldata: CallData.compile([sessionId]),
            });
            // Result: [len, item_id, quantity, item_id, quantity...]
            // The contract returns Array<(u32, u32)> which flattens to len, id1, qty1, id2, qty2...
            if (result && result.length > 0) {
                const len = Number(result[0]);
                const items: PlayerItem[] = [];
                let offset = 1;
                for (let i = 0; i < len; i++) {
                    items.push({
                        item_id: Number(result[offset]),
                        quantity: Number(result[offset + 1]),
                    });
                    offset += 2;
                }
                return items;
            }
            return [];
        } catch (err) {
            console.error("Get session items error:", err);
            return [];
        }
    }, [provider]);

    const getSessionMarket = useCallback(async (sessionId: number): Promise<SessionMarket | null> => {
        try {
            const result = await provider.callContract({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "get_session_market",
                calldata: CallData.compile([sessionId]),
            });
            if (result && result.length >= 7) {
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
            return null;
        } catch (err) {
            console.error("Get session market error:", err);
            return null;
        }
    }, [provider]);

    const getSessionInventoryCount = useCallback(async (sessionId: number): Promise<number> => {
        try {
            const items = await getSessionItems(sessionId);
            // Count items excluding charms (id >= 1000)
            return items.filter(i => i.item_id < 1000).length;
        } catch (err) { return 0; }
    }, [getSessionItems]);

    const isMarketSlotPurchased = useCallback(async (sessionId: number, slotId: number): Promise<boolean> => {
        try {
            const result = await provider.callContract({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "is_market_slot_purchased",
                calldata: CallData.compile([sessionId, slotId]),
            });
            return result[0] === '0x1' || result[0] === '1';
        } catch (err) { return false; }
    }, [provider]);


    return {
        // State
        provider,
        isReady: !!account,

        // Writes
        createSession,
        requestSpin,
        buyItem,
        sellItem,
        refreshMarket,
        equipRelic,
        activateRelic,
        endSession,

        // Reads
        getSessionData,
        getLastSpinResult,
        getPlayerSessions,
        getLevelThreshold,
        get666Probability,
        getSessionItems,
        getSessionMarket,
        getSessionInventoryCount,
        isMarketSlotPurchased
    };
}
