import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PracticeRelicActivationOutcome,
  PracticeBuyOutcome,
  PracticeRefreshOutcome,
  PracticeRunState,
  PracticeSellOutcome,
  PracticeSpinOutcome,
  activatePracticeRelic,
  buyPracticeItem,
  createPracticeRun,
  equipPracticeRelic,
  refreshPracticeMarket,
  sellPracticeItem,
  spinPracticeRun,
} from "@/lib/practiceEngine";

type PracticeContextValue = {
  run: PracticeRunState | null;
  startPractice: () => PracticeRunState;
  resetPractice: () => PracticeRunState;
  clearPractice: () => void;
  spin: () => PracticeSpinOutcome | null;
  buyItem: (slotIndex: number) => PracticeBuyOutcome | null;
  sellItem: (itemId: number) => PracticeSellOutcome | null;
  refreshMarket: () => PracticeRefreshOutcome | null;
  equipRelic: (relicId: number) => PracticeRunState | null;
  activateRelic: () => PracticeRelicActivationOutcome | null;
  playAgain: () => PracticeRunState;
};

const PracticeContext = createContext<PracticeContextValue | undefined>(undefined);

export function PracticeProvider({ children }: PropsWithChildren) {
  const [run, setRun] = useState<PracticeRunState | null>(null);
  const nextRunIdRef = useRef(1);

  const createRun = useCallback(() => {
    const runId = nextRunIdRef.current++;
    const seed = (Date.now() ^ (runId * 0x9e3779b9)) >>> 0;
    return createPracticeRun(runId, seed);
  }, []);

  const startPractice = useCallback(() => {
    const nextRun = createRun();
    setRun(nextRun);
    return nextRun;
  }, [createRun]);

  const resetPractice = useCallback(() => {
    const nextRun = createRun();
    setRun(nextRun);
    return nextRun;
  }, [createRun]);

  const clearPractice = useCallback(() => {
    setRun(null);
  }, []);

  const spin = useCallback(() => {
    let outcome: PracticeSpinOutcome | null = null;

    setRun((current) => {
      if (!current) {
        return current;
      }

      outcome = spinPracticeRun(current);
      return outcome.nextState;
    });

    return outcome;
  }, []);

  const buyItem = useCallback((slotIndex: number) => {
    let outcome: PracticeBuyOutcome | null = null;

    setRun((current) => {
      if (!current) {
        return current;
      }

      outcome = buyPracticeItem(current, slotIndex);
      return outcome?.nextState ?? current;
    });

    return outcome;
  }, []);

  const sellItem = useCallback((itemId: number) => {
    let outcome: PracticeSellOutcome | null = null;

    setRun((current) => {
      if (!current) {
        return current;
      }

      outcome = sellPracticeItem(current, itemId);
      return outcome?.nextState ?? current;
    });

    return outcome;
  }, []);

  const refreshMarket = useCallback(() => {
    let outcome: PracticeRefreshOutcome | null = null;

    setRun((current) => {
      if (!current) {
        return current;
      }

      outcome = refreshPracticeMarket(current);
      return outcome?.nextState ?? current;
    });

    return outcome;
  }, []);

  const equipRelic = useCallback((relicId: number) => {
    let nextRun: PracticeRunState | null = null;

    setRun((current) => {
      if (!current) {
        return current;
      }

      nextRun = equipPracticeRelic(current, relicId);
      return nextRun ?? current;
    });

    return nextRun;
  }, []);

  const activateRelic = useCallback(() => {
    let outcome: PracticeRelicActivationOutcome | null = null;

    setRun((current) => {
      if (!current) {
        return current;
      }

      outcome = activatePracticeRelic(current);
      return outcome?.nextState ?? current;
    });

    return outcome;
  }, []);

  const playAgain = useCallback(() => {
    const nextRun = createRun();
    setRun(nextRun);
    return nextRun;
  }, [createRun]);

  const value = useMemo<PracticeContextValue>(
    () => ({
      run,
      startPractice,
      resetPractice,
      clearPractice,
      spin,
      buyItem,
      sellItem,
      refreshMarket,
      equipRelic,
      activateRelic,
      playAgain,
    }),
    [run, startPractice, resetPractice, clearPractice, spin, buyItem, sellItem, refreshMarket, equipRelic, activateRelic, playAgain],
  );

  return (
    <PracticeContext.Provider value={value}>
      {children}
    </PracticeContext.Provider>
  );
}

export function usePractice() {
  const context = useContext(PracticeContext);

  if (!context) {
    throw new Error("usePractice must be used within a PracticeProvider");
  }

  return context;
}
