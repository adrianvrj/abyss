import { Request, Response } from 'express';
import { getAdminAccount, ABYSS_CONTRACT_ADDRESS } from '../utils/aegis';

/**
 * End Session handler - writes final score to blockchain
 * 
 * This is the ONLY blockchain write during gameplay.
 * Called when:
 * - Player runs out of spins
 * - Player hits 666 without Biblia
 * - Player manually ends session
 */
export async function endSessionHandler(req: Request, res: Response) {
    try {
        const { sessionId, finalScore, finalLevel } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        if (finalScore === undefined || finalLevel === undefined) {
            return res.status(400).json({ error: 'Final score and level are required' });
        }

        console.log(`[EndSession] Session ${sessionId}: score=${finalScore}, level=${finalLevel}`);

        // Call end_session_with_score on blockchain
        const aegis = await getAdminAccount();

        const tx = await aegis.execute(
            ABYSS_CONTRACT_ADDRESS,
            'end_session_with_score',
            [sessionId, finalScore, finalLevel]
        );

        console.log(`[EndSession] Transaction: ${tx.transactionHash}`);

        res.json({
            success: true,
            transactionHash: tx.transactionHash,
            sessionId,
            finalScore,
            finalLevel
        });

    } catch (error: any) {
        console.error('End session error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
