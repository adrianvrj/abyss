import { AegisSDK } from '@cavos/aegis';
import { aegisConfig } from './aegisConfig';
import { ABYSS_CONTRACT_ADDRESS } from './constants';
import { ABYSS_CONTRACT_ABI } from '@/abi/abyssContract';

const aegis = new AegisSDK(aegisConfig);

export async function newSession(playerAddress: string, isCompetitive: boolean) {
    try {
        await aegis.connectAccount(process.env.EXPO_PUBLIC_ADMIN_PK || '', true);
        const tx = await aegis.execute(
            ABYSS_CONTRACT_ADDRESS,
            'create_session',
            [
                playerAddress,
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