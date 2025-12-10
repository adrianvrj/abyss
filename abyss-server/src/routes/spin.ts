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

        console.log(`[Spin] Fetching data for session ${sessionId} from ${ABYSS_CONTRACT_ADDRESS}`);
        console.log('[Spin] Raw Session Data:', sessionData);

        if (!sessionData) {
            console.error('[Spin] Session data is null/undefined');
            return res.status(400).json({ error: 'Session not found' });
        }

        // Handle Starknet struct return (might need specific field access depending on library version)
        // is_active might be a BigInt or boolean
        const isActive = Boolean(sessionData.is_active);
        console.log('[Spin] Is Active:', isActive, sessionData.is_active);

        if (!isActive) {

            return res.status(400).json({ error: 'Session is not active' });
        }

        const spinsRemaining = Number(sessionData.spins_remaining);
        console.log('[Spin] Spins Remaining:', spinsRemaining);

        if (spinsRemaining <= 0) {
            return res.status(400).json({ error: 'No spins remaining', spinsRemaining: 0 });
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

            // Update score (also decrements spins in contract)
            const tx = await aegis.execute(
                ABYSS_CONTRACT_ADDRESS,
                'update_session_score',
                [sessionId, scoreToAdd]
            );
            transactionHash = tx.transactionHash;

            // Check if this was the last spin
            const newSpinsRemaining = spinsRemaining - 1;
            if (newSpinsRemaining <= 0) {
                console.log(`[Session ${sessionId}] No spins remaining - ending session`);
                gameOver = true;
                // End the session
                const endTx = await aegis.execute(
                    ABYSS_CONTRACT_ADDRESS,
                    'end_session',
                    [sessionId]
                );
                console.log(`[Session ${sessionId}] Session ended: ${endTx.transactionHash}`);
            }
        }

        // Calculate actual spins remaining
        const finalSpinsRemaining = gameOver ? 0 : spinsRemaining - 1;

        // 5. Return Result
        res.json({
            grid,
            patterns,
            score: scoreToAdd,
            is666,
            gameOver,
            bibliaUsed,
            transactionHash,
            spinsRemaining: finalSpinsRemaining
        });

    } catch (error: any) {
        console.error('Spin error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
