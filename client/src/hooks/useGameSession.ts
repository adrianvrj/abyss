import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useNetwork } from '@starknet-react/core';
import { useAbyssGame } from '@/hooks/useAbyssGame';
import { Pattern, detectPatterns, ScoreBonuses } from '@/utils/patternDetector';
import { applyPatternModifiers } from '@/lib/patternMath';
import {
    getSessionItems, getItemInfo, ItemEffectType, ContractItem,
    getCharmInfo, CharmInfo, getSessionMarket, getSessionLuck,
    getSessionChipBonusUnits,
    isCharmItem, getCharmIdFromItemId
} from '@/utils/abyssContract';
import { CONTRACTS, DEFAULT_CHAIN_ID } from '@/lib/constants';
import { getCharmMetadata, getPlayerCharms } from '@/api/rpc/relic';
import { getRpcProvider } from '@/api/rpc/provider';
import { getGameConfig } from '@/api/rpc/play';

const DEBUG_SPIN_SYNC =
    import.meta.env.DEV || import.meta.env.VITE_ABYSS_DEBUG_SPIN === 'true';

function logSpinDebug(stage: string, payload?: unknown) {
    if (!DEBUG_SPIN_SYNC) {
        return;
    }

    console.log(`[ABYSS_SPIN] ${stage}`, payload);
}

function summarizeSessionSnapshot(data: {
    sessionId: number;
    level: number;
    score: number;
    totalScore: number;
    spinsRemaining: number;
    isActive: boolean;
    chipsClaimed: boolean;
    totalSpins: number;
    luck: number;
    blocked666: boolean;
    tickets: number;
} | null) {
    if (!data) {
        return null;
    }

    return {
        sessionId: data.sessionId,
        level: data.level,
        score: data.score,
        totalScore: data.totalScore,
        spinsRemaining: data.spinsRemaining,
        isActive: data.isActive,
        chipsClaimed: data.chipsClaimed,
        totalSpins: data.totalSpins,
        luck: data.luck,
        blocked666: data.blocked666,
        tickets: data.tickets,
    };
}

function summarizeSpinResultSnapshot(spinResult: {
    sessionId: number;
    grid: number[];
    score: number;
    patternsCount: number;
    is666: boolean;
    isJackpot: boolean;
    isPending: boolean;
    bibliaUsed: boolean;
} | null) {
    if (!spinResult) {
        return null;
    }

    return {
        sessionId: spinResult.sessionId,
        grid: spinResult.grid,
        score: spinResult.score,
        patternsCount: spinResult.patternsCount,
        is666: spinResult.is666,
        isJackpot: spinResult.isJackpot,
        isPending: spinResult.isPending,
        bibliaUsed: spinResult.bibliaUsed,
    };
}

function getTicketsAwardedForLevelTransition(previousLevel: number, nextLevel: number) {
    if (nextLevel <= previousLevel) {
        return 0;
    }

    return nextLevel - previousLevel;
}

const RELIC_NAMES: Record<number, string> = {
    1: 'Mortis',
    2: 'Phantom',
    3: 'Lucky the Dealer',
    4: 'Scorcher',
    5: 'Inferno',
};

const BIBLIA_ITEM_ID = 40;
const CASH_OUT_ITEM_ID = 41;
const CHIP_SCORE_DIVISOR = 20;

export interface OwnedRelic {
    tokenId: bigint;
    relicId: number;
    name: string;
    cooldown: number;
}

export function useGameSession(sessionId: string | null) {
    const { account } = useAccount();
    const { chain } = useNetwork();
    const {
        isReady,
        requestSpin,
        getLastSpinResult,
        getSessionData,
        getLevelThreshold,
        get666Probability,
        equipRelic,
        activateRelic,
        sellItem: sellItemHook,
    } = useAbyssGame(account);
    const chainId = chain?.id ?? DEFAULT_CHAIN_ID;
    const rpcProvider = getRpcProvider(chainId);
    const chipEconomyConfigRef = useRef<{ emissionRate: number; boostMultiplier: number } | null>(null);

    // Game State
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [threshold, setThreshold] = useState(100);
    const [risk, setRisk] = useState(0);
    const [tickets, setTickets] = useState(0);
    const [spinsRemaining, setSpinsRemaining] = useState(5);
    const [isSessionActive, setIsSessionActive] = useState(true);
    const [grid, setGrid] = useState<number[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [hasSpunOnce, setHasSpunOnce] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [patterns, setPatterns] = useState<Pattern[]>([]);
    const [showingPatterns, setShowingPatterns] = useState(false);
    const [symbolScores, setSymbolScores] = useState<number[]>([7, 5, 4, 3, 2]);
    const [blocked666, setBlocked666] = useState(false);
    const [pendingRelicEffect, setPendingRelicEffect] = useState<number | null>(null);

    // Market/Inventory preloaded data
    const [initialMarketItems, setInitialMarketItems] = useState<ContractItem[]>([]);
    const [initialInventoryItems, setInitialInventoryItems] = useState<ContractItem[]>([]);

    // Game Over State
    const [showGameOver, setShowGameOver] = useState(false);
    const [gameOverReason, setGameOverReason] = useState<'666' | 'no_spins' | 'scorched' | null>(null);
    const [finalScore, setFinalScore] = useState(0);
    const [finalTotalScore, setFinalTotalScore] = useState(0);
    const [chipsEarned, setChipsEarned] = useState(0);
    const [diamondChipBonusUnits, setDiamondChipBonusUnits] = useState(0);
    const [chipsClaimed, setChipsClaimed] = useState(false);
    const [gameOverBuildItems, setGameOverBuildItems] = useState<ContractItem[]>([]);

    // Animation states
    const [showBibliaAnimation, setShowBibliaAnimation] = useState(false);
    const [bibliaDiscarded, setBibliaDiscarded] = useState(true);
    const [bibliaBroken, setBibliaBroken] = useState(false);
    const [showCharmAnimation, setShowCharmAnimation] = useState(false);
    const [mintedCharmInfo, setMintedCharmInfo] = useState<CharmInfo | null>(null);
    const [showRelicActivation, setShowRelicActivation] = useState(false);
    const [showScoreResetAnimation, setShowScoreResetAnimation] = useState(false);
    const [scoreResetPreviousScore, setScoreResetPreviousScore] = useState(0);
    const [showLuckyScoreBoostAnimation, setShowLuckyScoreBoostAnimation] = useState(false);
    const [luckyScoreBoostTotal, setLuckyScoreBoostTotal] = useState(0);
    const [luckyScoreBoostBonus, setLuckyScoreBoostBonus] = useState(0);
    const [showCashOutAnimation, setShowCashOutAnimation] = useState(false);

    // Relic State
    const [equippedRelic, setEquippedRelic] = useState<OwnedRelic | null>(null);
    const [ownedRelics, setOwnedRelics] = useState<OwnedRelic[]>([]);
    const [isActivatingRelic, setIsActivatingRelic] = useState(false);
    const [isEquippingRelic, setIsEquippingRelic] = useState(false);
    const [relicCooldownRemaining, setRelicCooldownRemaining] = useState(0);
    const [relicIndex, setRelicIndex] = useState(0);
    const [scoreMultiplier, setScoreMultiplier] = useState(1);

    // Inline panel state
    const [itemToSell, setItemToSell] = useState<ContractItem | null>(null);
    const [isSelling, setIsSelling] = useState(false);
    const [hiddenItems, setHiddenItems] = useState<number[]>([]);
    const [inventoryRefreshTrigger, setInventoryRefreshTrigger] = useState(0);
    const [marketRefreshTrigger, setMarketRefreshTrigger] = useState(0);
    const [optimisticItems, setOptimisticItems] = useState<ContractItem[]>([]);
    const [currentLuck, setCurrentLuck] = useState<number | undefined>(undefined);
    const [lastMarketEvent, setLastMarketEvent] = useState<import('@/utils/gameEvents').MarketRefreshedEvent | null>(null);

    // Score bonuses
    const [scoreBonuses, setScoreBonuses] = useState<ScoreBonuses>({ seven: 0, diamond: 0, cherry: 0, coin: 0, lemon: 0 });
    const scoreBonusesRef = useRef(scoreBonuses);
    const symbolScoresRef = useRef(symbolScores);
    const scoreMultiplierRef = useRef(1);
    const previousLevelRef = useRef<number>(1);
    const lastKnownTotalSpinsRef = useRef<number>(0);
    const knownCharmTokenIdsRef = useRef<Set<string>>(new Set());
    const latestScoreBonusRequestRef = useRef(0);

    // Audio
    const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
    const spinSoundRef = useRef<HTMLAudioElement | null>(null);

    const loadChipEconomyConfig = useCallback(async () => {
        if (chipEconomyConfigRef.current) {
            return chipEconomyConfigRef.current;
        }

        const config = await getGameConfig(chainId);
        const resolved = {
            emissionRate: config.chipEmissionRate,
            boostMultiplier: config.chipBoostMultiplier,
        };
        chipEconomyConfigRef.current = resolved;
        return resolved;
    }, [chainId]);

    const calculateChipPayout = useCallback((
        scoreValue: number,
        bonusUnits = 0,
        emissionRate = 1,
        boostMultiplier = 1,
    ) => {
        const baseUnits = Math.floor(Math.max(0, scoreValue) / CHIP_SCORE_DIVISOR);
        return (baseUnits + Math.max(0, bonusUnits)) * emissionRate * boostMultiplier;
    }, []);

    const resolveChipPayout = useCallback(async (
        _targetSessionId: number,
        fallbackScore: number,
        fallbackBonusUnits = 0,
    ) => {
        try {
            const { emissionRate, boostMultiplier } = await loadChipEconomyConfig();
            return calculateChipPayout(
                fallbackScore,
                fallbackBonusUnits,
                emissionRate,
                boostMultiplier,
            );
        } catch (configError) {
            console.warn('Failed to resolve chip economy config, using minimal fallback', configError);
            return calculateChipPayout(fallbackScore, fallbackBonusUnits);
        }
    }, [calculateChipPayout, loadChipEconomyConfig]);

    const resolveDiamondChipBonusUnits = useCallback(async (targetSessionId: number) => {
        try {
            return await getSessionChipBonusUnits(targetSessionId);
        } catch (error) {
            console.warn('Failed to resolve diamond chip bonus units from chain', error);
            return 0;
        }
    }, []);

    useEffect(() => { scoreBonusesRef.current = scoreBonuses; }, [scoreBonuses]);
    useEffect(() => { symbolScoresRef.current = symbolScores; }, [symbolScores]);
    useEffect(() => { scoreMultiplierRef.current = scoreMultiplier; }, [scoreMultiplier]);

    useEffect(() => {
        if (gameOverReason && !showRelicActivation && !mintedCharmInfo && !showGameOver) {
            setShowGameOver(true);
        }
    }, [gameOverReason, showRelicActivation, mintedCharmInfo, showGameOver]);

    const getCachedAudio = (soundName: string): HTMLAudioElement => {
        if (!audioCacheRef.current.has(soundName)) {
            const audio = new Audio(`/sounds/${soundName}${soundName === 'win' ? '.wav' : '.mp3'}`);
            audio.preload = 'auto';
            audioCacheRef.current.set(soundName, audio);
        }
        return audioCacheRef.current.get(soundName)!;
    };

    const playSound = (soundName: 'spin' | 'win' | 'jackpot' | 'game-over', durationMs?: number): HTMLAudioElement | null => {
        try {
            const audio = getCachedAudio(soundName);
            audio.volume = 0.5;
            audio.loop = soundName === 'spin';
            if (soundName !== 'spin') audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => { /* browser autoplay blocked */ });
            }
            if (durationMs) {
                setTimeout(() => { audio.pause(); audio.currentTime = 0; }, durationMs);
            }
            return audio;
        } catch {
            return null;
        }
    };

    const loadScoreBonuses = async () => {
        const requestId = ++latestScoreBonusRequestRef.current;
        try {
            const hidden = new Set(hiddenItems);
            const seen = new Set<number>();
            let allItems = [...initialInventoryItems, ...optimisticItems].filter((item) => {
                if (!item || hidden.has(item.item_id) || seen.has(item.item_id)) {
                    return false;
                }

                seen.add(item.item_id);
                return true;
            });

            if (allItems.length === 0 && sessionId) {
                allItems = (await resolveInventoryItems(Number(sessionId))).filter(
                    (item) => !hidden.has(item.item_id),
                );
            }

            if (requestId !== latestScoreBonusRequestRef.current) {
                return;
            }

            const bonuses: ScoreBonuses = { seven: 0, diamond: 0, cherry: 0, coin: 0, lemon: 0 };
            for (const item of allItems) {
                if (isCharmItem(item.item_id)) {
                    continue;
                }
                const info = await getItemInfo(item.item_id);
                if (info.effect_type === ItemEffectType.DirectScoreBonus) {
                    const symbol = info.target_symbol.toLowerCase() as keyof ScoreBonuses;
                    if (symbol in bonuses) bonuses[symbol] += info.effect_value;
                }
            }
            setScoreBonuses(bonuses);
        } catch (err) {
            console.error("Failed to load score bonuses:", err);
        }
    };

    useEffect(() => {
        void loadScoreBonuses();
    }, [optimisticItems, inventoryRefreshTrigger, hiddenItems, initialInventoryItems, sessionId]);

    const resolveInventoryItems = useCallback(async (targetSessionId: number) => {
        const playerItems = await getSessionItems(targetSessionId);
        const items = await Promise.all(playerItems.map(async (pi) => {
            if (pi.item_id >= 1000) {
                const charmInfo = await getCharmInfo(pi.item_id - 1000);
                if (!charmInfo) return null;
                return {
                    item_id: pi.item_id,
                    name: charmInfo.name,
                    description: charmInfo.description,
                    price: charmInfo.shop_cost,
                    sell_price: Math.floor(charmInfo.shop_cost / 2),
                    effect_type: 7 as ItemEffectType,
                    effect_value: charmInfo.luck,
                    target_symbol: `${charmInfo.rarity}|||${charmInfo.effect}`,
                    image: charmInfo.image,
                    charmInfo,
                } as ContractItem;
            }
            return getItemInfo(pi.item_id);
        }));

        return items.filter((item): item is ContractItem => item !== null);
    }, []);

    const getLocalBuildItems = useCallback(() => {
        const hidden = new Set(hiddenItems);
        const seen = new Set<number>();
        const build: ContractItem[] = [];

        for (const item of [...initialInventoryItems, ...optimisticItems]) {
            if (!item || hidden.has(item.item_id) || seen.has(item.item_id)) {
                continue;
            }

            seen.add(item.item_id);
            build.push(item);
        }

        return build;
    }, [hiddenItems, initialInventoryItems, optimisticItems]);

    const hideInventoryItem = useCallback((itemId: number) => {
        setInitialInventoryItems((prev) => prev.filter((item) => item.item_id !== itemId));
        setOptimisticItems((prev) => prev.filter((item) => item.item_id !== itemId));
        setHiddenItems((prev) => (
            prev.includes(itemId) ? prev : [...prev, itemId]
        ));
    }, []);

    const registerInventoryItemAcquired = useCallback((item: ContractItem) => {
        setHiddenItems((prev) => prev.filter((hiddenItemId) => hiddenItemId !== item.item_id));
        setOptimisticItems((prev) => {
            const next = prev.filter((existing) => existing.item_id !== item.item_id);
            return [...next, item];
        });
    }, []);

    const captureGameOverBuild = useCallback(async () => {
        const fallbackBuild = getLocalBuildItems();
        if (!sessionId) {
            setGameOverBuildItems(fallbackBuild);
            return fallbackBuild;
        }

        try {
            const chainBuild = await resolveInventoryItems(Number(sessionId));
            const nextBuild = chainBuild.length > 0 ? chainBuild : fallbackBuild;
            setGameOverBuildItems(nextBuild);
            return nextBuild;
        } catch (error) {
            console.warn("Failed to resolve final build from chain, using local snapshot", error);
            setGameOverBuildItems(fallbackBuild);
            return fallbackBuild;
        }
    }, [getLocalBuildItems, resolveInventoryItems, sessionId]);

    const syncOwnedCharmSnapshot = useCallback(async () => {
        if (!account || !CONTRACTS.CHARM_NFT || CONTRACTS.CHARM_NFT === '0x0') {
            knownCharmTokenIdsRef.current = new Set();
            return [];
        }

        const tokenIds = await getPlayerCharms(
            chainId,
            CONTRACTS.CHARM_NFT,
            account.address,
        );

        knownCharmTokenIdsRef.current = new Set(tokenIds.map((tokenId) => tokenId.toString()));
        return tokenIds;
    }, [account, chainId]);

    const resolveMintedCharmInfo = useCallback(async (eventCharm?: { charmId?: number } | null) => {
        if (eventCharm?.charmId) {
            const info = await getCharmInfo(eventCharm.charmId);
            try {
                await syncOwnedCharmSnapshot();
            } catch (error) {
                console.warn('Failed to refresh owned charm snapshot after charm event', error);
            }
            return info;
        }

        if (!account || !CONTRACTS.CHARM_NFT || CONTRACTS.CHARM_NFT === '0x0') {
            return null;
        }

        try {
            const previousTokenIds = knownCharmTokenIdsRef.current;
            const tokenIds = await getPlayerCharms(
                chainId,
                CONTRACTS.CHARM_NFT,
                account.address,
            );
            const nextTokenIds = new Set(tokenIds.map((tokenId) => tokenId.toString()));
            const newTokenIds = tokenIds.filter((tokenId) => !previousTokenIds.has(tokenId.toString()));
            knownCharmTokenIdsRef.current = nextTokenIds;

            if (newTokenIds.length === 0) {
                return null;
            }

            newTokenIds.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
            const newestTokenId = newTokenIds[newTokenIds.length - 1];
            const metadata = await getCharmMetadata(
                chainId,
                CONTRACTS.CHARM_NFT,
                newestTokenId,
            );

            if (!metadata?.charmId) {
                return null;
            }

            return await getCharmInfo(metadata.charmId);
        } catch (error) {
            console.warn('Failed to resolve minted charm from ownership diff', error);
            return null;
        }
    }, [account, chainId, syncOwnedCharmSnapshot]);

    useEffect(() => {
        if (!account) {
            knownCharmTokenIdsRef.current = new Set();
            return;
        }

        void syncOwnedCharmSnapshot();
    }, [account, syncOwnedCharmSnapshot]);

    const loadOwnedRelics = async () => {
        if (!account) return;
        try {
            const result = await rpcProvider.callContract({
                contractAddress: CONTRACTS.RELIC_NFT,
                entrypoint: "get_player_relics",
                calldata: [account.address],
            });
            const length = Number(result[0]);
            const relics: OwnedRelic[] = [];
            for (let i = 0; i < length; i++) {
                const low = BigInt(result[1 + i * 2]);
                const high = BigInt(result[1 + i * 2 + 1]);
                const tokenId = low + (high << BigInt(128));
                const metaResult = await rpcProvider.callContract({
                    contractAddress: CONTRACTS.RELIC_NFT,
                    entrypoint: "get_relic_metadata",
                    calldata: [low.toString(), high.toString()]
                });
                const relicId = Number(metaResult[0]);
                const cooldown = Number(metaResult[4]);
                if (relicId > 0) {
                    relics.push({ tokenId, relicId, name: RELIC_NAMES[relicId] || `Relic #${relicId}`, cooldown });
                }
            }
            setOwnedRelics(relics);
        } catch (err) {
            console.error("Failed to load owned relics:", err);
        }
    };

    const loadSessionData = async (reason: string = 'generic') => {
        if (!sessionId) return null;
        try {
            const data = await getSessionData(Number(sessionId));
            if (!data) return null;

            logSpinDebug('session:loaded', {
                reason,
                snapshot: summarizeSessionSnapshot(data),
            });

            setSymbolScores(data.symbolScores);
            setBlocked666(data.blocked666);
            if (data.relicPendingEffect !== undefined) setPendingRelicEffect(data.relicPendingEffect);

            if (data.level > previousLevelRef.current && previousLevelRef.current > 0) {
                setShowLevelUp(true);
                setTimeout(() => setShowLevelUp(false), 1600);
            }
            previousLevelRef.current = data.level;
            setScore(data.score);
            setLevel(data.level);
            setTickets(data.tickets);
            const effectiveLuck = await getSessionLuck(Number(sessionId)).catch(() => data.luck);
            setCurrentLuck(effectiveLuck);
            const resolvedDiamondBonus = await resolveDiamondChipBonusUnits(Number(sessionId));
            setDiamondChipBonusUnits(resolvedDiamondBonus);

            if (data.totalSpins >= lastKnownTotalSpinsRef.current) {
                setSpinsRemaining(data.spinsRemaining);
                lastKnownTotalSpinsRef.current = data.totalSpins;
            }
            if (data.symbolScores?.length === 5) setSymbolScores(data.symbolScores);
            setIsSessionActive(data.isActive);
            setChipsClaimed(data.chipsClaimed);

            const th = await getLevelThreshold(data.level);
            setThreshold(th);
            const prob = await get666Probability(data.level);
            setRisk(prob / 10);

            if (data.relicPendingEffect === 2) {
                setScoreMultiplier(5);
                scoreMultiplierRef.current = 5;
            } else {
                setScoreMultiplier(1);
                scoreMultiplierRef.current = 1;
            }

            // Sync equipped relic
            if (data.equippedRelic > BigInt(0)) {
                try {
                    const tokenId = data.equippedRelic;
                    const mask128 = (BigInt(1) << BigInt(128)) - BigInt(1);
                    const low = tokenId & mask128;
                    const high = tokenId >> BigInt(128);
                    const metaResult = await rpcProvider.callContract({
                        contractAddress: CONTRACTS.RELIC_NFT,
                        entrypoint: "get_relic_metadata",
                        calldata: [low.toString(), high.toString()]
                    });
                    const relicId = Number(metaResult[0]);
                    const cooldown = Number(metaResult[4]);
                    setEquippedRelic({
                        tokenId, relicId,
                        name: RELIC_NAMES[relicId] || `Relic #${relicId}`,
                        cooldown
                    });
                    if (data.relicLastUsedSpin === 0) {
                        setRelicCooldownRemaining(0);
                    } else {
                        setRelicCooldownRemaining(
                            Math.max(0, cooldown - (data.totalSpins + 1 - data.relicLastUsedSpin)),
                        );
                    }
                } catch (relicErr) {
                    console.error("Failed to fetch equipped relic metadata:", relicErr);
                }
            } else {
                setEquippedRelic(null);
                setRelicCooldownRemaining(0);
            }

            return data;
        } catch (err) {
            console.error("Failed to load session:", err);
            logSpinDebug('session:error', {
                reason,
                error: err,
            });
            return null;
        }
    };

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const resolveLatestSpinResult = async () => {
        if (!sessionId) return null;

        for (let attempt = 0; attempt < 3; attempt++) {
            logSpinDebug('spin:fallback:attempt', {
                sessionId: Number(sessionId),
                attempt,
            });
            const spinResult = await getLastSpinResult(Number(sessionId));
            logSpinDebug('spin:fallback:spin-result', {
                attempt,
                spinResult: summarizeSpinResultSnapshot(spinResult),
            });
            if (spinResult && spinResult.grid.length === 15 && !spinResult.isPending) {
                return spinResult;
            }

            await loadSessionData(`resolveLatestSpinResult:attempt:${attempt}`);
            await delay(200);
        }

        return null;
    };

    // Initialize game
    useEffect(() => {
        const initializeGame = async () => {
            if (!sessionId || !isReady) return;
            setIsInitialLoading(true);
            try {
                const sessionPromise = loadSessionData();
                const bonusPromise = loadScoreBonuses();
                const relicPromise = loadOwnedRelics();

                const marketPromise = (async () => {
                    try {
                        const market = await getSessionMarket(Number(sessionId));
                        if (!market) return [];
                        const itemIds = [market.item_slot_1, market.item_slot_2, market.item_slot_3, market.item_slot_4, market.item_slot_5, market.item_slot_6];
                        const items: ContractItem[] = [];
                        for (const id of itemIds) {
                            if (isCharmItem(id)) {
                                const charmId = getCharmIdFromItemId(id);
                                const charmInfo = await getCharmInfo(charmId);
                                if (charmInfo) {
                                    items.push({ item_id: id, name: charmInfo.name, description: charmInfo.description, price: charmInfo.shop_cost, sell_price: 0, effect_type: 7 as ItemEffectType, effect_value: charmInfo.luck, target_symbol: charmInfo.rarity, image: charmInfo.image });
                                }
                            } else {
                                items.push(await getItemInfo(id));
                            }
                        }
                        setInitialMarketItems(items);
                        return items;
                    } catch { return []; }
                })();

                const inventoryPromise = (async () => {
                    try {
                        const items = await resolveInventoryItems(Number(sessionId));
                        setInitialInventoryItems(items);
                        return items;
                    } catch { return []; }
                })();

                await Promise.all([sessionPromise, bonusPromise, relicPromise, marketPromise, inventoryPromise]);
            } catch (e) {
                console.error("Initialization failed", e);
            } finally {
                setIsInitialLoading(false);
            }
        };
        initializeGame();
    }, [sessionId, isReady]);

    const handleSpin = useCallback(async () => {
        if (!sessionId || isSpinning || spinsRemaining <= 0 || showGameOver || !isSessionActive) return;

        setIsSpinning(true);
        setError(null);
        setPatterns([]);
        setShowingPatterns(false);
        setGameOverReason(null);
        setShowLuckyScoreBoostAnimation(false);
        setLuckyScoreBoostTotal(0);
        setLuckyScoreBoostBonus(0);
        setBibliaBroken(false);
        spinSoundRef.current = playSound('spin');

        try {
            const luckyWasActive = pendingRelicEffect === 2;
            const consumableRelicEffect =
                pendingRelicEffect === 0 || pendingRelicEffect === 2 ? pendingRelicEffect : null;

            logSpinDebug('spin:start', {
                sessionId: Number(sessionId),
                uiBefore: {
                    level,
                    score,
                    tickets,
                    spinsRemaining,
                    isSessionActive,
                    risk,
                    threshold,
                },
            });
            const events = await requestSpin(Number(sessionId));
            logSpinDebug('spin:events', events);

            if (spinSoundRef.current) {
                spinSoundRef.current.pause();
                spinSoundRef.current.currentTime = 0;
                spinSoundRef.current = null;
            }

            if (events.spinCompleted && events.spinCompleted.grid.length === 15) {
                const spin = events.spinCompleted;
                logSpinDebug('spin:event:applied', {
                    spin,
                    uiBeforeApply: {
                        level,
                        score,
                        tickets,
                        spinsRemaining,
                    },
                });
                setGrid(spin.grid);
                setHasSpunOnce(true);
                setScore(prev => spin.is666 ? 0 : prev + spin.scoreGained);
                setLevel(spin.newLevel);
                if (spin.symbolScores?.length === 5) setSymbolScores(spin.symbolScores);
                setSpinsRemaining(spin.spinsRemaining);
                setIsSessionActive(spin.isActive);
                setBlocked666(spin.is666);
                if (spin.currentLuck !== undefined) setCurrentLuck(spin.currentLuck);
                setDiamondChipBonusUnits(spin.chipBonusUnits);

                if (spin.is666) {
                    setScoreResetPreviousScore(score);
                    setShowScoreResetAnimation(true);
                    setPatterns([]);
                    setShowingPatterns(false);
                    playSound('game-over');
                }

                if (spin.newLevel > previousLevelRef.current && previousLevelRef.current > 0) {
                    setShowLevelUp(true);
                    setTimeout(() => setShowLevelUp(false), 1600);
                    const awardedTickets = getTicketsAwardedForLevelTransition(
                        previousLevelRef.current,
                        spin.newLevel,
                    );
                    setTickets(prev => prev + awardedTickets);
                }
                if (consumableRelicEffect !== null) {
                    setPendingRelicEffect(null);
                }
                previousLevelRef.current = spin.newLevel;
                setRelicCooldownRemaining(prev => Math.max(0, prev - 1));
                setIsSpinning(false);

                const [th, prob] = await Promise.all([
                    getLevelThreshold(spin.newLevel),
                    get666Probability(spin.newLevel),
                ]);
                setThreshold(th);
                setRisk(prob / 10);
                if (DEBUG_SPIN_SYNC) {
                    const latestSession = await getSessionData(Number(sessionId));
                    logSpinDebug('spin:event:post-load', {
                        session: summarizeSessionSnapshot(latestSession),
                    });
                }

                let detectedPatterns: Pattern[] = [];

                if (!spin.is666) {
                    detectedPatterns = detectPatterns(spin.grid, undefined, scoreBonusesRef.current, spin.symbolScores);

                    try {
                        const sessionItems = await resolveInventoryItems(Number(sessionId));
                        detectedPatterns = applyPatternModifiers(detectedPatterns, sessionItems);
                    } catch {
                        /* ignore */
                    }

                    setPatterns(detectedPatterns);
                    if (detectedPatterns.length > 0) {
                        setShowingPatterns(true);
                    }
                }

                if (spin.bibliaUsed) {
                    const discarded = events.bibliaDiscarded?.discarded ?? true;
                    setBibliaDiscarded(discarded);
                    if (discarded) {
                        setBibliaBroken(true);
                        hideInventoryItem(BIBLIA_ITEM_ID);
                    }
                    setShowBibliaAnimation(true);
                    setInventoryRefreshTrigger(prev => prev + 1);
                    loadScoreBonuses();
                }

                if (events.cashOutResolved) {
                    hideInventoryItem(CASH_OUT_ITEM_ID);
                    setInventoryRefreshTrigger(prev => prev + 1);
                    loadScoreBonuses();
                    if (events.cashOutResolved.succeeded) {
                        setShowCashOutAnimation(true);
                    }
                }

                if (spin.isJackpot) playSound('jackpot');

                const patternDuration = spin.is666 ? 1400 : detectedPatterns.length * 600;
                const shouldRevealLuckyBoost = luckyWasActive && !spin.is666 && spin.scoreGained > 0;
                const luckyRevealDelay = shouldRevealLuckyBoost
                    ? (detectedPatterns.length > 0 ? patternDuration + 120 : 420)
                    : 0;
                const luckyRevealDuration = shouldRevealLuckyBoost ? 1300 : 0;
                const sequenceDelay = events.cashOutResolved?.succeeded
                    ? 2400
                    : spin.is666
                        ? 1900
                        : Math.max(1000, patternDuration + 800) + luckyRevealDuration;

                if (shouldRevealLuckyBoost) {
                    const baseScore = Math.floor(spin.scoreGained / 5);
                    const luckyBonus = Math.max(0, spin.scoreGained - baseScore);

                    window.setTimeout(() => {
                        setLuckyScoreBoostTotal(spin.scoreGained);
                        setLuckyScoreBoostBonus(luckyBonus);
                        setShowLuckyScoreBoostAnimation(true);
                    }, luckyRevealDelay);
                }

                setTimeout(async () => {
                    let hasCharm = false;
                    const mintedCharm = await resolveMintedCharmInfo(events.charmMinted);
                    if (mintedCharm) {
                        setMintedCharmInfo(mintedCharm);
                        hasCharm = true;
                    }

                    if (spin.spinsRemaining <= 0) {
                        playSound('game-over');
                        // Receipt is the authoritative source for final tally —
                        // React state `score` can lag behind and Torii/RPC may be stale.
                        const finalBalance = spin.is666 ? 0 : spin.newTotalScore;
                        const finalLifetimeScore = spin.newTotalScore;
                        const finalDiamondBonus = spin.chipBonusUnits;

                        // Still fetch session for background sync/other fields
                        const latestSession = await loadSessionData('spin:event-path:game-over');
                        await captureGameOverBuild();

                        setDiamondChipBonusUnits(finalDiamondBonus);
                        const earnedChips = await resolveChipPayout(
                            Number(sessionId),
                            finalBalance,
                            finalDiamondBonus,
                        );

                        setFinalScore(finalBalance);
                        setFinalTotalScore(finalLifetimeScore);
                        setChipsEarned(earnedChips);
                        if (latestSession) {
                            setChipsClaimed(latestSession.chipsClaimed);
                        }
                        setGameOverReason('no_spins');
                        if (hasCharm) { setShowCharmAnimation(true); }
                        else { setShowGameOver(true); }
                    } else if (hasCharm) {
                        setShowCharmAnimation(true);
                    }
                }, sequenceDelay);
            } else {
                console.warn('SpinCompleted event not found in receipt, retrying from indexed state:', events);
                const spinResult = await resolveLatestSpinResult();
                logSpinDebug('spin:fallback:resolved', {
                    spinResult: summarizeSpinResultSnapshot(spinResult),
                });

                if (spinResult && spinResult.grid.length === 15) {
                    const latestSession = await loadSessionData('spin:fallback:post-resolve');
                    const mintedCharm = await resolveMintedCharmInfo(events.charmMinted);
                    const hasCharm = Boolean(mintedCharm);
                    if (mintedCharm) {
                        setMintedCharmInfo(mintedCharm);
                    }
                    setGrid(spinResult.grid);
                    setHasSpunOnce(true);
                    if (latestSession) {
                        setScore(latestSession.score);
                        setLevel(latestSession.level);
                        setTickets(latestSession.tickets);
                        setSpinsRemaining(latestSession.spinsRemaining);
                        setIsSessionActive(latestSession.isActive);
                        if (latestSession.symbolScores?.length === 5) {
                            setSymbolScores(latestSession.symbolScores);
                        }
                        const th = await getLevelThreshold(latestSession.level);
                        setThreshold(th);
                        const prob = await get666Probability(latestSession.level);
                        setRisk(prob / 10);
                        setBlocked666(latestSession.blocked666);
                    } else {
                        setScore(spinResult.is666 ? 0 : score);
                    }
                    if (consumableRelicEffect !== null) {
                        setPendingRelicEffect(null);
                    }
                    setIsSpinning(false);

                    if (spinResult.is666) {
                        setScoreResetPreviousScore(score);
                        setShowScoreResetAnimation(true);
                        setPatterns([]);
                        setShowingPatterns(false);
                        playSound('game-over');
                    } else {
                        const basePatterns = detectPatterns(
                            spinResult.grid,
                            undefined,
                            scoreBonusesRef.current,
                            symbolScoresRef.current,
                        );
                        let detectedPatterns = basePatterns;

                        try {
                            const sessionItems = await resolveInventoryItems(Number(sessionId));
                            detectedPatterns = applyPatternModifiers(basePatterns, sessionItems);
                        } catch {
                            /* ignore */
                        }

                        setPatterns(detectedPatterns);
                        setShowingPatterns(detectedPatterns.length > 0);
                    }

                    if (luckyWasActive && !spinResult.is666 && spinResult.score > 0) {
                        const luckyBonus = Math.max(0, spinResult.score - Math.floor(spinResult.score / 5));
                        window.setTimeout(() => {
                            setLuckyScoreBoostTotal(spinResult.score);
                            setLuckyScoreBoostBonus(luckyBonus);
                            setShowLuckyScoreBoostAnimation(true);
                        }, 420);
                    }

                    if (spinResult.bibliaUsed) {
                        const discarded = events.bibliaDiscarded?.discarded ?? false;
                        setBibliaDiscarded(discarded);
                        setBibliaBroken(discarded);
                        if (discarded) {
                            hideInventoryItem(BIBLIA_ITEM_ID);
                        }
                        setShowBibliaAnimation(true);
                        setInventoryRefreshTrigger(prev => prev + 1);
                        loadScoreBonuses();
                    }

                    if (events.cashOutResolved) {
                        hideInventoryItem(CASH_OUT_ITEM_ID);
                        setInventoryRefreshTrigger(prev => prev + 1);
                        loadScoreBonuses();
                        if (events.cashOutResolved.succeeded) {
                            setShowCashOutAnimation(true);
                        }
                    }

                    if (spinResult.is666 || latestSession?.blocked666) {
                        logSpinDebug('spin:fallback:666-detected', {
                            spinResult: summarizeSpinResultSnapshot(spinResult),
                            latestSession: summarizeSessionSnapshot(latestSession),
                        });
                    }

                    if (!latestSession?.isActive || (latestSession?.spinsRemaining ?? 0) <= 0) {
                        await captureGameOverBuild();
                        const resolvedScore = latestSession?.score ?? spinResult.score ?? 0;
                        const finalDiamondBonus = await resolveDiamondChipBonusUnits(Number(sessionId));
                        setDiamondChipBonusUnits(finalDiamondBonus);
                        const earnedChips = await resolveChipPayout(
                            Number(sessionId),
                            resolvedScore,
                            finalDiamondBonus,
                        );
                        setFinalScore(latestSession?.score ?? spinResult.score ?? 0);
                        setFinalTotalScore(latestSession?.totalScore ?? latestSession?.score ?? spinResult.score ?? 0);
                        setChipsEarned(earnedChips);
                        if (latestSession) {
                            setChipsClaimed(latestSession.chipsClaimed);
                        }
                        setGameOverReason('no_spins');
                        if (hasCharm) {
                            setShowCharmAnimation(true);
                        } else {
                            setShowGameOver(true);
                        }
                    } else if (hasCharm) {
                        setShowCharmAnimation(true);
                    }
                } else {
                    if (DEBUG_SPIN_SYNC) {
                        const latestSession = await getSessionData(Number(sessionId));
                        logSpinDebug('spin:fallback:missing-data', {
                            events,
                            latestSession: summarizeSessionSnapshot(latestSession),
                        });
                    }
                    setError("Spin data missing");
                    setIsSpinning(false);
                }
            }
        } catch (err) {
            console.error("Spin failed:", err);
            logSpinDebug('spin:error', {
                error: err,
            });
            setError("Spin failed");
            setIsSpinning(false);
            if (spinSoundRef.current) {
                spinSoundRef.current.pause();
                spinSoundRef.current.currentTime = 0;
                spinSoundRef.current = null;
            }
            await loadSessionData('spin:catch');
        }
    }, [sessionId, isSpinning, spinsRemaining, showGameOver, isSessionActive, requestSpin, score, level, tickets, risk, threshold, pendingRelicEffect, getLevelThreshold, get666Probability, resolveMintedCharmInfo, captureGameOverBuild, getLocalBuildItems, hideInventoryItem, resolveChipPayout, resolveDiamondChipBonusUnits]);

    const handleActivateRelic = useCallback(async () => {
        if (!equippedRelic || !sessionId || isActivatingRelic || relicCooldownRemaining > 0) return;
        setIsActivatingRelic(true);
        try {
            const shouldEndSession = equippedRelic.relicId === 4;
            const events = await activateRelic(Number(sessionId), equippedRelic.relicId);
            const mintedCharm = await resolveMintedCharmInfo(events?.charmMinted);
            setShowRelicActivation(!shouldEndSession);
            setRelicCooldownRemaining(equippedRelic.cooldown);

            if (events?.relicActivated) {
                const { relicActivated } = events;
                const rId = (relicActivated as any).relicId || (relicActivated as any).relic_id;
                const eType = (relicActivated as any).effectType || (relicActivated as any).effect_type;
                if (relicActivated.currentLuck !== undefined) {
                    setCurrentLuck(relicActivated.currentLuck);
                }
                const isScorcher = rId === 4;

                if (!isScorcher && (eType === 0 || eType === 1 || eType === 2)) {
                    setPendingRelicEffect(eType);
                } else if (eType === 3) {
                    setPendingRelicEffect(null);
                    await loadSessionData('relic:reset-spins');
                } else if (eType === 4) {
                    setPendingRelicEffect(null);
                } else {
                    setPendingRelicEffect(null);
                }

                if (isScorcher) {
                    setShowRelicActivation(false);
                    await captureGameOverBuild();
                    setFinalScore(score);
                    setFinalTotalScore(score);
                    const finalDiamondBonus = await resolveDiamondChipBonusUnits(Number(sessionId));
                    setDiamondChipBonusUnits(finalDiamondBonus);
                    setChipsEarned(await resolveChipPayout(Number(sessionId), score, finalDiamondBonus));
                    setChipsClaimed(false);
                    setGameOverReason('scorched');
                    setIsSessionActive(false);
                    setSpinsRemaining(0);
                    setPendingRelicEffect(null);
                    if (mintedCharm) {
                        setMintedCharmInfo(mintedCharm);
                        setShowCharmAnimation(true);
                    } else {
                        setShowGameOver(true);
                    }
                    return;
                }
            }

            if (events?.marketRefreshed) {
                setLastMarketEvent(events.marketRefreshed);
            } else {
                setMarketRefreshTrigger(prev => prev + 1);
            }

            const spinResult = await getLastSpinResult(Number(sessionId));
            if (spinResult && spinResult.grid.length === 15) {
                setGrid(spinResult.grid);
            }
        } catch (err) {
            console.error(`Failed to activate relic:`, err);
        } finally {
            setIsActivatingRelic(false);
        }
    }, [equippedRelic, sessionId, isActivatingRelic, relicCooldownRemaining, activateRelic, getLastSpinResult, captureGameOverBuild, score, resolveMintedCharmInfo, loadSessionData, resolveChipPayout]);

    const handleEquipRelic = useCallback(async (relic: OwnedRelic) => {
        if (!sessionId || equippedRelic) return;
        setIsEquippingRelic(true);
        try {
            await equipRelic(Number(sessionId), relic.tokenId);
            setEquippedRelic(relic);
            setRelicCooldownRemaining(0);
        } catch (err) {
            console.error(err);
        } finally {
            setIsEquippingRelic(false);
        }
    }, [sessionId, equippedRelic, equipRelic]);

    const handleSellConfirm = useCallback(async () => {
        if (!itemToSell || !sessionId || !account) return;
        setIsSelling(true);
        try {
            const events = await sellItemHook(Number(sessionId), itemToSell.item_id);
            const soldItemId = itemToSell.item_id;
            const soldEvent = events.itemsSold[0];
            if (soldEvent) {
                setScore(soldEvent.newScore);
                setTickets(soldEvent.newTickets);
                setCurrentLuck(soldEvent.currentLuck);
                if (itemToSell.effect_type === ItemEffectType.DirectScoreBonus && itemToSell.target_symbol) {
                    setSymbolScores((prev) => {
                        const next = [...prev];
                        const delta = itemToSell.effect_value;
                        if (itemToSell.target_symbol === 'seven') next[0] = Math.max(0, (next[0] ?? 0) - delta);
                        else if (itemToSell.target_symbol === 'diamond') next[1] = Math.max(0, (next[1] ?? 0) - delta);
                        else if (itemToSell.target_symbol === 'cherry') next[2] = Math.max(0, (next[2] ?? 0) - delta);
                        else if (itemToSell.target_symbol === 'coin') next[3] = Math.max(0, (next[3] ?? 0) - delta);
                        else if (itemToSell.target_symbol === 'lemon') next[4] = Math.max(0, (next[4] ?? 0) - delta);
                        return next;
                    });
                }
            } else {
                await loadSessionData('sell:fallback');
            }
            setInitialInventoryItems(prev => prev.filter(item => item.item_id !== soldItemId));
            setOptimisticItems(prev => prev.filter(item => item.item_id !== soldItemId));
            setInventoryRefreshTrigger(prev => prev + 1);
            hideInventoryItem(soldItemId);
            setItemToSell(null);
        } catch (e) {
            console.error("Sell failed", e);
        } finally {
            setIsSelling(false);
        }
    }, [itemToSell, sessionId, account, sellItemHook, loadSessionData, hideInventoryItem]);

    return {
        // Core game state
        level, score, threshold, risk, tickets, spinsRemaining,
        isSessionActive, grid, isSpinning, hasSpunOnce, error,
        showLevelUp, isInitialLoading, patterns, showingPatterns,
        symbolScores, blocked666, pendingRelicEffect,
        setScore, setTickets, setSpinsRemaining, setShowingPatterns, setSymbolScores,

        // Preloaded data
        initialMarketItems, initialInventoryItems,

        // Game over
        showGameOver, gameOverReason, finalScore, finalTotalScore, chipsEarned, diamondChipBonusUnits, chipsClaimed, gameOverBuildItems,
        setShowGameOver,

        // Animations
        showBibliaAnimation, bibliaDiscarded, bibliaBroken,
        showCharmAnimation, mintedCharmInfo,
        showRelicActivation, showScoreResetAnimation, scoreResetPreviousScore,
        showLuckyScoreBoostAnimation, luckyScoreBoostTotal, luckyScoreBoostBonus, showCashOutAnimation,
        setShowBibliaAnimation, setShowCharmAnimation, setMintedCharmInfo,
        setShowRelicActivation, setShowScoreResetAnimation, setShowLuckyScoreBoostAnimation, setShowCashOutAnimation, setGameOverReason,

        // Relics
        equippedRelic, ownedRelics, isActivatingRelic, isEquippingRelic,
        relicCooldownRemaining, relicIndex, setRelicIndex,

        // Inline panel state
        itemToSell, setItemToSell, isSelling, hiddenItems,
        inventoryRefreshTrigger, setInventoryRefreshTrigger,
        marketRefreshTrigger, setMarketRefreshTrigger, optimisticItems, setOptimisticItems,
        currentLuck, setCurrentLuck, lastMarketEvent, setLastMarketEvent, registerInventoryItemAcquired,

        // Actions
        handleSpin, handleActivateRelic, handleEquipRelic, handleSellConfirm,
        playSound,
    };
}
