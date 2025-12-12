import { Request, Response } from 'express';
import { shortString } from 'starknet'; // Import starknet utils
import { generateSymbols } from '../game/generator';
import { detectPatterns } from '../game/patterns';
import { calculateScore } from '../game/score';
import { calculate666Probability } from '../game/probability';
import { DEFAULT_GAME_CONFIG } from '../game/config';
import { getAdminAccount, ABYSS_CONTRACT_ADDRESS, ABYSS_CONTRACT_ABI } from '../utils/aegis';
import {
    calculateItemBonuses,
    applySymbolBoosts,
    applySymbolPointBoosts,
    applyScoreBonuses,
    OwnedItem,
} from '../game/items';

// Helper to decode felt symbol names
function decodeSymbolName(felt: any): string | undefined {
    if (!felt) return undefined;
    try {
        // Handle BigInt or number by converting to hex
        const hex = '0x' + BigInt(felt).toString(16);
        if (hex === '0x0') return undefined; // No target
        return shortString.decodeShortString(hex);
    } catch (e) {
        console.warn('Failed to decode symbol name:', felt, e);
        return undefined;
    }
}

/**
 * Spin handler - OFF-CHAIN game state version
 * 
 * Applies ALL item effects:
 * - ScoreMultiplier: Multiplies final score
 * - PatternMultiplierBoost: Increases pattern multipliers
 * - SymbolProbabilityBoost: Changes symbol probabilities
 * - DirectScoreBonus: Adds flat bonus to score (OR boosts symbol base points if target specified)
 * - SixSixSixProtection: Blocks 666 (Biblia)
 * 
 * Flow:
 * 1. Validates session is active (blockchain read)
 * 2. Calculates item bonuses
 * 3. Generates spin result with modified probabilities
 * 4. Applies score multipliers and bonuses
 * 5. If game over (666 without biblia), calls end_session_with_score
 * 6. Returns result to client
 */
export async function spinHandler(req: Request, res: Response) {
    try {
        const { sessionId, currentLevel = 1, currentScore = 0 } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        // 1. Validate session is active (blockchain READ - no nonce issues)
        const aegis = await getAdminAccount();

        const sessionData: any = await aegis.call(
            ABYSS_CONTRACT_ADDRESS,
            'get_session_data',
            [sessionId],
            ABYSS_CONTRACT_ABI
        );

        if (!sessionData) {
            return res.status(400).json({ error: 'Session not found' });
        }
        const isActive = Boolean(sessionData.is_active);
        if (!isActive) {
            return res.status(400).json({ error: 'Session is not active', gameOver: true });
        }

        // 2. Read session items from blockchain
        const playerItems: any[] = await aegis.call(
            ABYSS_CONTRACT_ADDRESS,
            'get_session_items',
            [sessionId],
            ABYSS_CONTRACT_ABI
        ) || [];

        // 3. Get full item info for each owned item
        const ownedItems: OwnedItem[] = [];
        for (const playerItem of playerItems) {
            if (Number(playerItem.quantity) > 0) {
                const itemInfo: any = await aegis.call(
                    ABYSS_CONTRACT_ADDRESS,
                    'get_item_info',
                    [playerItem.item_id],
                    ABYSS_CONTRACT_ABI
                );
                if (itemInfo) {
                    const target = decodeSymbolName(itemInfo.target_symbol);
                    if (target) {
                        console.log(`[Session ${sessionId}] Item ${playerItem.item_id} target: ${itemInfo.target_symbol} -> "${target}"`);
                    }

                    ownedItems.push({
                        item_id: Number(playerItem.item_id),
                        quantity: Number(playerItem.quantity),
                        effect_type: Number(itemInfo.effect_type),
                        effect_value: Number(itemInfo.effect_value),
                        effect_target: target,
                    });
                }
            }
        }

        console.log(`[Session ${sessionId}] Items: ${ownedItems.length} types owned`);

        // 4. Calculate item bonuses
        const itemBonuses = calculateItemBonuses(ownedItems);

        // 5. Apply boosts to config
        // First apply probability boosts
        let modifiedConfig = applySymbolBoosts(DEFAULT_GAME_CONFIG, itemBonuses.symbolProbabilityBoosts);
        // Then apply point boosts (NEW: +18 points per lemon logic)
        modifiedConfig = applySymbolPointBoosts(modifiedConfig, itemBonuses.symbolPointBoosts);

        // 4. Check for 666 based on current level (returns percentage 0-9.6)
        const probability666 = calculate666Probability(currentLevel);
        const is666 = Math.random() * 100 < probability666;

        let grid: string[][] = [];
        let patterns: any[] = [];
        let baseScore = 0;
        let scoreToAdd = 0;
        let gameOver = false;
        let bibliaUsed = false;
        let transactionHash: string | undefined;

        if (is666) {
            // Check 666 Protection (Biblia)
            if (itemBonuses.has666Protection) {
                // Saved by Biblia - generate normal grid
                bibliaUsed = true;
                const result = generateSymbols(modifiedConfig, false); // Force safe grid
                grid = result.grid as string[][];
                patterns = detectPatterns(result.grid, modifiedConfig);

                // Apply pattern multiplier boost
                patterns = patterns.map(p => ({
                    ...p,
                    multiplier: p.multiplier * (1 + itemBonuses.patternMultiplierBoost / 100)
                }));

                const scoreBreakdown = calculateScore(result.grid, patterns, modifiedConfig);
                baseScore = scoreBreakdown.totalScore;

                // Apply score multiplier and direct bonus
                scoreToAdd = applyScoreBonuses(baseScore, itemBonuses.scoreMultiplier, itemBonuses.directScoreBonus);
            } else {
                // Game Over - 666 triggered
                console.log(`[Session ${sessionId}] 666 Triggered - GAME OVER`);
                gameOver = true;

                // Use generator to create the correct 666 visual pattern (middle 3 cells only)
                const result = generateSymbols(modifiedConfig, true);
                grid = result.grid as string[][];

                // End session on blockchain asynchronously (FIRE AND FORGET to update UI immediately)
                // Note: On serverless environments (Vercel) this might be killed, but on Railway (Container) it persists.
                console.log(`[Session ${sessionId}] Ending session with score=${currentScore}, level=${currentLevel} (ASYNC)`);
                aegis.execute(
                    ABYSS_CONTRACT_ADDRESS,
                    'end_session_with_score',
                    [sessionId, currentScore, currentLevel]
                ).then((tx: any) => {
                    console.log(`[Session ${sessionId}] Session ended successfully: ${tx.transactionHash}`);
                }).catch((endError: any) => {
                    console.error(`[Session ${sessionId}] Failed to end session (Async):`, endError);
                });

                // Return immediately - don't wait for blockchain
                transactionHash = 'pending'; // Signal specific state?
            }
        } else {
            // Normal Spin - apply all item effects
            const result = generateSymbols(modifiedConfig, false); // Force safe grid
            grid = result.grid as string[][];
            patterns = detectPatterns(result.grid, modifiedConfig);


            // Apply pattern multiplier boost
            patterns = patterns.map(p => ({
                ...p,
                multiplier: p.multiplier * (1 + itemBonuses.patternMultiplierBoost / 100)
            }));

            const scoreBreakdown = calculateScore(result.grid, patterns, modifiedConfig);
            baseScore = scoreBreakdown.totalScore;

            // Apply score multiplier and direct bonus
            scoreToAdd = applyScoreBonuses(baseScore, itemBonuses.scoreMultiplier, itemBonuses.directScoreBonus);
        }

        // 5. Return result
        res.json({
            grid,
            patterns,
            score: scoreToAdd,
            is666,
            gameOver,
            bibliaUsed,
            transactionHash,
            // Include applied bonuses for debugging/UI
            appliedBonuses: {
                scoreMultiplier: itemBonuses.scoreMultiplier,
                patternBoost: itemBonuses.patternMultiplierBoost,
                directBonus: itemBonuses.directScoreBonus,
                pointBoosts: Object.fromEntries(itemBonuses.symbolPointBoosts),
            },
        });

    } catch (error: any) {
        console.error('Spin error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
