import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import { useAssets } from "@/components/providers/AssetPreloaderProvider";
import { useGameSession } from "@/hooks/useGameSession";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { AnimatePresence } from "framer-motion";
import { Store, Package, HelpCircle, Home, Gem } from "lucide-react";

export function GameContent() {
    const location = useLocation();

    if (location.pathname === "/practice") {
        return <PracticeGameContent />;
    }

    return <SessionGameContent />;
}

function SessionGameContent() {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const game = useGameSession(sessionId);

    if (!sessionId) {
        return (
            <div className="game-loading">
                <p style={{ fontFamily: "'PressStart2P', monospace", color: '#fff' }}>No session ID</p>
            </div>
        );
    }

    return (
        <GameStage
            game={game}
            numericSessionId={Number(sessionId)}
            practiceMode={false}
        />
    );
}

function PracticeGameContent() {
    const game = usePracticeSession();

    return (
        <GameStage
            game={game}
            numericSessionId={0}
            practiceMode
        />
    );
}

function GameStage({
    game,
    numericSessionId,
    practiceMode,
}: {
    game: ReturnType<typeof useGameSession> | ReturnType<typeof usePracticeSession>;
    numericSessionId: number;
    practiceMode: boolean;
}) {
    const navigate = useNavigate();
    const [activeMobileTab, setActiveMobileTab] = useState<'home' | 'market' | 'inventory' | 'info'>('home');
    const [activeModal, setActiveModal] = useState<'info' | null>(null);
    const [showRelicModal, setShowRelicModal] = useState(false);
    const [showBibliaPreview, setShowBibliaPreview] = useState(false);
    const [showScoreResetPreview, setShowScoreResetPreview] = useState(false);
    const practiceGame = practiceMode ? (game as ReturnType<typeof usePracticeSession>) : null;
    const mobileTabMeta = {
        market: {
            title: 'Market',
            subtitle: 'Spend tickets and sculpt the run',
        },
        inventory: {
            title: 'Inventory',
            subtitle: 'Sell or inspect your current build',
        },
        info: {
            title: 'Run Data',
            subtitle: 'Live stats, symbols and pattern odds',
        },
    } as const;
    const activeMobileMeta = activeMobileTab === 'home' ? null : mobileTabMeta[activeMobileTab];

    const { isLoaded: assetsLoaded, progress: loadProgress } = useAssets();

    const isLoading = !assetsLoaded || game.isInitialLoading;

    if (isLoading) {
        let statusText = "Entering the Abyss...";
        let progress = 0;
        if (!assetsLoaded) { statusText = "Loading Assets..."; progress = loadProgress; }
        else if (game.isInitialLoading) { statusText = "Syncing with Chain..."; progress = 100; }
        return <PreloadingScreen progress={progress} statusText={statusText} />;
    }
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

            <div className={activeMobileTab !== 'home' ? 'mobile-hud-hidden' : ''}>
                <GameHUD
                    level={game.level}
                    threshold={game.threshold}
                    spinsRemaining={game.spinsRemaining}
                    score={game.score}
                    tickets={game.tickets}
                    onExit={() => navigate("/")}
                />
            </div>

            {practiceMode && activeMobileTab === 'home' && (
                <div className="practice-mode-badge">
                    Practice Mode
                </div>
            )}

            {/* Mobile Tab Content Overlay */}
            <div className="mobile-content-overlay" style={{ display: (activeMobileTab !== 'home') ? 'flex' : 'none' }}>
                <div className="mobile-panel-shell">
                    <div className="mobile-panel-header">
                        <div className="mobile-panel-copy">
                            <span className="mobile-panel-kicker">
                                {practiceMode ? 'Practice' : `Session #${numericSessionId}`}
                            </span>
                            <span className="mobile-panel-title">{activeMobileMeta?.title}</span>
                            <span className="mobile-panel-subtitle">{activeMobileMeta?.subtitle}</span>
                        </div>
                        <button className="mobile-panel-close" onClick={() => setActiveMobileTab('home')}>
                            RETURN
                        </button>
                    </div>
                    <div className="mobile-panel-body">
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
                                practiceMode={practiceMode}
                                practiceMarketItems={game.initialMarketItems}
                                practiceOwnedItems={game.initialInventoryItems}
                                practicePurchasedSlots={practiceGame?.practicePurchasedSlots}
                                practiceRefreshCount={practiceGame?.practiceRefreshCount}
                                onPracticeRefresh={practiceGame?.handlePracticeRefresh}
                                onPracticeBuy={practiceGame?.handlePracticeBuy}
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
                                onOpenRelics={practiceMode ? undefined : (() => setShowRelicModal(true))}
                                sellingItemId={game.isSelling && game.itemToSell ? game.itemToSell.item_id : undefined}
                                hiddenItemIds={game.hiddenItems}
                                bibliaBroken={game.bibliaBroken}
                                initialInventory={game.initialInventoryItems}
                                practiceMode={practiceMode}
                                practiceItems={game.initialInventoryItems}
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
                                practiceMode={practiceMode}
                                itemsOverride={game.initialInventoryItems}
                            />
                        </div>
                    </div>
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
                        practiceMode={practiceMode}
                        practiceMarketItems={game.initialMarketItems}
                        practiceOwnedItems={game.initialInventoryItems}
                        practicePurchasedSlots={practiceGame?.practicePurchasedSlots}
                        practiceRefreshCount={practiceGame?.practiceRefreshCount}
                        onPracticeRefresh={practiceGame?.handlePracticeRefresh}
                        onPracticeBuy={practiceGame?.handlePracticeBuy}
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
                        practiceMode={practiceMode}
                        practiceItems={game.initialInventoryItems}
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
                        {!practiceMode && activeMobileTab === 'home' && (
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
                        )}
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
                        practiceMode={practiceMode}
                        itemsOverride={game.initialInventoryItems}
                    />
                    <div className="sidebar-buttons">
                        {!practiceMode && game.equippedRelic && (
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
                        {!practiceMode && (
                            <button className="sidebar-btn" onClick={(e) => { e.stopPropagation(); setShowRelicModal(true); }} title="Relics" disabled={game.isSpinning}>
                                <Gem size={20} color="#FF841C" />
                            </button>
                        )}
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
                <button className={`nav-item ${activeMobileTab === 'home' ? 'active' : ''}`} onClick={() => setActiveMobileTab('home')}>
                    <Home size={20} /><span>HOME</span>
                </button>
                <button className={`nav-item ${activeMobileTab === 'market' ? 'active' : ''}`} onClick={() => setActiveMobileTab('market')}>
                    <Store size={20} /><span>MARKET</span>
                </button>
                <button className={`nav-item ${activeMobileTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveMobileTab('inventory')}>
                    <Package size={20} /><span>ITEMS</span>
                </button>
                <button className={`nav-item ${activeMobileTab === 'info' ? 'active' : ''}`} onClick={() => setActiveMobileTab('info')}>
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
                    practiceMode={practiceMode}
                    practiceItems={game.initialInventoryItems}
                />
            )}

            {!practiceMode && showRelicModal && (
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
                practiceMode={practiceMode}
                onPlayAgain={practiceGame?.handlePlayAgain}
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
                .practice-mode-badge {
                    position: fixed;
                    top: 86px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 1100;
                    padding: 8px 14px;
                    border-radius: 999px;
                    border: 2px solid #FF841C;
                    background: #000;
                    font-family: 'PressStart2P', monospace;
                    font-size: 9px;
                    color: #FF841C;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    text-align: center;
                    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.38);
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
                    .game-container {
                        justify-content: flex-start;
                        padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 104px);
                    }
                    .mobile-hud-hidden {
                        display: none;
                    }
                    .mobile-floating-controls {
                        position: fixed;
                        top: calc(env(safe-area-inset-top, 0px) + 138px);
                        right: 14px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        z-index: 1150;
                        padding: 6px;
                        border-radius: 16px;
                        background: #000;
                        border: 2px solid rgba(255, 132, 28, 0.34);
                        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.42);
                    }
                    .mobile-relic-btn {
                        display: block;
                        position: relative;
                        width: 44px;
                        height: 44px;
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
                        width: min(100vw, 560px);
                        margin-top: calc(env(safe-area-inset-top, 0px) + 68px);
                        margin-bottom: 0;
                        padding-bottom: 0;
                        padding-left: 8px;
                        padding-right: 8px;
                        align-items: flex-start;
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
                        filter: drop-shadow(0 22px 40px rgba(0, 0, 0, 0.5));
                    }
                    .score-display {
                        top: 8%;
                        width: 44%;
                        gap: 6px !important;
                    }
                    .score-display img {
                        width: 16px;
                        height: 16px;
                    }
                    .score-value {
                        font-size: clamp(10px, 2.8vw, 14px);
                        text-shadow: 2px 2px 0 rgba(0,0,0,0.95);
                    }
                    .tap-to-spin {
                        font-size: clamp(11px, 2.8vw, 15px);
                        text-align: center;
                        padding: 8px 10px;
                        border-radius: 10px;
                        background: rgba(0, 0, 0, 0.32);
                        text-shadow: 0 2px 0 rgba(0,0,0,0.85);
                    }
                    .mobile-nav {
                        position: fixed;
                        bottom: calc(env(safe-area-inset-bottom, 0px) + 10px);
                        left: 50%;
                        transform: translateX(-50%);
                        width: calc(100% - 20px);
                        max-width: 440px;
                        height: 76px;
                        padding: 10px 10px calc(env(safe-area-inset-bottom, 0px) + 6px);
                        background: #000;
                        display: flex;
                        justify-content: space-around;
                        align-items: center;
                        z-index: 1200;
                        border: 2px solid rgba(255, 132, 28, 0.42);
                        border-radius: 20px;
                        box-shadow: 0 18px 40px rgba(0,0,0,0.5);
                    }
                    .nav-item {
                        background: #000;
                        border: 1px solid transparent;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        color: rgba(255,255,255,0.74);
                        font-family: 'PressStart2P', monospace;
                        font-size: 9px;
                        gap: 4px;
                        cursor: pointer;
                        width: 25%;
                        height: 100%;
                        border-radius: 14px;
                        transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
                    }
                    .nav-item.active {
                        color: #FF841C;
                        background: #261205;
                        border-color: #FF841C;
                        box-shadow: inset 0 0 0 1px rgba(255, 132, 28, 0.08);
                    }
                    .nav-item.active svg {
                        filter: drop-shadow(0 0 6px rgba(255, 132, 28, 0.18));
                    }
                    .hidden-on-mobile { display: none !important; }
                    .mobile-content-overlay {
                        position: fixed;
                        top: calc(env(safe-area-inset-top, 0px) + 10px);
                        bottom: calc(env(safe-area-inset-bottom, 0px) + 96px);
                        left: 12px;
                        right: 12px;
                        background: transparent;
                        z-index: 1180;
                        overflow: hidden;
                        padding: 0;
                        display: flex;
                    }
                    .mobile-panel-shell {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        border-radius: 22px;
                        border: 2px solid rgba(255, 132, 28, 0.44);
                        background: #000;
                        box-shadow: 0 26px 54px rgba(0,0,0,0.56);
                        overflow: hidden;
                    }
                    .mobile-panel-header {
                        display: flex;
                        align-items: flex-start;
                        justify-content: space-between;
                        gap: 12px;
                        padding: 16px 16px 14px;
                        border-bottom: 1px solid rgba(255, 132, 28, 0.16);
                        background: #000;
                    }
                    .mobile-panel-copy {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                        min-width: 0;
                    }
                    .mobile-panel-kicker {
                        font-family: 'PressStart2P', monospace;
                        font-size: 7px;
                        color: rgba(255,255,255,0.45);
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .mobile-panel-title {
                        font-family: 'PressStart2P', monospace;
                        font-size: 14px;
                        color: #FF841C;
                        line-height: 1.4;
                    }
                    .mobile-panel-subtitle {
                        font-family: 'PressStart2P', monospace;
                        font-size: 8px;
                        color: rgba(255,255,255,0.42);
                        line-height: 1.6;
                    }
                    .mobile-panel-close {
                        border: 1px solid rgba(255, 132, 28, 0.34);
                        background: #000;
                        color: #FF841C;
                        border-radius: 12px;
                        padding: 10px 12px;
                        font-family: 'PressStart2P', monospace;
                        font-size: 8px;
                        cursor: pointer;
                        flex-shrink: 0;
                    }
                    .mobile-panel-body {
                        flex: 1;
                        min-height: 0;
                        overflow: auto;
                        padding: 14px 14px 18px;
                    }
                    .practice-mode-badge {
                        top: calc(env(safe-area-inset-top, 0px) + 124px);
                        right: 14px;
                        left: auto;
                        transform: none;
                        padding: 7px 10px;
                        font-size: 8px;
                        letter-spacing: 0.06em;
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
