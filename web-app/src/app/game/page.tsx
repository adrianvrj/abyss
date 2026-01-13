"use client";

import { useSearchParams } from "next/navigation";
import { useController } from "@/hooks/useController";
import { useAbyssGame } from "@/hooks/useAbyssGame";
import { useTransactionCart } from "@/hooks/useTransactionCart";
import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import SlotGrid from "@/components/SlotGrid";
import { useRouter } from "next/navigation";
import { FaShop, FaBoxOpen, FaCircleQuestion, FaHouse, FaSkullCrossbones } from "react-icons/fa6";
import { GiCrystalGrowth } from "react-icons/gi";


import Image from "next/image";
import MarketModal from "@/components/modals/MarketModal";
import InventoryModal from "@/components/modals/InventoryModal";
import InfoModal from "@/components/modals/InfoModal";
import RelicModal from "@/components/modals/RelicModal";
import { Pattern, detectPatterns, ScoreBonuses } from "@/utils/patternDetector";
import PatternOverlay from "@/components/PatternOverlay";
import BibliaSaveAnimation from "@/components/BibliaSaveAnimation";
import RelicActivationAnimation from "@/components/RelicActivationAnimation";
import { AnimatePresence } from "framer-motion";
import { getSessionItems, getItemInfo, ItemEffectType, ContractItem, sellItem, getCharmInfo, CharmInfo } from "@/utils/abyssContract"; // Keeping these for non-hook utils for now
import InlineMarketPanel from "@/components/InlineMarketPanel";
import InlineInventoryPanel from "@/components/InlineInventoryPanel";
import SellConfirmModal from "@/components/SellConfirmModal";
import GameHUD from "@/components/GameHUD";
import GameOverModal from '@/components/GameOverModal';
import LevelUpAnimation from "@/components/LevelUpAnimation";
import GameStatsPanel from '@/components/GameStatsPanel';
import CharmMintAnimation from "@/components/CharmMintAnimation";

function GameContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get("sessionId");

    const { account, address, username } = useController();
    const {
        isReady: isConnected,
        requestSpin,
        getLastSpinResult,
        getSessionData,
        getLevelThreshold,
        get666Probability,
        equipRelic,
        activateRelic,
        provider,
        sellItem: sellItemHook, // Rename to avoid conflict with imported utils
    } = useAbyssGame(account);

    // Transaction Cart for optimized multicall execution and receipt reading
    const txCart = useTransactionCart(account, provider);

    // Game State
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [threshold, setThreshold] = useState(100); // Next Level Threshold
    const [risk, setRisk] = useState(0); // 666 Risk %
    const [tickets, setTickets] = useState(0); // Ticket Master Currency
    const [spinsRemaining, setSpinsRemaining] = useState(5);
    const [isSessionActive, setIsSessionActive] = useState(true); // Track if session is still active
    const [patterns, setPatterns] = useState<Pattern[]>([]);


    const [grid, setGrid] = useState<number[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [hasSpunOnce, setHasSpunOnce] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [activeMobileTab, setActiveMobileTab] = useState<'home' | 'market' | 'inventory' | 'info'>('home');
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const previousLevelRef = useRef<number>(1);
    const lastKnownTotalSpinsRef = useRef<number>(0); // Track total spins to detect fresh data


    // Modals
    const [activeModal, setActiveModal] = useState<'market' | 'inventory' | 'info' | null>(null);

    // Game Over State
    const [showGameOver, setShowGameOver] = useState(false);
    const [gameOverReason, setGameOverReason] = useState<'666' | 'no_spins' | null>(null);
    const [finalScore, setFinalScore] = useState(0);
    const [finalTotalScore, setFinalTotalScore] = useState(0);
    const [chipsClaimed, setChipsClaimed] = useState(false);

    // Biblia Save Animation
    const [showBibliaAnimation, setShowBibliaAnimation] = useState(false);

    // Soul Charm Mint Animation (from spin receipt)
    const [showCharmAnimation, setShowCharmAnimation] = useState(false);
    const [mintedCharmInfo, setMintedCharmInfo] = useState<CharmInfo | null>(null);
    const spinReceiptRef = useRef<any>(null); // Store receipt to check for CharmMinted event

    // Relic State
    const [equippedRelic, setEquippedRelic] = useState<{ tokenId: bigint; relicId: number; name: string; cooldown: number } | null>(null);
    const [showRelicModal, setShowRelicModal] = useState(false);
    const [ownedRelics, setOwnedRelics] = useState<{ tokenId: bigint; relicId: number; name: string; cooldown: number }[]>([]);
    const [isActivatingRelic, setIsActivatingRelic] = useState(false);
    const [isEquippingRelic, setIsEquippingRelic] = useState(false);
    const [relicCooldownRemaining, setRelicCooldownRemaining] = useState(0);
    const [relicIndex, setRelicIndex] = useState(0);
    const [scoreMultiplier, setScoreMultiplier] = useState(1); // For double points relic
    const scoreMultiplierRef = useRef(1);
    const [showRelicActivation, setShowRelicActivation] = useState(false);
    const [bibliaDiscarded, setBibliaDiscarded] = useState(true);

    // Score bonuses from inventory
    const [scoreBonuses, setScoreBonuses] = useState<ScoreBonuses>({ seven: 0, diamond: 0, cherry: 0, coin: 0, lemon: 0 });
    const scoreBonusesRef = useRef(scoreBonuses);

    // Inline panel state (desktop)
    const [itemToSell, setItemToSell] = useState<ContractItem | null>(null);
    const [isSelling, setIsSelling] = useState(false);
    const [hiddenItems, setHiddenItems] = useState<number[]>([]);
    const [inventoryRefreshTrigger, setInventoryRefreshTrigger] = useState(0);
    const [optimisticItems, setOptimisticItems] = useState<any[]>([]); // Using any for now to avoid import churn, but it's ContractItem
    const [currentLuck, setCurrentLuck] = useState<number | undefined>(undefined);

    useEffect(() => {
        scoreBonusesRef.current = scoreBonuses;
    }, [scoreBonuses]);

    useEffect(() => {
        scoreMultiplierRef.current = scoreMultiplier;
    }, [scoreMultiplier]);

    useEffect(() => {
        loadScoreBonuses();
    }, [optimisticItems]);

    const loadScoreBonuses = async () => {
        if (!sessionId) return;
        try {
            const items = await getSessionItems(Number(sessionId));

            // Merge with optimistic items (deduplicated by ID to prevent double counting if not yet cleared)
            const ownedIds = new Set(items.map(i => i.item_id));
            const uniqueOptimistic = optimisticItems.filter(i => !ownedIds.has(i.item_id));
            const allItems = [...items, ...uniqueOptimistic];

            const bonuses: ScoreBonuses = { seven: 0, diamond: 0, cherry: 0, coin: 0, lemon: 0 };

            for (const item of allItems) {
                const info = await getItemInfo(item.item_id);
                if (info.effect_type === ItemEffectType.DirectScoreBonus) {
                    const symbol = info.target_symbol.toLowerCase() as keyof ScoreBonuses;
                    if (symbol in bonuses) {
                        bonuses[symbol] += info.effect_value;
                    }
                }
            }
            setScoreBonuses(bonuses);
        } catch (err) {
            console.error("Failed to load score bonuses:", err);
        }
    };

    // Relic name mapping for display
    const RELIC_NAMES: Record<number, string> = {
        1: 'Mortis',
        2: 'Phantom',
        3: 'Lucky the Dealer',
        4: 'Scorcher',
        5: 'Inferno',
    };

    const loadOwnedRelics = async () => {
        if (!account) return;
        try {
            const { RpcProvider } = await import('starknet');
            const { CONTRACTS } = await import('@/lib/constants');
            const provider = new RpcProvider({ nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia" });

            const result = await provider.callContract({
                contractAddress: CONTRACTS.RELIC_NFT,
                entrypoint: "get_player_relics",
                calldata: [account.address],
            });

            const length = Number(result[0]);
            const relics: { tokenId: bigint; relicId: number; name: string; cooldown: number }[] = [];

            for (let i = 0; i < length; i++) {
                const low = BigInt(result[1 + i * 2]);
                const high = BigInt(result[1 + i * 2 + 1]);
                const tokenId = low + (high << BigInt(128));

                const metaResult = await provider.callContract({
                    contractAddress: CONTRACTS.RELIC_NFT,
                    entrypoint: "get_relic_metadata",
                    calldata: [low.toString(), high.toString()]
                });
                const relicId = Number(metaResult[0]);
                // cooldown_spins is at index 4 in the struct
                const cooldown = Number(metaResult[4]);
                if (relicId > 0) {
                    relics.push({
                        tokenId,
                        relicId,
                        name: RELIC_NAMES[relicId] || `Relic #${relicId}`,
                        cooldown
                    });
                }
            }
            setOwnedRelics(relics);
        } catch (err) {
            console.error("Failed to load owned relics:", err);
        }
    };

    useEffect(() => {
        const initializeGame = async () => {
            if (sessionId && isConnected) {
                setIsInitialLoading(true);
                try {
                    await Promise.all([
                        loadSessionData(),
                        loadScoreBonuses(),
                        loadOwnedRelics()
                    ]);
                } finally {
                    setIsInitialLoading(false);
                }
            }
        };
        initializeGame();
    }, [sessionId, isConnected]);

    const loadSessionData = async () => {
        if (!sessionId) return null;
        try {
            const data = await getSessionData(Number(sessionId));
            if (data) {
                // Check for level up
                if (data.level > previousLevelRef.current && previousLevelRef.current > 0) {
                    setShowLevelUp(true);
                    setTimeout(() => setShowLevelUp(false), 1600);
                }
                previousLevelRef.current = data.level;
                setScore(data.score);
                setLevel(data.level);
                setTickets(data.tickets); // Sync tickets
                setCurrentLuck(data.luck); // Sync luck
                if (data.totalSpins >= lastKnownTotalSpinsRef.current) {
                    setSpinsRemaining(data.spinsRemaining);
                    lastKnownTotalSpinsRef.current = data.totalSpins;
                } else {
                    console.log('Stale data - skipping. Contract:', data.totalSpins, 'Expected:', lastKnownTotalSpinsRef.current);
                }
                setIsSessionActive(data.isActive);
                setChipsClaimed(data.chipsClaimed);
                const th = await getLevelThreshold(data.level);
                setThreshold(th);
                const prob = await get666Probability(data.level);
                setRisk(prob / 10);
                if (data.relicPendingEffect === 3) {
                    setScoreMultiplier(2);
                    scoreMultiplierRef.current = 2;
                } else {
                    setScoreMultiplier(1);
                    scoreMultiplierRef.current = 1;
                }

                // Sync equipped relic and cooldown from contract
                if (data.equippedRelic > BigInt(0)) {
                    // Fetch relic metadata directly from contract (don't rely on ownedRelics state)
                    try {
                        const { RpcProvider } = await import('starknet');
                        const { CONTRACTS } = await import('@/lib/constants');
                        const provider = new RpcProvider({ nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia" });

                        const tokenId = data.equippedRelic;
                        const mask128 = (BigInt(1) << BigInt(128)) - BigInt(1);
                        const low = tokenId & mask128;
                        const high = tokenId >> BigInt(128);
                        const metaResult = await provider.callContract({
                            contractAddress: CONTRACTS.RELIC_NFT,
                            entrypoint: "get_relic_metadata",
                            calldata: [low.toString(), high.toString()]
                        });
                        const relicId = Number(metaResult[0]);
                        const cooldown = Number(metaResult[4]);
                        const RELIC_NAMES_MAP: Record<number, string> = {
                            1: 'Mortis', 2: 'Phantom', 3: 'Lucky the Dealer', 4: 'Scorcher', 5: 'Inferno',
                        };

                        const relicData = {
                            tokenId: data.equippedRelic,
                            relicId,
                            name: RELIC_NAMES_MAP[relicId] || `Relic #${relicId}`,
                            cooldown
                        };

                        setEquippedRelic(relicData);
                        if (data.relicLastUsedSpin === 0) {
                            setRelicCooldownRemaining(0);
                        } else {
                            const spinsSinceLastUse = data.totalSpins - data.relicLastUsedSpin;
                            const cooldownRemaining = Math.max(0, cooldown - spinsSinceLastUse);
                            setRelicCooldownRemaining(cooldownRemaining);
                        }
                    } catch (relicErr) {
                        console.error("Failed to fetch equipped relic metadata:", relicErr);
                    }
                } else {
                    setEquippedRelic(null);
                    setRelicCooldownRemaining(0);
                }

                return data; // Return for game over check
            }
            return null;
        } catch (err) {
            console.error("Failed to load session:", err);
            return null;
        }
    };

    const pollSessionData = async (retries = 6, delay = 800) => {
        for (let i = 0; i < retries; i++) {
            await new Promise(r => setTimeout(r, delay));
            await loadSessionData();
        }
    };

    // Cache audio instances to improve performance and mobile support
    const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

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

            // Reset if already playing (except spin which we might want to just ensure is playing)
            if (soundName !== 'spin') {
                audio.currentTime = 0;
            }

            // Promise handling for play() which can be rejected by browsers
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn(`Audio play failed for ${soundName}:`, error);
                });
            }

            if (durationMs) {
                setTimeout(() => {
                    audio.pause();
                    audio.currentTime = 0;
                }, durationMs);
            }

            return audio;
        } catch (e) {
            console.error("Audio system error:", e);
            return null;
        }
    };

    // Ref to hold current spin sound so we can stop it
    const spinSoundRef = useRef<HTMLAudioElement | null>(null);

    const handleSpin = useCallback(async () => {
        if (!sessionId || isSpinning || spinsRemaining <= 0 || showGameOver || !isSessionActive) {
            return;
        }

        setIsSpinning(true);
        setError(null);
        setPatterns([]);
        setPatterns([]);
        setGameOverReason(null); // Reset game over flags
        spinSoundRef.current = playSound('spin');

        try {
            // Execute spin and get parsed events directly!
            const events = await requestSpin(Number(sessionId));
            // spinReceiptRef.current = events; // If needed elsewhere, or just store for charm check

            if (spinSoundRef.current) {
                spinSoundRef.current.pause();
                spinSoundRef.current.currentTime = 0;
                spinSoundRef.current = null;
            }

            // Use SpinCompleted event (now guaranteed if transaction succeeded)
            if (events.spinCompleted && events.spinCompleted.grid.length === 15) {
                const spin = events.spinCompleted;
                console.log("Spin completed:", spin);
                setGrid(spin.grid);
                setHasSpunOnce(true);
                setScore(prev => {
                    if (spin.is666) return 0; // Economy Wipe
                    const next = prev + spin.scoreGained;
                    return next;
                });
                setLevel(spin.newLevel);
                setSpinsRemaining(spin.spinsRemaining);
                setIsSessionActive(spin.isActive);

                if (spin.newLevel > previousLevelRef.current && previousLevelRef.current > 0) {
                    setShowLevelUp(true);
                    setTimeout(() => setShowLevelUp(false), 1600);
                    let ticketGain = 1;
                    console.log(`[handleSpin] Level Up! ${previousLevelRef.current} -> ${spin.newLevel}. Granting ${ticketGain} tickets.`);
                    setTickets(prev => prev + ticketGain);
                }
                previousLevelRef.current = spin.newLevel;
                setRelicCooldownRemaining(prev => Math.max(0, prev - 1));
                setIsSpinning(false);
                setInventoryRefreshTrigger(prev => prev + 1);

                // Fetch threshold and risk (still need these from contract)
                const th = await getLevelThreshold(spin.newLevel);
                setThreshold(th);
                const prob = await get666Probability(spin.newLevel);
                setRisk(prob / 10);

                // Check for patterns and animations
                const detectedPatterns = detectPatterns(spin.grid, undefined, scoreBonusesRef.current);
                setPatterns(detectedPatterns);

                if (spin.bibliaUsed) {
                    // Check if discarded from event (default to true if event missing/failed)
                    const discarded = events.bibliaDiscarded?.discarded ?? true;
                    setBibliaDiscarded(discarded);
                    setShowBibliaAnimation(true);
                    loadScoreBonuses();
                }

                if (spin.isJackpot) {
                    playSound('jackpot');
                }
                const patternDuration = detectedPatterns.length * 600;
                const sequenceDelay = Math.max(1000, patternDuration + 800);

                setTimeout(async () => {
                    // Check for CharmMinted event
                    let hasCharm = false;
                    if (events.charmMinted) {
                        const info = await getCharmInfo(events.charmMinted.charmId);
                        if (info) {
                            setMintedCharmInfo(info);
                            hasCharm = true;
                        }
                    }

                    // Check Game Over Conditions (Only No Spins)
                    if (spin.spinsRemaining <= 0) {
                        playSound('game-over');
                        // Calculate final balance: if 666 hit, it's 0. Otherwise current + gained.
                        const finalBalance = spin.is666 ? 0 : (score + spin.scoreGained);
                        setFinalScore(finalBalance);
                        setFinalTotalScore(spin.newTotalScore);
                        setGameOverReason('no_spins');

                        if (hasCharm) {
                            // 2. Show Charm Animation FIRST
                            // The animation's onComplete will trigger setShowGameOver(true)
                            setShowCharmAnimation(true);
                        } else {
                            // 3. Show Game Over IMMEDIATELY if no charm
                            setShowGameOver(true);
                        }
                    } else if (hasCharm) {
                        setShowCharmAnimation(true);
                    }
                }, sequenceDelay);
            } else {
                // If we got here, something weird happened (receipt ok but event missing).
                console.error('SpinCompleted event not found in receipt events:', events);
                setError("Spin data missing");
                setIsSpinning(false);
            }
        } catch (err) {
            console.error("Spin failed:", err);
            setError("Spin failed");
            setIsSpinning(false);
            if (spinSoundRef.current) {
                spinSoundRef.current.pause();
                spinSoundRef.current.currentTime = 0;
                spinSoundRef.current = null;
            }
            await loadSessionData();
        }
    }, [sessionId, isSpinning, spinsRemaining, showGameOver, isSessionActive, requestSpin, getLastSpinResult, getSessionData, loadSessionData, getLevelThreshold, get666Probability]);

    const handleSellConfirm = async () => {
        if (!itemToSell || !sessionId || !account) return;
        setIsSelling(true);
        try {
            const events = await sellItemHook(Number(sessionId), itemToSell.item_id);
            const soldEvent = events.itemsSold[0];
            if (soldEvent) {
                // setScore(soldEvent.newScore); // REMOVED - Sales give Tickets
                setTickets(prev => prev + itemToSell.sell_price);
            } else {
                setTickets(prev => prev + itemToSell.sell_price);
            }

            setInventoryRefreshTrigger(prev => prev + 1);
            setHiddenItems(prev => [...prev, itemToSell.item_id]);
            loadScoreBonuses();
            setItemToSell(null);
        } catch (e) {
            console.error("Sell failed", e);
        } finally {
            setIsSelling(false);
        }
    };

    if (!sessionId) {
        return (
            <div className="game-loading">
                <p className="loading-text">No session ID</p>
            </div>
        );
    }
    return (
        <div className="game-container">
            {/* Level Up Animation */}
            <LevelUpAnimation isVisible={showLevelUp} />

            {/* Initial Loading State */}
            {isInitialLoading && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.95)',
                    zIndex: 9999,
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: '16px',
                    color: '#FF841C',
                }}>
                    Loading...
                </div>
            )}

            {/* Activating Relic Overlay */}
            {isActivatingRelic && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.85)',
                    zIndex: 9998,
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: '14px',
                    color: '#FF841C',
                    gap: '16px',
                }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        border: '3px solid #FF841C',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                    }} />
                    <span>Activating Relic...</span>
                </div>
            )}


            {/* Stats Bar - Full Width Top */}
            <GameHUD
                level={level}
                threshold={threshold}
                spinsRemaining={spinsRemaining}
                score={score}
                tickets={tickets}
                onExit={() => router.push('/')}
            />

            {/* Mobile Tab Content Overlay */}
            <div className="mobile-content-overlay" style={{ display: (activeMobileTab !== 'home' && activeMobileTab !== undefined) ? 'flex' : 'none' }}>
                <div style={{ display: activeMobileTab === 'market' ? 'contents' : 'none' }}>
                    <InlineMarketPanel
                        sessionId={Number(sessionId)}
                        controller={account}
                        currentScore={score}
                        currentTickets={tickets}
                        onUpdateScore={setScore}
                        onUpdateTickets={setTickets}
                        onInventoryChange={() => {
                            setInventoryRefreshTrigger(prev => prev + 1);
                            pollSessionData();
                        }}
                        onPurchaseSuccess={(item) => setOptimisticItems(prev => [...prev, item])}
                    />
                </div>
                <div style={{ display: activeMobileTab === 'inventory' ? 'contents' : 'none' }}>
                    <InlineInventoryPanel
                        sessionId={Number(sessionId)}
                        controller={account}
                        currentScore={score}
                        currentTickets={tickets}
                        onUpdateScore={setScore}
                        onUpdateTickets={setTickets}
                        onItemClick={(item) => setItemToSell(item)}
                        refreshTrigger={inventoryRefreshTrigger}
                        optimisticItems={optimisticItems}
                        onOpenRelics={() => setShowRelicModal(true)}
                        sellingItemId={isSelling && itemToSell ? itemToSell.item_id : undefined}
                        hiddenItemIds={hiddenItems}
                    />
                </div>
                <div style={{ display: activeMobileTab === 'info' ? 'contents' : 'none' }}>
                    <GameStatsPanel
                        level={level}
                        score={score}
                        threshold={threshold}
                        sessionId={sessionId ? Number(sessionId) : undefined}
                        refreshTrigger={inventoryRefreshTrigger}
                        currentLuck={currentLuck}
                        currentTickets={tickets}
                        lastSpinPatternCount={patterns.length}
                        optimisticItems={optimisticItems}
                        hiddenItemIds={hiddenItems}
                    />
                </div>
            </div>

            {/* Desktop Layout: Left Panel + Game */}
            <div className="desktop-layout">
                {/* Left Sidebar - Market & Inventory (hidden on mobile) */}
                <div className="left-sidebar">
                    <InlineMarketPanel
                        sessionId={Number(sessionId)}
                        controller={account}
                        currentScore={score}
                        currentTickets={tickets}
                        onUpdateScore={setScore}
                        onInventoryChange={() => {
                            setInventoryRefreshTrigger(prev => prev + 1);
                            pollSessionData();
                        }}
                        onPurchaseSuccess={(item) => setOptimisticItems(prev => [...prev, item])}
                    />
                    <InlineInventoryPanel
                        sessionId={Number(sessionId)}
                        controller={account}
                        currentScore={score}
                        currentTickets={tickets}
                        onUpdateScore={setScore}
                        onUpdateTickets={setTickets}
                        onItemClick={(item) => setItemToSell(item)}
                        refreshTrigger={inventoryRefreshTrigger}
                        optimisticItems={optimisticItems}
                        sellingItemId={isSelling && itemToSell ? itemToSell.item_id : undefined}
                        hiddenItemIds={hiddenItems}
                    />
                </div>

                {/* Main Game Wrapper - Centers the machine and maintains aspect ratio dependencies */}
                <div className={`game-content-wrapper ${activeMobileTab !== 'home' ? 'hidden-on-mobile' : ''}`}>
                    <div
                        className="machine-wrapper"
                        onClick={handleSpin}
                        style={{ pointerEvents: isSpinning ? 'none' : 'auto' }}
                    >
                        {/* Slot Machine Image - Acts as the anchor for size */}
                        <img
                            src="/images/slot_machine.png"
                            alt="Slot Machine"
                            className="slot-machine-image"
                        />

                        {/* 666 Risk Display - Relative to wrapper */}
                        <div className="score-display" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <span className="score-value" style={{ color: '#FF841C' }}>666</span>
                            <Image src="/images/skull_danger.png" alt="Danger" width={24} height={24} />
                            <span className="score-value" style={{ color: '#FF841C' }}>{risk.toFixed(1)}%</span>
                        </div>

                        {/* Grid Overlay - Relative to wrapper */}
                        <div className="grid-area">
                            <SlotGrid
                                grid={grid}
                                isSpinning={isSpinning}
                            />
                            <PatternOverlay
                                patterns={patterns}
                                onPatternShow={() => playSound('win', 300)}
                            />
                            {/* Tap to Spin indicator */}
                            {!isSpinning && spinsRemaining > 0 && (
                                <div className="tap-to-spin">
                                    TAP TO SPIN
                                </div>
                            )}
                        </div>

                        {/* Mobile Relic Activation Floating Button */}
                        {/* Mobile Relic Controls */}
                        <div className="mobile-floating-controls">
                            <button
                                className="mobile-relic-btn equip-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowRelicModal(true);
                                }}
                            >
                                <GiCrystalGrowth size={24} color="#FF841C" />
                            </button>

                            {equippedRelic && (
                                <button
                                    className="mobile-relic-btn activate-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (relicCooldownRemaining > 0) return;
                                        if (!isActivatingRelic && sessionId) {
                                            setIsActivatingRelic(true);
                                            activateRelic(Number(sessionId))
                                                .then(async () => {
                                                    setShowRelicActivation(true);
                                                    setRelicCooldownRemaining(equippedRelic.cooldown);
                                                    await pollSessionData();
                                                    const spinResult = await getLastSpinResult(Number(sessionId));
                                                    if (spinResult && spinResult.grid.length === 15) {
                                                        setGrid(spinResult.grid);
                                                    }
                                                })
                                                .catch((err) => console.error(`Failed to activate: ${err.message}`))
                                                .finally(() => setIsActivatingRelic(false));
                                        }
                                    }}
                                    disabled={relicCooldownRemaining > 0}
                                >
                                    <Image
                                        src={`/images/relics/${equippedRelic.name.toLowerCase().replace(/ /g, '_')}.png`}
                                        alt={equippedRelic.name}
                                        width={48}
                                        height={48}
                                        style={{
                                            objectFit: 'cover',
                                            borderRadius: '50%',
                                            border: '2px solid #FF841C',
                                            filter: relicCooldownRemaining > 0 ? 'grayscale(100%)' : 'none'
                                        }}
                                    />
                                    {relicCooldownRemaining > 0 && (
                                        <div className="mobile-relic-cooldown">
                                            {relicCooldownRemaining}
                                        </div>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Game Stats + Buttons (hidden on mobile) */}
                <div className="right-sidebar">
                    <GameStatsPanel
                        level={level}
                        score={score}
                        threshold={threshold}
                        sessionId={sessionId ? Number(sessionId) : undefined}
                        refreshTrigger={inventoryRefreshTrigger}
                        currentLuck={currentLuck}
                        currentTickets={tickets}
                        lastSpinPatternCount={patterns.length}
                        optimisticItems={optimisticItems}
                        hiddenItemIds={hiddenItems}
                    />

                    {/* Action Buttons - Below stats panel */}
                    <div className="sidebar-buttons">
                        {/* Equipped Relic Display */}
                        {equippedRelic && (
                            <button
                                className="sidebar-btn equipped-relic"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (relicCooldownRemaining > 0) {
                                        alert(`Relic on cooldown: ${relicCooldownRemaining} spins remaining`);
                                        return;
                                    }
                                    if (!isActivatingRelic && sessionId) {
                                        setIsActivatingRelic(true);
                                        activateRelic(Number(sessionId))
                                            .then(async () => {
                                                setShowRelicActivation(true);
                                                setRelicCooldownRemaining(equippedRelic.cooldown);
                                                setRelicCooldownRemaining(equippedRelic.cooldown);
                                                await pollSessionData();
                                                // Update grid with jackpot result from relics like Mortis
                                                const spinResult = await getLastSpinResult(Number(sessionId));
                                                if (spinResult && spinResult.grid.length === 15) {
                                                    setGrid(spinResult.grid);
                                                }
                                            })
                                            .catch((err) => console.error(`Failed to activate: ${err.message}`))
                                            .finally(() => setIsActivatingRelic(false));
                                    }
                                }}
                                title={relicCooldownRemaining > 0 ? `Cooldown: ${relicCooldownRemaining} spins` : `Activate ${equippedRelic.name}`}
                                aria-label="Activate Relic"
                                disabled={relicCooldownRemaining > 0}
                                style={{
                                    position: 'relative',
                                    padding: 0,
                                    overflow: 'hidden',
                                    opacity: relicCooldownRemaining > 0 ? 0.5 : 1,
                                    cursor: relicCooldownRemaining > 0 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <Image
                                    src={`/images/relics/${equippedRelic.name.toLowerCase().replace(/ /g, '_')}.png`}
                                    alt={equippedRelic.name}
                                    width={32}
                                    height={32}
                                    style={{
                                        objectFit: 'cover',
                                        borderRadius: '6px',
                                        filter: relicCooldownRemaining > 0 ? 'grayscale(100%)' : 'none'
                                    }}
                                />
                                {relicCooldownRemaining > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(0,0,0,0.6)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontFamily: "'PressStart2P', monospace",
                                        color: '#FF841C'
                                    }}>{relicCooldownRemaining}</div>
                                )}
                            </button>
                        )}
                        <button
                            className="sidebar-btn"
                            onClick={(e) => { e.stopPropagation(); setShowRelicModal(true); }}
                            title="Relics"
                            aria-label="Open Relics menu"
                            disabled={isSpinning}
                        ><GiCrystalGrowth size={20} color="#FF841C" /></button>
                        <button
                            className="sidebar-btn"
                            onClick={(e) => { e.stopPropagation(); setActiveModal('info'); }}
                            title="Info"
                            aria-label="Open Game Info"
                            disabled={isSpinning}
                        ><FaCircleQuestion size={20} color="#FF841C" /></button>
                        <button
                            className="sidebar-btn"
                            onClick={(e) => { e.stopPropagation(); router.push("/"); }}
                            title="Home"
                            aria-label="Return to Home"
                            disabled={isSpinning}
                        ><FaHouse size={20} color="#FF841C" /></button>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Navigation Bar */}
            {/* Mobile Bottom Navigation Bar */}
            <div className="mobile-nav">
                <button
                    className="nav-item"
                    onClick={() => setActiveMobileTab('home')}
                    style={{ color: activeMobileTab === 'home' ? '#FF841C' : '#fff' }}
                >
                    <FaHouse size={20} />
                    <span>HOME</span>
                </button>
                <button
                    className="nav-item"
                    onClick={() => setActiveMobileTab('market')}
                    style={{ color: activeMobileTab === 'market' ? '#FF841C' : '#fff' }}
                >
                    <FaShop size={20} />
                    <span>MARKET</span>
                </button>
                <button
                    className="nav-item"
                    onClick={() => setActiveMobileTab('inventory')}
                    style={{ color: activeMobileTab === 'inventory' ? '#FF841C' : '#fff' }}
                >
                    <FaBoxOpen size={20} />
                    <span>ITEMS</span>
                </button>
                <button
                    className="nav-item"
                    onClick={() => setActiveMobileTab('info')}
                    style={{ color: activeMobileTab === 'info' ? '#FF841C' : '#fff' }}
                >
                    <GiCrystalGrowth size={20} />
                    <span>INFO</span>
                </button>
            </div>

            {isSpinning && <div className="spinning-indicator">N</div>}
            {error && <p className="error-text">{error}</p>}



            {/* Modals */}
            {
                activeModal === 'market' && sessionId && (
                    <MarketModal
                        sessionId={Number(sessionId)}
                        controller={account}
                        currentScore={score}
                        onClose={() => {
                            setActiveModal(null);
                            loadSessionData();
                            loadScoreBonuses();
                        }}
                        onUpdateScore={setScore}
                    />
                )
            }
            {
                activeModal === 'inventory' && sessionId && (
                    <InventoryModal
                        sessionId={Number(sessionId)}
                        controller={account}
                        currentScore={score}
                        onClose={() => {
                            setActiveModal(null);
                            loadSessionData();
                            loadScoreBonuses();
                        }}
                        onUpdateScore={setScore}
                    />
                )
            }
            {
                activeModal === 'info' && sessionId && (
                    <InfoModal
                        sessionId={Number(sessionId)}
                        onClose={() => setActiveModal(null)}
                        optimisticItems={optimisticItems}
                    />
                )
            }

            {/* Relic Selection Modal */}
            {
                showRelicModal && (
                    <RelicModal
                        ownedRelics={ownedRelics}
                        equippedRelic={equippedRelic}
                        relicIndex={relicIndex}
                        isEquippingRelic={isEquippingRelic}
                        onClose={() => setShowRelicModal(false)}
                        onSetRelicIndex={setRelicIndex}
                        onEquipRelic={async (relic) => {
                            if (!sessionId) return;
                            setIsEquippingRelic(true);
                            try {
                                await equipRelic(Number(sessionId), relic.tokenId);
                                setEquippedRelic(relic);
                                setRelicCooldownRemaining(0);
                                setShowRelicModal(false);
                                pollSessionData();
                            } catch (err) {
                                console.error(err);
                            } finally {
                                setIsEquippingRelic(false);
                            }
                        }}
                    />
                )
            }

            {/* Biblia Save Animation */}
            <AnimatePresence>
                {showBibliaAnimation && (
                    <BibliaSaveAnimation discarded={bibliaDiscarded} onComplete={() => setShowBibliaAnimation(false)} />
                )}
            </AnimatePresence>

            {/* Relic Activation Animation */}
            {
                showRelicActivation && equippedRelic && (
                    <RelicActivationAnimation
                        relicName={equippedRelic.name}
                        onComplete={() => setShowRelicActivation(false)}
                    />
                )
            }

            {/* Charm Mint Animation - Shows when player earns a charm on session end */}
            {
                showCharmAnimation && mintedCharmInfo && (
                    <CharmMintAnimation
                        charmId={mintedCharmInfo.charm_id}
                        charmName={mintedCharmInfo.name}
                        charmImage={mintedCharmInfo.image}
                        rarity={mintedCharmInfo.rarity}
                        onComplete={() => {
                            setShowCharmAnimation(false);
                            setMintedCharmInfo(null);
                            // Only open Game Over modal if the game actually ended
                            if (gameOverReason) {
                                setShowGameOver(true);
                            }
                        }}
                    />
                )
            }

            {/* Game Over Modal */}
            <GameOverModal
                isVisible={showGameOver && !mintedCharmInfo}
                reason={gameOverReason}
                finalScore={finalScore}
                totalScore={finalTotalScore}
                sessionId={sessionId ? Number(sessionId) : undefined}
                level={level}
                chipsClaimed={chipsClaimed}
                onBackToMenu={() => router.push("/")}
            />


            {/* Sell Confirmation Modal */}
            {
                itemToSell && (
                    <SellConfirmModal
                        item={itemToSell}
                        onConfirm={handleSellConfirm}
                        onCancel={() => setItemToSell(null)}
                        isSelling={isSelling}
                    />
                )
            }

            <style jsx>{`
                .game-container {
                    width: 100vw;
                    height: 100vh;
                    overflow: hidden;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-end; /* Align content to bottom like request */
                }

                /* Desktop layout with side panels */
                .desktop-layout {
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    position: relative;
                }

                .left-sidebar {
                    display: none; /* Hidden on mobile by default */
                    flex-direction: column;
                    gap: 12px;
                    position: fixed;
                    left: 20px;
                    top: 180px;
                    z-index: 100;
                }

                /* Show sidebar on desktop (min-width 1024px) */
                @media (min-width: 1025px) {
                    .left-sidebar {
                        display: flex;
                    }
                }

                .right-sidebar {
                    display: none; /* Hidden on mobile by default */
                    flex-direction: column;
                    gap: 12px;
                    position: fixed;
                    right: 20px;
                    top: 180px;
                    z-index: 100;
                }

                /* Show right sidebar on desktop */
                @media (min-width: 1280px) {
                    .right-sidebar {
                        display: flex;
                    }
                    .game-hud {
                        display: none !important;
                    }
                }

                .stats-bar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    display: flex;
                    justify-content: center;
                    gap: 2vw;
                    padding: 12px 24px;
                    background: rgba(0, 0, 0, 0.85);
                    z-index: 1000;
                }

                .stat-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 6px 16px;
                    min-width: 80px;
                }

                .stat-label {
                    font-family: 'PressStart2P', monospace;
                    font-size: 8px;
                    color: rgba(255, 255, 255, 0.5);
                    margin-bottom: 4px;
                    letter-spacing: 1px;
                }

                .stat-value {
                    font-family: 'PressStart2P', monospace;
                    font-size: 14px;
                    color: #fff;
                }

                .stat-item.highlight-yellow .stat-value {
                    color: #FFEA00;
                }

                .stat-item.highlight-red .stat-value {
                    color: #ff4444;
                }

                /* Wrapper to center everything and keep side buttons close */
                .game-content-wrapper {
                    position: relative;
                    height: 92vh;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: flex-end;
                    padding-bottom: 0;
                }

                .machine-wrapper {
                    position: relative;
                    height: 100%;
                    width: auto;
                    aspect-ratio: 928/1232; 
                }

                .slot-machine-image {
                    height: 100%;
                    width: auto;
                    display: block;
                    /* Adjust scale if needed to zoom in/out slightly */
                    transform: scale(1.08) translateY(1.8%); 
                }

                .score-display {
                    position: absolute;
                    top: 8%;
                    left: 44%;
                    transform: translateX(-50%);
                    width: 30%;
                    display: flex;
                    justify-content: center;
                    z-index: 15;
                }

                .score-value {
                    font-family: 'PressStart2P', monospace;
                    font-size: 1.5vw; /* Scale with height since machine scales with height */
                    color: #FF841C;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.9);
                }

                .score-label {
                    font-family: 'PressStart2P', monospace;
                    font-size: 1.5vh;
                    color: rgba(255, 132, 28, 0.6);
                    margin-left: 6px;
                    align-self: flex-end;
                    margin-bottom: 0.5vh;
                }

                .danger-pulse {
                    animation: dangerPulse 0.5s ease-in-out infinite;
                }

                @keyframes dangerPulse {
                    0%, 100% { 
                        background: rgba(255, 68, 68, 0.1);
                    }
                    50% { 
                        background: rgba(255, 68, 68, 0.4);
                    }
                }

                .grid-area {
                    position: absolute;
                    top: 44.5%;
                    left: 44.1%;
                    transform: translateX(-50%) translateY(-50%);
                    width: 47%;
                    height: 30%;
                    z-index: 10;
                    cursor: pointer;
                }

                /* Tap to Spin text */
                .tap-to-spin {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-family: 'PressStart2P', monospace;
                    font-size: 16px;
                    color: #fff;
                    animation: blinkText 1.2s ease-in-out infinite;
                    z-index: 50;
                    pointer-events: none;
                    white-space: nowrap;
                }

                @keyframes blinkText {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }

                /* Sidebar Buttons - Horizontal row below stats */
                .sidebar-buttons {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 8px;
                    padding: 12px;
                    background: rgba(0, 0, 0, 0.85);
                    border: 2px solid #FF841C;
                    border-radius: 8px;
                }

                .sidebar-btn {
                    width: 40px;
                    height: 40px;
                    border: 2px solid #FF841C;
                    border-radius: 6px;
                    background: rgba(0, 0, 0, 0.5);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .sidebar-btn:hover:not(:disabled) {
                    background: rgba(255, 132, 28, 0.2);
                }

                /* Mobile Bottom Nav - Hidden by default */
                .mobile-nav {
                    display: none;
                }

                .spinning-indicator {
                    position: absolute;
                    bottom: 2vmin;
                    left: 2vmin;
                    font-family: 'PressStart2P', monospace;
                    font-size: 2vmin;
                    color: #fff;
                    z-index: 100;
                }

                .error-text {
                    position: absolute;
                    bottom: 10%;
                    left: 50%;
                    transform: translateX(-50%);
                    font-family: 'PressStart2P', monospace;
                    font-size: 2vmin;
                    color: #ff4444;
                    z-index: 100;
                }

                .game-loading {
                    width: 100vw;
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-size: cover;
                }
                
                /* Hide mobile overlay on desktop */
                @media (min-width: 1025px) {
                    .mobile-content-overlay {
                        display: none !important;
                    }
                }

                /* Tablet breakpoint (1024-1279px) - only show mobile nav, keep desktop layout */
                @media (min-width: 1025px) and (max-width: 1279px) {
                    .mobile-nav {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        width: 100%;
                        height: 60px;
                        background: #000;
                        display: flex;
                        justify-content: space-around;
                        align-items: center;
                        z-index: 200;
                        border-top: 2px solid #333;
                    }

                    .nav-item {
                        background: none;
                        border: none;
                        font-family: 'PressStart2P', monospace;
                        font-size: 14px;
                        color: #000;
                        cursor: pointer;
                        transition: background 0.2s;
                    }

                    .nav-item:active {
                        background: rgba(255, 132, 28, 0.2);
                    }

                    /* Adjust main content to account for nav */
                    .game-content-wrapper {
                        margin-bottom: 60px;
                    }
                }

                .mobile-relic-btn {
                    display: none;
                }

                /* Mobile breakpoint (<1024px) - full mobile layout */
                @media (max-width: 1024px) {
                    .mobile-floating-controls {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        z-index: 100;
                    }

                    .mobile-relic-btn {
                        display: block;
                        position: relative;
                        width: 50px;
                        height: 50px;
                        background: transparent;
                        border: none;
                        cursor: pointer;
                        padding: 0;
                    }
                    
                    .equip-btn {
                        background: rgba(0, 0, 0, 0.7);
                        border: 2px solid #FF841C;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .mobile-relic-cooldown {
                        position: absolute;
                        inset: 0;
                        background: rgba(0,0,0,0.6);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #FF841C;
                        font-family: 'PressStart2P', monospace;
                        font-size: 14px;
                    }

                    .game-content-wrapper {
                        height: auto;
                        width: 95vw;
                        margin-top: auto;
                        margin-bottom: 60px;
                        padding-bottom: 0;
                        align-items: flex-end;
                    }

                    .machine-wrapper {
                        width: 100%;
                        height: auto;
                        aspect-ratio: auto;
                        top: 0;
                    }

                    .slot-machine-image {
                        width: 100%;
                        height: auto;
                        transform: none;
                    }

                    .stats-bar {
                        top: 0;
                        padding: 8px 12px;
                        gap: 8px;
                        flex-wrap: wrap;
                    }
                    
                    .stat-item {
                        padding: 4px 10px;
                        min-width: 60px;
                    }
                    
                    .stat-label {
                        font-size: 6px;
                    }
                    
                    .stat-value {
                        font-size: 10px;
                    }
                    
                    .side-buttons {
                        display: none;
                    }

                    /* Show Mobile Nav */
                    .mobile-nav {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        width: 100%;
                        height: 85px;
                        padding-bottom: 15px;
                        background: #000;
                        display: flex;
                        justify-content: space-around;
                        align-items: center;
                        z-index: 200;
                        border-top: 2px solid #333;
                    }

                    .nav-item {
                        background: transparent;
                        border: none;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        color: #fff;
                        font-family: 'PressStart2P', monospace;
                        font-size: 10px;
                        gap: 4px;
                        cursor: pointer;
                    }
                }

                /* Game Over Modal */
                .game-over-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }

                .game-over-modal {
                    background: linear-gradient(180deg, #1a0000 0%, #000 100%);
                    border: 3px solid #FF841C;
                    border-radius: 16px;
                    padding: 40px 60px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 24px;
                }

                .game-over-title {
                    font-family: 'Ramagothic', sans-serif;
                    font-size: 64px;
                    color: #FF0000;
                    margin: 0;
                    text-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
                    letter-spacing: 4px;
                }

                .game-over-reason {
                    font-family: 'PressStart2P', monospace;
                    font-size: 14px;
                    color: #FF841C;
                    margin: 0;
                }

                .game-over-score {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .game-over-score span:first-child {
                    font-family: 'PressStart2P', monospace;
                    font-size: 12px;
                    color: #888;
                }

                .game-over-score .score-value {
                    font-family: 'PressStart2P', monospace;
                    font-size: 32px;
                    color: #FFD700;
                }

                .game-over-button {
                    background: #FF841C;
                    border: none;
                    border-radius: 8px;
                    padding: 16px 32px;
                    font-family: 'PressStart2P', monospace;
                    font-size: 14px;
                    color: #000;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .game-over-button:hover {
                    background: #FFa040;
                }

                @media (max-width: 1024px) {
                    .hidden-on-mobile {
                        display: none !important;
                    }
                    
                    .mobile-content-overlay {
                        position: fixed;
                        top: 60px; /* Below HUD (approx) */
                        bottom: 60px; /* Above Nav */
                        left: 0;
                        right: 0;
                        background: rgba(0,0,0,0.9);
                        z-index: 150;
                        overflow-y: auto;
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                }
            `}</style>
        </div >
    );
}

export default function GamePage() {
    return (
        <Suspense fallback={
            <div style={{
                width: "100vw",
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}>
                <p style={{ fontFamily: "'PressStart2P', monospace", color: "#fff" }}>Loading...</p>
            </div>
        }>
            <GameContent />
        </Suspense>
    );
}
