import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface GameSessionState {
    sessionId: number;
    score: number;
    level: number;
    spinsLeft: number;
    bonusSpins: number; // From items - added on every level reset
}

interface GameSessionContextType {
    session: GameSessionState | null;
    setSession: (session: GameSessionState) => void;
    updateScore: (newScore: number) => void;
    updateSpins: (newSpins: number) => void;
    updateLevel: (newLevel: number) => void;
    adjustScore: (delta: number) => void;
    adjustSpins: (delta: number) => void;
    adjustBonusSpins: (delta: number) => void; // For spin item purchase/sale
    resetSpinsForLevelUp: () => void; // Sets spins to 5 + bonusSpins
    clearSession: () => void;
}

const GameSessionContext = createContext<GameSessionContextType | undefined>(undefined);

export function GameSessionProvider({ children }: { children: ReactNode }) {
    const [session, setSessionState] = useState<GameSessionState | null>(null);

    const setSession = useCallback((newSession: GameSessionState) => {
        // Ensure bonusSpins has a default value
        setSessionState({
            ...newSession,
            bonusSpins: newSession.bonusSpins ?? 0,
        });
    }, []);

    const updateScore = useCallback((newScore: number) => {
        setSessionState(prev => prev ? { ...prev, score: newScore } : null);
    }, []);

    const updateSpins = useCallback((newSpins: number) => {
        setSessionState(prev => prev ? { ...prev, spinsLeft: newSpins } : null);
    }, []);

    const updateLevel = useCallback((newLevel: number) => {
        setSessionState(prev => prev ? { ...prev, level: newLevel } : null);
    }, []);

    const adjustScore = useCallback((delta: number) => {
        setSessionState(prev => prev ? { ...prev, score: prev.score + delta } : null);
    }, []);

    const adjustSpins = useCallback((delta: number) => {
        setSessionState(prev => prev ? { ...prev, spinsLeft: prev.spinsLeft + delta } : null);
    }, []);

    const adjustBonusSpins = useCallback((delta: number) => {
        setSessionState(prev => prev ? { ...prev, bonusSpins: prev.bonusSpins + delta } : null);
    }, []);

    const resetSpinsForLevelUp = useCallback(() => {
        // On level up: spins = 5 base + bonusSpins from items
        setSessionState(prev => prev ? { ...prev, spinsLeft: 5 + prev.bonusSpins } : null);
    }, []);

    const clearSession = useCallback(() => {
        setSessionState(null);
    }, []);

    return (
        <GameSessionContext.Provider
            value={{
                session,
                setSession,
                updateScore,
                updateSpins,
                updateLevel,
                adjustScore,
                adjustSpins,
                adjustBonusSpins,
                resetSpinsForLevelUp,
                clearSession,
            }}
        >
            {children}
        </GameSessionContext.Provider>
    );
}

export function useGameSession() {
    const context = useContext(GameSessionContext);
    if (context === undefined) {
        throw new Error('useGameSession must be used within a GameSessionProvider');
    }
    return context;
}

