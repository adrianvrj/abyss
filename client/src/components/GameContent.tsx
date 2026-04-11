import { useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import SlotGrid from "@/components/SlotGrid";
import PatternOverlay from "@/components/PatternOverlay";
import LevelUpAnimation from "@/components/LevelUpAnimation";
import GameHUD from "@/components/GameHUD";
import GameOverModal from "@/components/GameOverModal";
import InlineMarketPanel from "@/components/InlineMarketPanel";
import InlineInventoryPanel from "@/components/InlineInventoryPanel";
import GameStatsPanel from "@/components/GameStatsPanel";
import SellConfirmModal from "@/components/SellConfirmModal";
import BibliaSaveAnimation from "@/components/BibliaSaveAnimation";
import DemonicScoreResetAnimation from "@/components/DemonicScoreResetAnimation";
import LuckyScoreBoostAnimation from "@/components/LuckyScoreBoostAnimation";
import RelicActivationAnimation from "@/components/RelicActivationAnimation";
import CharmMintAnimation from "@/components/CharmMintAnimation";
import RelicModal from "@/components/modals/RelicModal";
import InfoModal from "@/components/modals/InfoModal";
import PreloadingScreen from "@/components/PreloadingScreen";
import { useAssetPreloader } from "@/hooks/useAssetPreloader";
import { useGameSession } from "@/hooks/useGameSession";
import { SYMBOL_INFO } from "@/utils/GameConfig";
import { AnimatePresence } from "framer-motion";
import { Store, Package, HelpCircle, Home, Gem } from "lucide-react";

const PRELOAD_IMAGES = [
    '/images/bg-desktop.png',
    '/images/bg-mobile.png',
    '/images/abyss-logo.png',
    '/images/slot_machine.png',
    '/images/skull_danger.png',
    ...Object.values(SYMBOL_INFO).map(s => s.image)
];

const PRELOAD_AUDIO = [
    '/sounds/spin.mp3',
    '/sounds/win.wav',
    '/sounds/jackpot.mp3',
    '/sounds/game-over.mp3',
];

export function GameContent() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sessionId = searchParams.get("sessionId");

    const game = useGameSession(sessionId);

    const [activeMobileTab, setActiveMobileTab] = useState<'home' | 'market' | 'inventory' | 'info'>('home');
    const [activeModal, setActiveModal] = useState<'info' | null>(null);
    const [showRelicModal, setShowRelicModal] = useState(false);
    const [showBibliaPreview, setShowBibliaPreview] = useState(false);
    const [showScoreResetPreview, setShowScoreResetPreview] = useState(false);

    const { loaded: assetsLoaded, progress: loadProgress } = useAssetPreloader(PRELOAD_IMAGES, PRELOAD_AUDIO);

    if (!sessionId) {
        return (
            <div className="game-loading">
                <p style={{ fontFamily: "'PressStart2P', monospace", color: '#fff' }}>No session ID</p>
            </div>
        );
    }

    const isLoading = !assetsLoaded || game.isInitialLoading;

    if (isLoading) {
        let statusText = "Entering the Abyss...";
        let progress = 0;
        if (!assetsLoaded) { statusText = "Loading Assets..."; progress = loadProgress; }
        else if (game.isInitialLoading) { statusText = "Syncing with Chain..."; progress = 100; }
        return <PreloadingScreen progress={progress} statusText={statusText} />;
    }

    const numericSessionId = Number(sessionId);
    const shouldShowBibliaAnimation = game.showBibliaAnimation || showBibliaPreview;
    const shouldShowScoreResetAnimation = game.showScoreResetAnimation || showScoreResetPreview;
    const handleBibliaAnimationComplete = () => {
        if (showBibliaPreview) {
            setShowBibliaPreview(false);
        }

        if (game.showBibliaAnimation) {
            game.setShowBibliaAnimation(false);
        }
    };
    const handleScoreResetAnimationComplete = () => {
        if (showScoreResetPreview) {
            setShowScoreResetPreview(false);
        }

        if (game.showScoreResetAnimation) {
            game.setShowScoreResetAnimation(false);
        }
    };

    return (
        <div className="game-container game-page-bg">
            <LevelUpAnimation isVisible={game.showLevelUp} />

            {import.meta.env.DEV && (
                <div
                    style={{
                        position: 'fixed',
                        top: '92px',
                        left: '18px',
                        zIndex: 100006,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                    }}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowBibliaPreview(true);
                        }}
                        style={{
                            border: '2px solid #FFD36B',
                            background: 'rgba(17, 8, 0, 0.92)',
                            color: '#FFF4C2',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: '10px',
                            letterSpacing: '0.06em',
                            boxShadow: '0 0 16px rgba(255, 211, 107, 0.25)',
                            cursor: 'pointer',
                        }}
                    >
                        TEST BIBLIA
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowScoreResetPreview(true);
                        }}
                        style={{
                            border: '2px solid #FF841C',
                            background: 'rgba(20, 0, 0, 0.92)',
                            color: '#FFB16A',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: '10px',
                            letterSpacing: '0.06em',
                            boxShadow: '0 0 16px rgba(255, 90, 0, 0.25)',
                            cursor: 'pointer',
                        }}
                    >
                        TEST 666
                    </button>
                </div>
            )}

            {game.isActivatingRelic && (
                <div style={{
                    position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)',
                    zIndex: 9998, fontFamily: "'PressStart2P', monospace", fontSize: '14px', color: '#FF841C', gap: '16px',
                }}>
                    <div style={{ width: '32px', height: '32px', border: '3px solid #FF841C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span>Activating Relic...</span>
                </div>
            )}

            <GameHUD
                level={game.level}
                threshold={game.threshold}
                spinsRemaining={game.spinsRemaining}
                score={game.score}
                tickets={game.tickets}
                onExit={() => navigate("/")}
            />

            {/* Mobile Tab Content Overlay */}
            <div className="mobile-content-overlay" style={{ display: (activeMobileTab !== 'home') ? 'flex' : 'none' }}>
                <div style={{ display: activeMobileTab === 'market' ? 'contents' : 'none' }}>
                    <InlineMarketPanel
                        sessionId={numericSessionId}
                        currentScore={game.score}
                        currentTickets={game.tickets}
                        symbolScores={game.symbolScores}
                        onUpdateScore={game.setScore}
                        onUpdateTickets={game.setTickets}
                        onUpdateSpins={(spins) => game.setSpinsRemaining(spins)}
                        onUpdateLuck={(luck) => game.setCurrentLuck(luck)}
                        onUpdateSymbolScores={game.setSymbolScores}
                        onInventoryChange={() => game.setInventoryRefreshTrigger(prev => prev + 1)}
                        onPurchaseSuccess={(item) => game.setOptimisticItems(prev => [...prev, item])}
                        initialItems={game.initialMarketItems}
                        refreshTrigger={game.marketRefreshTrigger}
                        externalRefreshEvent={game.lastMarketEvent}
                        hiddenItemIds={game.hiddenItems}
                    />
                </div>
                <div style={{ display: activeMobileTab === 'inventory' ? 'contents' : 'none' }}>
                    <InlineInventoryPanel
                        sessionId={numericSessionId}
                        currentScore={game.score}
                        currentTickets={game.tickets}
                        onUpdateScore={game.setScore}
                        onUpdateTickets={game.setTickets}
                        onItemClick={(item) => game.setItemToSell(item)}
                        refreshTrigger={game.marketRefreshTrigger}
                        optimisticItems={game.optimisticItems}
                        onOpenRelics={() => setShowRelicModal(true)}
                        sellingItemId={game.isSelling && game.itemToSell ? game.itemToSell.item_id : undefined}
                        hiddenItemIds={game.hiddenItems}
                        bibliaBroken={game.bibliaBroken}
                        initialInventory={game.initialInventoryItems}
                    />
                </div>
                <div style={{ display: activeMobileTab === 'info' ? 'contents' : 'none' }}>
                    <GameStatsPanel
                        level={game.level}
                        score={game.score}
                        threshold={game.threshold}
                        spinsRemaining={game.spinsRemaining}
                        sessionId={numericSessionId}
                        refreshTrigger={game.inventoryRefreshTrigger}
                        currentLuck={game.currentLuck}
                        currentTickets={game.tickets}
                        lastSpinPatternCount={game.patterns.length}
                        optimisticItems={game.optimisticItems}
                        hiddenItemIds={game.hiddenItems}
                        symbolScores={game.symbolScores}
                        blocked666={game.blocked666}
                    />
                </div>
            </div>

            {/* Desktop Layout */}
            <div className="desktop-layout">
                <div className="left-sidebar">
                    <InlineMarketPanel
                        sessionId={numericSessionId}
                        currentScore={game.score}
                        currentTickets={game.tickets}
                        symbolScores={game.symbolScores}
                        onUpdateScore={game.setScore}
                        onUpdateTickets={game.setTickets}
                        onUpdateSpins={(spins) => game.setSpinsRemaining(spins)}
                        onUpdateLuck={(luck) => game.setCurrentLuck(luck)}
                        onUpdateSymbolScores={game.setSymbolScores}
                        onInventoryChange={() => game.setInventoryRefreshTrigger(prev => prev + 1)}
                        onPurchaseSuccess={(item) => game.setOptimisticItems(prev => [...prev, item])}
                        initialItems={game.initialMarketItems}
                        refreshTrigger={game.marketRefreshTrigger}
                        externalRefreshEvent={game.lastMarketEvent}
                        hiddenItemIds={game.hiddenItems}
                    />
                    <InlineInventoryPanel
                        sessionId={numericSessionId}
                        currentScore={game.score}
                        currentTickets={game.tickets}
                        onUpdateScore={game.setScore}
                        onUpdateTickets={game.setTickets}
                        onItemClick={(item) => game.setItemToSell(item)}
                        refreshTrigger={game.inventoryRefreshTrigger}
                        optimisticItems={game.optimisticItems}
                        sellingItemId={game.isSelling && game.itemToSell ? game.itemToSell.item_id : undefined}
                        hiddenItemIds={game.hiddenItems}
                        bibliaBroken={game.bibliaBroken}
                        initialInventory={game.initialInventoryItems}
                    />
                </div>

                <div className={`game-content-wrapper ${activeMobileTab !== 'home' ? 'hidden-on-mobile' : ''}`}>
                    <div
                        className="machine-wrapper"
                        onClick={game.handleSpin}
                        style={{ pointerEvents: game.isSpinning ? 'none' : 'auto' }}
                    >
                        <img src="/images/slot_machine.png" alt="Slot Machine" className="slot-machine-image" />

                        <div className="score-display" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <span className="score-value" style={{ color: '#FF841C' }}>666</span>
                            <img src="/images/skull_danger.png" alt="Danger" width={24} height={24} />
                            <span className="score-value" style={{ color: '#FF841C' }}>{game.risk.toFixed(1)}%</span>
                        </div>

                        <div className="grid-area">
                            <SlotGrid grid={game.grid} isSpinning={game.isSpinning} />
                            {!game.showScoreResetAnimation && (
                                <PatternOverlay
                                    patterns={game.patterns}
                                    onPatternShow={() => game.playSound('win', 300)}
                                    onComplete={() => game.setShowingPatterns(false)}
                                />
                            )}
                            {!game.isSpinning && game.spinsRemaining > 0 && !game.showLevelUp && !game.showBibliaAnimation && !game.showScoreResetAnimation && !game.showCharmAnimation && !game.showRelicActivation && !game.showingPatterns && (
                                <div className="tap-to-spin">
                                    {game.pendingRelicEffect === 0 ? "JACKPOT FORCE" :
                                        game.pendingRelicEffect === 2 ? "5X NEXT SPIN" :
                                            "TAP TO SPIN"}
                                </div>
                            )}
                        </div>

                        {/* Mobile Relic Controls */}
                        <div className="mobile-floating-controls">
                            <button
                                className="mobile-relic-btn equip-btn"
                                onClick={(e) => { e.stopPropagation(); setShowRelicModal(true); }}
                            >
                                <Gem size={24} color="#FF841C" />
                            </button>
                            {game.equippedRelic && (
                                <button
                                    className="mobile-relic-btn activate-btn"
                                    onClick={(e) => { e.stopPropagation(); game.handleActivateRelic(); }}
                                    disabled={game.relicCooldownRemaining > 0}
                                >
                                    <img
                                        src={`/images/relics/${game.equippedRelic.name.toLowerCase().replace(/ /g, '_')}.png`}
                                        alt={game.equippedRelic.name}
                                        width={48} height={48}
                                        style={{ objectFit: 'cover', borderRadius: '50%', border: '2px solid #FF841C', filter: game.relicCooldownRemaining > 0 ? 'grayscale(100%)' : 'none' }}
                                    />
                                    {game.relicCooldownRemaining > 0 && (
                                        <div className="mobile-relic-cooldown">{game.relicCooldownRemaining}</div>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="right-sidebar">
                    <GameStatsPanel
                        level={game.level}
                        score={game.score}
                        threshold={game.threshold}
                        spinsRemaining={game.spinsRemaining}
                        sessionId={numericSessionId}
                        refreshTrigger={game.inventoryRefreshTrigger}
                        currentLuck={game.currentLuck}
                        currentTickets={game.tickets}
                        lastSpinPatternCount={game.patterns.length}
                        optimisticItems={game.optimisticItems}
                        hiddenItemIds={game.hiddenItems}
                        symbolScores={game.symbolScores}
                        blocked666={game.blocked666}
                    />
                    <div className="sidebar-buttons">
                        {game.equippedRelic && (
                            <button
                                className="sidebar-btn equipped-relic"
                                onClick={(e) => { e.stopPropagation(); game.handleActivateRelic(); }}
                                title={game.relicCooldownRemaining > 0 ? `Cooldown: ${game.relicCooldownRemaining} spins` : `Activate ${game.equippedRelic.name}`}
                                disabled={game.relicCooldownRemaining > 0}
                                style={{ position: 'relative', padding: 0, overflow: 'hidden', opacity: game.relicCooldownRemaining > 0 ? 0.5 : 1, cursor: game.relicCooldownRemaining > 0 ? 'not-allowed' : 'pointer' }}
                            >
                                <img
                                    src={`/images/relics/${game.equippedRelic.name.toLowerCase().replace(/ /g, '_')}.png`}
                                    alt={game.equippedRelic.name}
                                    width={32} height={32}
                                    style={{ objectFit: 'cover', borderRadius: '6px', filter: game.relicCooldownRemaining > 0 ? 'grayscale(100%)' : 'none' }}
                                />
                                {game.relicCooldownRemaining > 0 && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontFamily: "'PressStart2P', monospace", color: '#FF841C' }}>
                                        {game.relicCooldownRemaining}
                                    </div>
                                )}
                            </button>
                        )}
                        <button className="sidebar-btn" onClick={(e) => { e.stopPropagation(); setShowRelicModal(true); }} title="Relics" disabled={game.isSpinning}>
                            <Gem size={20} color="#FF841C" />
                        </button>
                        <button className="sidebar-btn" onClick={(e) => { e.stopPropagation(); setActiveModal('info'); }} title="Info" disabled={game.isSpinning}>
                            <HelpCircle size={20} color="#FF841C" />
                        </button>
                        <button className="sidebar-btn" onClick={(e) => { e.stopPropagation(); navigate("/"); }} title="Home" disabled={game.isSpinning}>
                            <Home size={20} color="#FF841C" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Nav */}
            <div className="mobile-nav">
                <button className="nav-item" onClick={() => setActiveMobileTab('home')} style={{ color: activeMobileTab === 'home' ? '#FF841C' : '#fff' }}>
                    <Home size={20} /><span>HOME</span>
                </button>
                <button className="nav-item" onClick={() => setActiveMobileTab('market')} style={{ color: activeMobileTab === 'market' ? '#FF841C' : '#fff' }}>
                    <Store size={20} /><span>MARKET</span>
                </button>
                <button className="nav-item" onClick={() => setActiveMobileTab('inventory')} style={{ color: activeMobileTab === 'inventory' ? '#FF841C' : '#fff' }}>
                    <Package size={20} /><span>ITEMS</span>
                </button>
                <button className="nav-item" onClick={() => setActiveMobileTab('info')} style={{ color: activeMobileTab === 'info' ? '#FF841C' : '#fff' }}>
                    <Gem size={20} /><span>INFO</span>
                </button>
            </div>

            {game.isSpinning && <div className="spinning-indicator">N</div>}
            {game.error && <p className="error-text">{game.error}</p>}

            {/* Modals */}
            {activeModal === 'info' && (
                <InfoModal
                    sessionId={numericSessionId}
                    onClose={() => setActiveModal(null)}
                    optimisticItems={game.optimisticItems}
                />
            )}

            {showRelicModal && (
                <RelicModal
                    ownedRelics={game.ownedRelics}
                    equippedRelic={game.equippedRelic}
                    relicIndex={game.relicIndex}
                    isEquippingRelic={game.isEquippingRelic}
                    onClose={() => setShowRelicModal(false)}
                    onSetRelicIndex={game.setRelicIndex}
                    onEquipRelic={async (relic) => {
                        await game.handleEquipRelic(relic);
                        setShowRelicModal(false);
                    }}
                />
            )}

            {/* Animations */}
            <AnimatePresence>
                {shouldShowScoreResetAnimation && (
                    <DemonicScoreResetAnimation
                        previousScore={showScoreResetPreview ? 666 : game.scoreResetPreviousScore}
                        onComplete={handleScoreResetAnimationComplete}
                    />
                )}
                {game.showLuckyScoreBoostAnimation && (
                    <LuckyScoreBoostAnimation
                        totalScore={game.luckyScoreBoostTotal}
                        luckyBonus={game.luckyScoreBoostBonus}
                        onComplete={() => game.setShowLuckyScoreBoostAnimation(false)}
                    />
                )}
                {shouldShowBibliaAnimation && (
                    <BibliaSaveAnimation
                        discarded={game.showBibliaAnimation ? game.bibliaDiscarded : true}
                        onComplete={handleBibliaAnimationComplete}
                    />
                )}
            </AnimatePresence>

            {game.showRelicActivation && game.equippedRelic && (
                <RelicActivationAnimation
                    relicName={game.equippedRelic.name}
                    onComplete={() => game.setShowRelicActivation(false)}
                />
            )}

            {game.showCharmAnimation && game.mintedCharmInfo && (
                <CharmMintAnimation
                    charmId={game.mintedCharmInfo.charm_id}
                    charmName={game.mintedCharmInfo.name}
                    charmImage={game.mintedCharmInfo.image}
                    rarity={game.mintedCharmInfo.rarity}
                    onComplete={() => {
                        game.setShowCharmAnimation(false);
                        game.setMintedCharmInfo(null);
                        if (game.gameOverReason) game.setShowGameOver(true);
                    }}
                />
            )}

            {/* Game Over */}
            <GameOverModal
                isVisible={game.showGameOver && !game.mintedCharmInfo}
                reason={game.gameOverReason}
                finalScore={game.finalScore}
                totalScore={game.finalTotalScore}
                chipsEarned={game.chipsEarned}
                buildItems={game.gameOverBuildItems}
                sessionId={numericSessionId}
                level={game.level}
                chipsClaimed={game.chipsClaimed}
                onBackToMenu={() => navigate("/")}
            />

            {/* Sell Confirmation */}
            {game.itemToSell && (
                <SellConfirmModal
                    item={game.itemToSell}
                    onConfirm={game.handleSellConfirm}
                    onCancel={() => game.setItemToSell(null)}
                    isSelling={game.isSelling}
                />
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .game-container {
                    width: 100vw;
                    height: 100vh;
                    height: 100dvh;
                    overflow: hidden;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-end;
                }
                .game-page-bg {
                    background-image: url('/images/bg-desktop.png');
                    background-size: cover;
                    background-position: center;
                }
                @media (max-width: 768px) {
                    .game-page-bg { background-image: url('/images/bg-mobile.png'); }
                }
                .desktop-layout {
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    position: relative;
                }
                .left-sidebar {
                    display: none;
                    flex-direction: column;
                    gap: 12px;
                    position: fixed;
                    left: 20px;
                    top: 180px;
                    z-index: 100;
                }
                @media (min-width: 1025px) {
                    .left-sidebar { display: flex; }
                }
                .right-sidebar {
                    display: none;
                    flex-direction: column;
                    gap: 12px;
                    position: fixed;
                    right: 20px;
                    top: 180px;
                    z-index: 100;
                }
                @media (min-width: 1280px) {
                    .right-sidebar { display: flex; }
                }
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
                    font-size: 1.5vw;
                    color: #FF841C;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.9);
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
                .mobile-nav { display: none; }
                .mobile-relic-btn { display: none; }
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
                @media (min-width: 1025px) {
                    .mobile-content-overlay { display: none !important; }
                }
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
                    }
                    .game-content-wrapper { margin-bottom: 60px; }
                }
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
                    .hidden-on-mobile { display: none !important; }
                    .mobile-content-overlay {
                        position: fixed;
                        top: 60px;
                        bottom: 60px;
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
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            ` }} />
        </div>
    );
}
