import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface GameSessionState {
    sessionId: number;
    score: number;
    level: number;
    spinsLeft: number;
}

interface GameSessionContextType {
    session: GameSessionState | null;
    setSession: (session: GameSessionState) => void;
    updateScore: (newScore: number) => void;
    updateSpins: (newSpins: number) => void;
    updateLevel: (newLevel: number) => void;
    adjustScore: (delta: number) => void; // For market purchases/sales
    clearSession: () => void;
}

const GameSessionContext = createContext<GameSessionContextType | undefined>(undefined);

export function GameSessionProvider({ children }: { children: ReactNode }) {
    const [session, setSessionState] = useState<GameSessionState | null>(null);

    const setSession = useCallback((newSession: GameSessionState) => {
        setSessionState(newSession);
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
