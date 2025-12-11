import { Request, Response } from 'express';
import { generateSymbols } from '../game/generator';
import { detectPatterns } from '../game/patterns';
import { calculateScore } from '../game/score';
import { calculate666Probability, hasBibliaProtection } from '../game/probability';
import { DEFAULT_GAME_CONFIG } from '../game/config';
import { getAdminAccount, ABYSS_CONTRACT_ADDRESS, ABYSS_CONTRACT_ABI } from '../utils/aegis';

/**
 * Spin handler - OFF-CHAIN game state version
 * 
 * Flow:
 * 1. Validates session is active (blockchain read)
 * 2. Generates spin result (RNG, patterns, score)
 * 3. If game over (666 without bible), calls end_session_with_score
 * 4. Returns result to client
 * 
 * Client tracks score/level/spins locally.
 * When client's spins reach 0, client calls /api/end-session.
 */
export async function spinHandler(req: Request, res: Response) {
    try {
        const { sessionId, currentLevel = 1, currentScore = 0, ownedItems = [] } = req.body;

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

        // 2. Generate spin result (all in-memory)
        const config = DEFAULT_GAME_CONFIG;

        // Check for 666 based on current level (returns percentage 0-9.6)
        const probability666 = calculate666Probability(currentLevel);
        const is666 = Math.random() * 100 < probability666;

        let grid: string[][] = [];
        let patterns: any[] = [];
        let scoreToAdd = 0;
        let gameOver = false;
        let bibliaUsed = false;
        let transactionHash: string | undefined;

        if (is666) {
            // Check Biblia
            const hasBiblia = hasBibliaProtection(ownedItems);

            if (hasBiblia) {
                // Saved by Biblia - generate normal grid
                bibliaUsed = true;
                const result = generateSymbols(config);
                grid = result.grid as string[][];
                patterns = detectPatterns(result.grid, config);
                const scoreBreakdown = calculateScore(result.grid, patterns, config);
                scoreToAdd = scoreBreakdown.totalScore;
                // Note: Client should decrement Biblia count locally
            } else {
                // Game Over - 666 triggered
                console.log(`[Session ${sessionId}] 666 Triggered - GAME OVER`);
                gameOver = true;
                grid = [['6', '6', '6', '6', '6'], ['6', '6', '6', '6', '6'], ['6', '6', '6', '6', '6']];

                // End session on blockchain with current score
                try {
                    console.log(`[Session ${sessionId}] Ending session with score=${currentScore}, level=${currentLevel}`);
                    const tx = await aegis.execute(
                        ABYSS_CONTRACT_ADDRESS,
                        'end_session_with_score',
                        [sessionId, currentScore, currentLevel]
                    );
                    transactionHash = tx.transactionHash;
                    console.log(`[Session ${sessionId}] Session ended: ${transactionHash}`);
                } catch (endError: any) {
                    console.error(`[Session ${sessionId}] Failed to end session:`, endError);
                    // Still return game over to client, just note the blockchain write failed
                }
            }
        } else {
            // Normal Spin
            const result = generateSymbols(config);
            grid = result.grid as string[][];
            patterns = detectPatterns(result.grid, config);
            const scoreBreakdown = calculateScore(result.grid, patterns, config);
            scoreToAdd = scoreBreakdown.totalScore;
        }

        // 3. Return result
        res.json({
            grid,
            patterns,
            score: scoreToAdd,
            is666,
            gameOver,
            bibliaUsed,
            transactionHash,
        });

    } catch (error: any) {
        console.error('Spin error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
