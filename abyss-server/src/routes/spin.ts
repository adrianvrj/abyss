import { Request, Response } from 'express';
import { generateSymbols } from '../game/generator';
import { detectPatterns } from '../game/patterns';
import { calculateScore } from '../game/score';
import { calculate666Probability, hasBibliaProtection } from '../game/probability';
import { DEFAULT_GAME_CONFIG } from '../game/config';
import { getAdminAccount, ABYSS_CONTRACT_ADDRESS, ABYSS_CONTRACT_ABI } from '../utils/aegis';
import { GenerateSymbolsResult } from '../game/types';

export async function spinHandler(req: Request, res: Response) {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        // 1. Fetch Session Data & Items from Chain (Authorized State)
        const aegis = await getAdminAccount();

        // In a production app, use Promise.all or a multicall to fetch these
        // Fetch session data
        const sessionData: any = await aegis.call(
            ABYSS_CONTRACT_ADDRESS,
            'get_session_data',
            [sessionId],
            ABYSS_CONTRACT_ABI
        );

        if (!sessionData || !sessionData.is_active) {
            return res.status(400).json({ error: 'Session is not active' });
        }

        if (sessionData.spins_remaining <= 0) {
            return res.status(400).json({ error: 'No spins remaining' });
        }

        const currentLevel = Number(sessionData.level);

        // Fetch owned items
        const ownedItemsData: any[] = await aegis.call(
            ABYSS_CONTRACT_ADDRESS,
            'get_session_items',
            [sessionId],
            ABYSS_CONTRACT_ABI
        );

        // Parse items
        const ownedItems = ownedItemsData.map((item: any) => ({
            item_id: Number(item.item_id),
            quantity: Number(item.quantity)
        }));

        // 2. Adjust Config based on Items (TODO: Implement item effect logic on server)
        // For now, use default config, but pass probability666 based on level
        const probability666 = calculate666Probability(currentLevel);
        const config = { ...DEFAULT_GAME_CONFIG, probability666 };

        // 3. Generate Result (RNG)
        const result: GenerateSymbolsResult = generateSymbols(config);
        const { grid, is666 } = result;

        let transactionHash = '';
        let scoreToAdd = 0;
        let patterns: any[] = [];
        let gameOver = false;
        let bibliaUsed = false;

        // 4. Calculate Score & Prepare Transactions
        if (is666) {
            // Check for Biblia
            if (hasBibliaProtection(ownedItems)) {
                bibliaUsed = true;
                console.log(`[Session ${sessionId}] 666 Triggered but saved by Biblia`);

                // Calculate score as normal
                patterns = detectPatterns(grid, config);
                const scoreBreakdown = calculateScore(grid, patterns, config);
                scoreToAdd = scoreBreakdown.totalScore;

                // Execute Batch: Consume Item + Update Score
                const calls = [
                    {
                        contractAddress: ABYSS_CONTRACT_ADDRESS,
                        entrypoint: 'consume_item',
                        calldata: [sessionId, 40, 1] // 40 is Biblia
                    },
                    {
                        contractAddress: ABYSS_CONTRACT_ADDRESS,
                        entrypoint: 'update_session_score',
                        calldata: [sessionId, scoreToAdd]
                    }
                ];

                const tx = await aegis.executeBatch(calls);
                transactionHash = tx.transactionHash;

            } else {
                console.log(`[Session ${sessionId}] 666 Triggered - GAME OVER`);
                gameOver = true;
                // End Session
                const tx = await aegis.execute(
                    ABYSS_CONTRACT_ADDRESS,
                    'end_session',
                    [sessionId]
                );
                transactionHash = tx.transactionHash;
            }
        } else {
            // Normal Spin
            patterns = detectPatterns(grid, config);
            const scoreBreakdown = calculateScore(grid, patterns, config);
            scoreToAdd = scoreBreakdown.totalScore;

            if (scoreToAdd > 0) {
                // Update Score
                const tx = await aegis.execute(
                    ABYSS_CONTRACT_ADDRESS,
                    'update_session_score',
                    [sessionId, scoreToAdd]
                );
                transactionHash = tx.transactionHash;
            } else {
                // Even if score is 0, we might need to decrement spin count? 
                // The contract `update_session_score` decrements spins. 
                // If we don't call it, the user keeps their spin?
                // Wait, if score is 0, we still need to consume a spin!
                const tx = await aegis.execute(
                    ABYSS_CONTRACT_ADDRESS,
                    'update_session_score',
                    [sessionId, 0]
                );
                transactionHash = tx.transactionHash;
            }
        }

        // 5. Return Result
        res.json({
            grid,
            patterns,
            score: scoreToAdd,
            is666,
            gameOver,
            bibliaUsed,
            transactionHash,
            spinsRemaining: Number(sessionData.spins_remaining) - 1 // Estimate
        });

    } catch (error: any) {
        console.error('Spin error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
