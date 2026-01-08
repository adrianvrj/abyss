"use client";

import { useCallback, useMemo } from "react";
import { CallData, RpcProvider, TransactionExecutionStatus, TransactionFinalityStatus } from "starknet";
import { CONTRACTS, RPC_ENDPOINTS } from "@/lib/constants";

export interface SessionData {
    sessionId: number;
    playerAddress: string;
    level: number;
    score: number;
    totalScore: number;
    spinsRemaining: number;
    isCompetitive: boolean;
    isActive: boolean;
    // Relic fields
    equippedRelic: bigint;
    relicLastUsedSpin: number;
    relicPendingEffect: number;
    totalSpins: number;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useGameContract(account: any | null) {
    const provider = useMemo(() => new RpcProvider({
        nodeUrl: RPC_ENDPOINTS.SEPOLIA
    }), []);

    // Helper for pre-confirmations (~0.5s vs 2-5s for full L2)
    // Includes a small delay after confirmation to allow RPC state propagation
    const waitForPreConfirmation = useCallback(async (txHash: string) => {
        await provider.waitForTransaction(txHash, {
            successStates: [
                TransactionExecutionStatus.SUCCEEDED
            ],
            retryInterval: 250,
        });
        await new Promise(resolve => setTimeout(resolve, 1200));
    }, [provider]);

    const createSession = useCallback(async (paymentToken: string = CONTRACTS.ETH_TOKEN): Promise<number | null> => {
        if (!account) return null;

        try {
            // First, get exact amount needed for $1 USD in the selected token
            const amountResult = await provider.callContract({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "get_usd_cost_in_token",
                calldata: [paymentToken],
            });

            // Result is u256 [low, high]
            const amountLow = amountResult[0];
            const amountHigh = amountResult[1] || "0";
            const tx = await account.execute([
                {
                    contractAddress: paymentToken,
                    entrypoint: "approve",
                    // Approve exact amount needed
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
    }, [account, provider]);

    const requestSpin = useCallback(async (sessionId: number): Promise<void> => {
        if (!account) throw new Error("Not connected");

        try {
            // Cartridge VRF requires multicall: request_random first, then game call
            const tx = await account.execute([
                // First: Request random from Cartridge VRF provider
                {
                    contractAddress: CONTRACTS.CARTRIDGE_VRF,
                    entrypoint: "request_random",
                    calldata: [
                        CONTRACTS.ABYSS_GAME, // caller (game contract)
                        "0", // Source::Nonce variant
                        account.address, // nonce address
                    ],
                },
                // Then: Spin (which calls consume_random internally)
                {
                    contractAddress: CONTRACTS.ABYSS_GAME,
                    entrypoint: "request_spin",
                    calldata: [sessionId.toString()],
                },
            ]);
            await waitForPreConfirmation(tx.transaction_hash);
        } catch (err) {
            console.error("Request spin error:", err);
            throw err;
        }
    }, [account, provider]);

    const getSessionData = useCallback(async (sessionId: number): Promise<SessionData | null> => {
        try {
            const result = await provider.callContract({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "get_session_data",
                calldata: CallData.compile([sessionId]),
            });

            // Parse result array - GameSession struct
            // Fields: session_id(0), player_address(1), level(2), score(3), total_score(4), 
            //         spins_remaining(5), is_competitive(6), is_active(7), created_at(8), 
            //         chips_claimed(9), equipped_relic u256(10-11), relic_last_used_spin(12), 
            //         relic_pending_effect(13), total_spins(14)
            if (result && result.length >= 15) {
                // equipped_relic is u256 at indices 10-11 (low, high)
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
                    // Relic fields (offset by 1 due to created_at at index 8)
                    equippedRelic,
                    relicLastUsedSpin: Number(result[12]),
                    relicPendingEffect: Number(result[13]),
                    totalSpins: Number(result[14]),
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

            // Parse result - SpinResult struct.
            // Starknet arrays/spans are usually serialized as [len, item1, item2...]
            // We need to check if result[1] is the length (15) or the first grid item.
            // If result[1] == 15, we have a length prefix (Offset 2).
            // If result[1] <= 6 (valid symbol), we assume no length prefix (Offset 1).

            if (result && result.length >= 21) {
                let gridStart = 1;

                // Detection: result[1] is likely length if it equals 15.
                // Symbols are 1-6. 15 cannot be a symbol.
                if (Number(result[1]) === 15) {
                    gridStart = 2;
                }

                // Extract grid
                const grid: number[] = [];
                for (let i = 0; i < 15; i++) {
                    grid.push(Number(result[gridStart + i]));
                }
                const hasValidGrid = grid.some((val: number) => val > 0 && val <= 6);
                if (!hasValidGrid) {
                    return null;
                }

                const scoreIndex = gridStart + 15;
                const patternsIndex = gridStart + 16;
                const is666Index = gridStart + 17;
                const isJackpotIndex = gridStart + 18;
                const isPendingIndex = gridStart + 19;
                const bibliaUsedIndex = gridStart + 20;

                return {
                    sessionId: Number(result[0]),
                    grid,
                    score: Number(result[scoreIndex]),
                    patternsCount: Number(result[patternsIndex]),
                    is666: Number(result[is666Index]) === 1,
                    isJackpot: Number(result[isJackpotIndex]) === 1,
                    isPending: Number(result[isPendingIndex]) === 1,
                    bibliaUsed: Number(result[bibliaUsedIndex]) === 1,
                };
            }
            return null;
        } catch (err) {
            console.error("Get spin result error:", err);
            return null;
        }
    }, [provider]);

    const endSession = useCallback(async (sessionId: number): Promise<void> => {
        if (!account) throw new Error("Not connected");

        try {
            const calldata = CallData.compile([sessionId]);
            const tx = await account.execute({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "end_own_session",
                calldata: calldata,
            });
            await waitForPreConfirmation(tx.transaction_hash);
        } catch (err) {
            console.error("End session error:", err);
            throw err;
        }
    }, [account, provider]);

    const getPlayerSessions = useCallback(async (): Promise<number[]> => {
        if (!account) return [];

        try {
            const result = await provider.callContract({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "get_player_sessions",
                calldata: CallData.compile([account.address]),
            });

            // Result is [len, id1, id2, ...]
            if (result && result.length > 0) {
                const len = Number(result[0]);
                const sessionIds: number[] = [];
                for (let i = 0; i < len; i++) {
                    sessionIds.push(Number(result[1 + i]));
                }
                return sessionIds;
            }
            return [];
        } catch (err) {
            console.error("Get player sessions error:", err);
            return [];
        }
    }, [account, provider]);



    const getLevelThreshold = useCallback(async (level: number): Promise<number> => {
        try {
            const result = await provider.callContract({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "get_level_threshold",
                calldata: CallData.compile([level]),
            });
            return result && result[0] ? Number(result[0]) : 0;
        } catch (err) {
            console.error("Get threshold error:", err);
            return 0;
        }
    }, [provider]);

    const get666Probability = useCallback(async (level: number): Promise<number> => {
        try {
            const result = await provider.callContract({
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "get_666_probability",
                calldata: CallData.compile([level]),
            });
            // Returns prob * 10 (e.g. 15 = 1.5%)
            return result && result[0] ? Number(result[0]) : 0;
        } catch (err) {
            console.error("Get 666 prob error:", err);
            return 0;
        }
    }, [provider]);

    // Relic system functions
    const equipRelic = useCallback(async (sessionId: number, tokenId: bigint): Promise<void> => {
        if (!account) throw new Error("Not connected");

        const low = tokenId & ((BigInt(1) << BigInt(128)) - BigInt(1));
        const high = tokenId >> BigInt(128);

        try {
            const tx = await account.execute([{
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "equip_relic",
                calldata: [sessionId.toString(), low.toString(), high.toString()],
            }]);
            await waitForPreConfirmation(tx.transaction_hash);
        } catch (err) {
            console.error("Equip relic error:", err);
            throw err;
        }
    }, [account, provider]);

    const unequipRelic = useCallback(async (sessionId: number): Promise<void> => {
        if (!account) throw new Error("Not connected");

        try {
            const tx = await account.execute([{
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "unequip_relic",
                calldata: [sessionId.toString()],
            }]);
            await waitForPreConfirmation(tx.transaction_hash);
        } catch (err) {
            console.error("Unequip relic error:", err);
            throw err;
        }
    }, [account, provider]);

    const activateRelic = useCallback(async (sessionId: number): Promise<void> => {
        if (!account) throw new Error("Not connected");

        try {
            const tx = await account.execute([{
                contractAddress: CONTRACTS.ABYSS_GAME,
                entrypoint: "activate_relic",
                calldata: [sessionId.toString()],
            }]);
            await waitForPreConfirmation(tx.transaction_hash);
        } catch (err) {
            console.error("Activate relic error:", err);
            throw err;
        }
    }, [account, provider]);

    return {
        createSession,
        requestSpin,
        getSessionData,
        getLastSpinResult,
        endSession,
        getPlayerSessions,
        getLevelThreshold,
        get666Probability,
        equipRelic,
        unequipRelic,
        activateRelic,
        isReady: !!account,
    };

}
