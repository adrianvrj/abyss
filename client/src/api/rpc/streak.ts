import { CallData } from "starknet";
import { getRpcProvider } from "@/api/rpc/provider";
import { tryGetStreakAddress } from "@/config";

export type PlayerStreakState = {
    lastIncrementDayId: number;
    streakCount: number;
    lootClaimBarrierDayId: number;
    recoverPriorCount: number;
    recoverDeadlineDayId: number;
    lootClaimNonce: number;
};

const SECONDS_PER_DAY = 86400;

export function utcDayIndexFromMs(ms: number): number {
    return Math.floor(ms / 1000 / SECONDS_PER_DAY);
}

export function secondsUntilNextUtcDay(ms: number): number {
    const s = Math.floor(ms / 1000);
    const into = s % SECONDS_PER_DAY;
    return SECONDS_PER_DAY - into;
}

/** 666 CHIP with 18 decimals (matches on-chain `STREAK_RECOVER_CHIP_COST`). */
export const STREAK_RECOVER_CHIP_WEI = 666n * 10n ** 18n;

/**
 * Reads `Streak::get_player_streak(player)` — ABI returns value fields in model order
 * (excluding the `player` key, which is supplied as calldata).
 */
export async function fetchPlayerStreak(
    chainId: bigint | string | undefined | null,
    playerAddress: string,
): Promise<PlayerStreakState | null> {
    const streakAddress = tryGetStreakAddress(chainId);
    if (!streakAddress) {
        return null;
    }

    try {
        const provider = getRpcProvider(chainId);
        const result = await provider.callContract({
            contractAddress: streakAddress,
            entrypoint: "get_player_streak",
            calldata: CallData.compile([playerAddress]),
        });

        const rows = result as string[];
        const offset = rows.length >= 7 ? 1 : 0;
        const lastIncrementDayId = Number(rows[offset] ?? 0);
        const streakCount = Number(rows[offset + 1] ?? 0);
        const lootClaimBarrierDayId = Number(rows[offset + 2] ?? 0);
        const recoverPriorCount = Number(rows[offset + 3] ?? 0);
        const recoverDeadlineDayId = Number(rows[offset + 4] ?? 0);
        const lootClaimNonce = Number(rows[offset + 5] ?? 0);

        return {
            lastIncrementDayId,
            streakCount,
            lootClaimBarrierDayId,
            recoverPriorCount,
            recoverDeadlineDayId,
            lootClaimNonce,
        };
    } catch (error) {
        console.warn("get_player_streak failed:", error);
        return null;
    }
}
