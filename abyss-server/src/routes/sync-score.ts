import { Request, Response } from 'express';
import { getAdminAccount, ABYSS_CONTRACT_ADDRESS } from '../utils/aegis';

/**
 * Sync score endpoint - Updates session score on blockchain before market access
 * 
 * Flow:
 * 1. Client calls this before opening market/inventory
 * 2. Server (admin) writes current score to blockchain
 * 3. Client can then buy/sell items with validated on-chain score
 */
export async function syncScoreHandler(req: Request, res: Response) {
    try {
        const { sessionId, score, level } = req.body;

        if (!sessionId || score === undefined || level === undefined) {
            return res.status(400).json({
                error: 'sessionId, score, and level are required',
            });
        }

        const aegis = await getAdminAccount();

        // Call admin_set_session_score on contract
        const result = await aegis.execute(
            ABYSS_CONTRACT_ADDRESS,
            'admin_set_session_score',
            [sessionId, score, level]
        );

        console.log(`Synced session ${sessionId}: score=${score}, level=${level}, tx=${result.transactionHash}`);

        return res.json({
            success: true,
            transactionHash: result.transactionHash,
            score,
            level,
        });
    } catch (error: any) {
        console.error('Sync score error:', error);
        return res.status(500).json({
            error: 'Failed to sync score to blockchain',
            details: error.message,
        });
    }
}
