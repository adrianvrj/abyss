import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { Pattern } from "@/utils/patternDetector";
import { ContractItem } from "@/utils/abyssContract";
import { usePractice } from "@/context/practice";

interface OwnedRelic {
  tokenId: bigint;
  relicId: number;
  name: string;
  cooldown: number;
}

const PRACTICE_RELICS: OwnedRelic[] = [
  { tokenId: 1n, relicId: 1, name: "Mortis", cooldown: 13 },
  { tokenId: 2n, relicId: 2, name: "Phantom", cooldown: 10 },
  { tokenId: 3n, relicId: 3, name: "Lucky the Dealer", cooldown: 9 },
  { tokenId: 4n, relicId: 4, name: "Scorcher", cooldown: 9 },
  { tokenId: 5n, relicId: 5, name: "Inferno", cooldown: 9 },
];
const EMPTY_ITEMS: ContractItem[] = [];
const EMPTY_PATTERNS: Pattern[] = [];

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function useNoopSetter<T>(): Dispatch<SetStateAction<T>> {
  return useCallback((_value: SetStateAction<T>) => {
    return;
  }, []);
}

export function usePracticeSession() {
  const {
    run,
    startPractice,
    clearPractice,
    spin,
    buyItem,
    sellItem,
    refreshMarket,
    equipRelic,
    activateRelic,
    playAgain,
  } = usePractice();

  const [isSpinning, setIsSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [patterns, setPatterns] = useState<Pattern[]>(EMPTY_PATTERNS);
  const [showingPatterns, setShowingPatterns] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<"666" | "no_spins" | "scorched" | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [finalTotalScore, setFinalTotalScore] = useState(0);
  const [chipsEarned, setChipsEarned] = useState(0);
  const [chipsClaimed] = useState(false);
  const [gameOverBuildItems, setGameOverBuildItems] = useState<ContractItem[]>(EMPTY_ITEMS);
  const [showBibliaAnimation, setShowBibliaAnimation] = useState(false);
  const [bibliaDiscarded, setBibliaDiscarded] = useState(true);
  const [bibliaBroken, setBibliaBroken] = useState(false);
  const [showCharmAnimation, setShowCharmAnimation] = useState(false);
  const [mintedCharmInfo, setMintedCharmInfo] = useState<any>(null);
  const [showRelicActivation, setShowRelicActivation] = useState(false);
  const [showScoreResetAnimation, setShowScoreResetAnimation] = useState(false);
  const [scoreResetPreviousScore, setScoreResetPreviousScore] = useState(0);
  const [showLuckyScoreBoostAnimation, setShowLuckyScoreBoostAnimation] = useState(false);
  const [luckyScoreBoostTotal, setLuckyScoreBoostTotal] = useState(0);
  const [luckyScoreBoostBonus, setLuckyScoreBoostBonus] = useState(0);
  const [showCashOutAnimation, setShowCashOutAnimation] = useState(false);
  const [relicIndex, setRelicIndex] = useState(0);
  const [itemToSell, setItemToSell] = useState<ContractItem | null>(null);
  const [isSelling, setIsSelling] = useState(false);
  const [currentLuck] = useState<number | undefined>(0);
  const [lastMarketEvent, setLastMarketEvent] = useState<null>(null);

  const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const spinSoundRef = useRef<HTMLAudioElement | null>(null);
  const runRef = useRef(run);

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  useEffect(() => {
    if (!run) {
      startPractice();
    }
  }, [run, startPractice]);

  useEffect(() => {
    return () => {
      clearPractice();
    };
  }, [clearPractice]);

  const getCachedAudio = useCallback((soundName: string) => {
    if (!audioCacheRef.current.has(soundName)) {
      const audio = new Audio(`/sounds/${soundName}${soundName === "win" ? ".wav" : ".mp3"}`);
      audio.preload = "auto";
      audioCacheRef.current.set(soundName, audio);
    }

    return audioCacheRef.current.get(soundName)!;
  }, []);

  const playSound = useCallback((soundName: "spin" | "win" | "jackpot" | "game-over", durationMs?: number) => {
    try {
      const audio = getCachedAudio(soundName);
      audio.volume = 0.5;
      audio.loop = soundName === "spin";
      if (soundName !== "spin") {
        audio.currentTime = 0;
      }

      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => {
          return;
        });
      }

      if (durationMs) {
        window.setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
        }, durationMs);
      }

      return audio;
    } catch {
      return null;
    }
  }, [getCachedAudio]);

  const resetTransientUi = useCallback(() => {
    setError(null);
    setPatterns([]);
    setShowingPatterns(false);
    setShowLevelUp(false);
    setShowGameOver(false);
    setGameOverReason(null);
    setShowBibliaAnimation(false);
    setBibliaBroken(false);
    setShowScoreResetAnimation(false);
    setScoreResetPreviousScore(0);
    setShowLuckyScoreBoostAnimation(false);
    setLuckyScoreBoostTotal(0);
    setLuckyScoreBoostBonus(0);
    setShowCashOutAnimation(false);
    setItemToSell(null);
  }, []);

  const handlePracticeRefresh = useCallback(async () => {
    const outcome = refreshMarket();

    if (!outcome) {
      setError("Not enough score");
      return;
    }

    setError(null);
    setPatterns([]);
    setShowingPatterns(false);
  }, [refreshMarket]);

  const handlePracticeBuy = useCallback(async (slotIndex: number) => {
    const currentRun = runRef.current;
    const item = currentRun?.marketItems[slotIndex];
    const outcome = buyItem(slotIndex);

    if (!outcome || !item) {
      setError("Can't buy that item");
      return;
    }

    setError(null);
    if (item.effect_type === 6) {
      setBibliaBroken(false);
    }
  }, [buyItem]);

  const handleSellConfirm = useCallback(async () => {
    if (!itemToSell || isSelling) {
      return;
    }

    setIsSelling(true);
    try {
      const outcome = sellItem(itemToSell.item_id);
      if (!outcome) {
        setError("Sell failed");
        return;
      }

      setItemToSell(null);
      setError(null);
    } finally {
      setIsSelling(false);
    }
  }, [itemToSell, isSelling, sellItem]);

  const handleSpin = useCallback(async () => {
    const currentRun = runRef.current;

    if (!currentRun || !currentRun.isActive || currentRun.spinsRemaining <= 0 || isSpinning || showGameOver) {
      return;
    }

    setIsSpinning(true);
    setError(null);
    setPatterns([]);
    setShowingPatterns(false);
    setShowGameOver(false);
    setGameOverReason(null);
    const luckyWasActive = currentRun.pendingRelicEffect === 2;
    setShowLuckyScoreBoostAnimation(false);
    setLuckyScoreBoostTotal(0);
    setLuckyScoreBoostBonus(0);
    setBibliaBroken(false);

    spinSoundRef.current = playSound("spin");

    await delay(900);

    const outcome = spin();

    if (spinSoundRef.current) {
      spinSoundRef.current.pause();
      spinSoundRef.current.currentTime = 0;
      spinSoundRef.current = null;
    }

    if (!outcome) {
      setError("Spin failed");
      setIsSpinning(false);
      return;
    }

    if (outcome.awardedTickets > 0) {
      setShowLevelUp(true);
      window.setTimeout(() => setShowLevelUp(false), 1600);
    }

    if (outcome.bibliaUsed) {
      setBibliaDiscarded(outcome.bibliaDiscarded);
      setBibliaBroken(outcome.bibliaDiscarded);
      setShowBibliaAnimation(true);
    }

    if (outcome.cashOutSucceeded) {
      setShowCashOutAnimation(true);
    }

    if (outcome.is666) {
      setScoreResetPreviousScore(outcome.previousScore);
      setShowScoreResetAnimation(true);
      playSound("game-over");
    } else {
      setPatterns(outcome.patterns);
      if (outcome.patterns.length > 0) {
        setShowingPatterns(true);
      }

      if (luckyWasActive && outcome.scoreGained > 0) {
        const baseScore = Math.floor(outcome.scoreGained / 5);
        const luckyBonus = Math.max(0, outcome.scoreGained - baseScore);
        window.setTimeout(() => {
          setLuckyScoreBoostTotal(outcome.scoreGained);
          setLuckyScoreBoostBonus(luckyBonus);
          setShowLuckyScoreBoostAnimation(true);
        }, outcome.patterns.length > 0 ? Math.max(500, outcome.patterns.length * 250) : 350);
      }
    }

    if (outcome.isJackpot) {
      playSound("jackpot");
    }

    setIsSpinning(false);

    const sequenceDelay = outcome.cashOutSucceeded
      ? 2400
      : outcome.is666
        ? 1900
        : Math.max(1000, outcome.patterns.length * 400 + 600);

    if (outcome.endedRun) {
      window.setTimeout(() => {
        setFinalScore(outcome.nextState.score);
        setFinalTotalScore(outcome.nextState.totalScore);
        setChipsEarned(
          Math.floor(Math.max(0, outcome.nextState.score) / 20)
            + outcome.nextState.diamondChipBonusUnits,
        );
        setGameOverBuildItems(outcome.nextState.inventoryItems);
        setGameOverReason("no_spins");
        setShowGameOver(true);
      }, sequenceDelay);
    }
  }, [isSpinning, playSound, showGameOver, spin]);

  const handlePlayAgain = useCallback(() => {
    playAgain();
    resetTransientUi();
  }, [playAgain, resetTransientUi]);

  const noopNumberSetter = useNoopSetter<number>();
  const noopNumberArraySetter = useNoopSetter<number[]>();
  const noopOptionalNumberSetter = useNoopSetter<number | undefined>();
  const noopItemsSetter = useNoopSetter<ContractItem[]>();
  const registerInventoryItemAcquired = useCallback((_item: ContractItem) => {
    return;
  }, []);

  const equippedRelic = PRACTICE_RELICS.find((relic) => relic.relicId === (run?.equippedRelicId ?? 0)) ?? null;

  const handleActivateRelic = useCallback(async () => {
    const currentRun = runRef.current;
    if (!currentRun || !equippedRelic || currentRun.relicCooldownRemaining > 0) {
      return;
    }

    const outcome = activateRelic();
    if (!outcome) {
      return;
    }

    if (outcome.relicId === 4) {
      setFinalScore(outcome.nextState.score);
      setFinalTotalScore(outcome.nextState.totalScore);
      setChipsEarned(
        Math.floor(Math.max(0, outcome.nextState.score) / 20)
          + outcome.nextState.diamondChipBonusUnits,
      );
      setGameOverBuildItems(outcome.nextState.inventoryItems);
      setGameOverReason("scorched");
      setShowGameOver(true);
      return;
    }

    setShowRelicActivation(true);
  }, [activateRelic, equippedRelic]);

  const handleEquipRelic = useCallback(async (relic: OwnedRelic) => {
    equipRelic(relic.relicId);
  }, [equipRelic]);

  return {
    practiceMode: true,
    sessionId: run?.id ?? null,
    level: run?.level ?? 1,
    score: run?.score ?? 0,
    threshold: run?.threshold ?? 66,
    risk: run?.risk ?? 0,
    tickets: run?.tickets ?? 0,
    spinsRemaining: run?.spinsRemaining ?? 0,
    isSessionActive: run?.isActive ?? true,
    grid: run?.grid ?? [],
    isSpinning,
    hasSpunOnce: (run?.grid.length ?? 0) === 15,
    error,
    showLevelUp,
    isInitialLoading: !run,
    patterns,
    showingPatterns,
    symbolScores: run?.symbolScores ?? [7, 5, 4, 3, 2],
    blocked666: run?.blocked666 ?? false,
    pendingRelicEffect: run?.pendingRelicEffect ?? null,
    setScore: noopNumberSetter,
    setTickets: noopNumberSetter,
    setSpinsRemaining: noopNumberSetter,
    setShowingPatterns,
    setSymbolScores: noopNumberArraySetter,
    initialMarketItems: run?.marketItems ?? [],
    initialInventoryItems: run?.inventoryItems ?? [],
    showGameOver,
    gameOverReason,
    finalScore,
    finalTotalScore,
    chipsEarned,
    diamondChipBonusUnits: run?.diamondChipBonusUnits ?? 0,
    chipsClaimed,
    gameOverBuildItems,
    setShowGameOver,
    showBibliaAnimation,
    bibliaDiscarded,
    bibliaBroken,
    showCharmAnimation,
    mintedCharmInfo,
    showRelicActivation,
    showScoreResetAnimation,
    scoreResetPreviousScore,
    showLuckyScoreBoostAnimation,
    luckyScoreBoostTotal,
    luckyScoreBoostBonus,
    showCashOutAnimation,
    setShowBibliaAnimation,
    setShowCharmAnimation,
    setMintedCharmInfo,
    setShowRelicActivation,
    setShowScoreResetAnimation,
    setShowLuckyScoreBoostAnimation,
    setShowCashOutAnimation,
    setGameOverReason,
    equippedRelic,
    ownedRelics: PRACTICE_RELICS,
    isActivatingRelic: false,
    isEquippingRelic: false,
    relicCooldownRemaining: run?.relicCooldownRemaining ?? 0,
    relicIndex,
    setRelicIndex,
    itemToSell,
    setItemToSell,
    isSelling,
    hiddenItems: [],
    inventoryRefreshTrigger: run?.inventoryRevision ?? 0,
    setInventoryRefreshTrigger: noopNumberSetter as unknown as Dispatch<SetStateAction<number>>,
    marketRefreshTrigger: run?.marketRevision ?? 0,
    setMarketRefreshTrigger: noopNumberSetter as unknown as Dispatch<SetStateAction<number>>,
    optimisticItems: run?.inventoryItems ?? [],
    setOptimisticItems: noopItemsSetter,
    currentLuck,
    setCurrentLuck: noopOptionalNumberSetter,
    lastMarketEvent,
    setLastMarketEvent,
    registerInventoryItemAcquired,
    handleSpin,
    handleActivateRelic,
    handleEquipRelic,
    handleSellConfirm,
    playSound,
    handlePracticeBuy,
    handlePracticeRefresh,
    handlePlayAgain,
    practiceBibliaPurchaseCount: run?.bibliaPurchaseCount ?? 0,
    practicePurchasedSlots: run?.purchasedSlots ?? [],
    practiceRefreshCount: run?.refreshCount ?? 0,
    startPractice,
    clearPractice,
  };
}
