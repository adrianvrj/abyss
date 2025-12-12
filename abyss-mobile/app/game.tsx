import { View, Text, StyleSheet, ImageBackground, Dimensions, Pressable, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef } from 'react';
import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';
import { Theme } from '../constants/Theme';
import { DEFAULT_GAME_CONFIG } from '../constants/GameConfig';
import SlotGrid, { symbolSources } from '../components/SlotGrid';
import { PatternHitAnimations } from '../components/PatternHitDisplay';
import BibliaSaveAnimation from '../components/BibliaSaveAnimation';
import { useGameLogic } from '../hooks/useGameLogic';
import { wp, hp } from '../utils/dimensions';
import { getSlotGridPosition, getSymbolSize } from '../utils/slotMachinePositioning';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getSessionData, getSessionItems, getItemInfo, ContractItem } from '../utils/abyssContract';
import { Pattern } from '../utils/patternDetector';
import { applyItemEffects, calculateBonusSpins, calculateScoreMultiplier, AppliedEffects } from '../utils/itemEffects';
import { useFocusEffect } from '@react-navigation/native';
import { useAegis } from '@cavos/aegis';
import { calculate666Probability } from '../utils/probability666';
import { getLevelThreshold } from '../utils/levelThresholds';
import { useGameSession } from '../contexts/GameSessionContext';
import { loadGameState, setLastActiveSessionId, clearLastActiveSessionId } from '../utils/gameStorage';
import * as Haptics from 'expo-haptics';

export default function GameScreen() {
  const { sessionId, score } = useLocalSearchParams<{ sessionId: string; score: string }>();
  const router = useRouter();
  const { aegisAccount } = useAegis();
  const { session, setSession, updateScore, updateSpins, updateLevel, adjustScore, resetSpinsForLevelUp } = useGameSession();
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [sessionDataLoaded, setSessionDataLoaded] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [ownedItems, setOwnedItems] = useState<ContractItem[]>([]);
  const [appliedEffects, setAppliedEffects] = useState<AppliedEffects | null>(null);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  const initialScore = parseInt(score || '0', 10);
  const parsedSessionId = parseInt(sessionId || '0', 10);

  // Get game config - use modified config if items are loaded, otherwise use default
  const gameConfig = appliedEffects?.modifiedConfig || DEFAULT_GAME_CONFIG;

  // Calculate initial spins with bonus spins from items
  const bonusSpins = calculateBonusSpins(ownedItems);
  const initialSpins = 10 + bonusSpins;

  // Calculate score multiplier from items
  const scoreMultiplier = calculateScoreMultiplier(ownedItems);

  // Initialize with config (will use modified config once items are loaded)
  const [state, actions] = useGameLogic(
    initialScore,
    initialSpins,
    parsedSessionId,
    gameConfig,
    (patterns) => {
      setHitPatterns(patterns);
      setShowPatternAnimations(true);
    },
    scoreMultiplier,
    ownedItems,
    aegisAccount,
    // Pass context callbacks so useGameLogic can update context after spins
    { adjustScore, updateLevel, updateSpins, resetSpinsForLevelUp },
    session?.bonusSpins || 0 // Current bonus spins for persistence
  );
  const [showPatternAnimations, setShowPatternAnimations] = useState(false);
  const [hitPatterns, setHitPatterns] = useState<Pattern[]>([]);
  const [showGameOver, setShowGameOver] = useState(false);
  const [currentPatternIndex, setCurrentPatternIndex] = useState(-1);
  const [showFlash, setShowFlash] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const winSound = useRef<Audio.Sound | null>(null);

  // Get responsive symbol size and positioning
  const symbolSize = getSymbolSize();
  const gridPosition = getSlotGridPosition();

  // Initialize global session context when game starts
  useEffect(() => {
    // initialize if no session OR if session ID mismatch (new game)
    if (parsedSessionId && (!session || session.sessionId !== parsedSessionId)) {
      setSession({
        sessionId: parsedSessionId,
        score: initialScore,
        level: 1,
        spinsLeft: initialSpins,
        bonusSpins: 0,
      });
    }
  }, [parsedSessionId, initialScore, initialSpins, session?.sessionId]);

  // Restore saved game state from AsyncStorage if app was closed mid-session
  useEffect(() => {
    async function restoreSavedState() {
      if (!parsedSessionId) {
        setIsRestored(true);
        return;
      }

      const saved = await loadGameState(parsedSessionId);

      if (saved) {
        if (!saved.isComplete) {
          // It's an active saved session
          await setLastActiveSessionId(parsedSessionId);

          if (saved.spinsLeft > 0) {
            // CRITICAL: Update context with restored values so useFocusEffect doesn't overwrite local state
            // Initialize session with saved data if it's new or update if existing
            setSession({
              sessionId: parsedSessionId,
              score: saved.score,
              level: saved.level,
              spinsLeft: saved.spinsLeft,
              bonusSpins: saved.bonusSpins || 0, // Restore bonus spins
            });

            actions.updateState(saved.score, saved.spinsLeft, saved.level);
          }
        } else {
          // Session is complete, so it shouldn't be "active"
          await clearLastActiveSessionId();
        }
      } else {
        // No save found, assumably a new session just started
        await setLastActiveSessionId(parsedSessionId);
      }

      setIsRestored(true);
    }
    restoreSavedState();
  }, [parsedSessionId]);

  // When returning from market/inventory, sync local state with context (source of truth)
  // Context is updated by market/inventory, so we pull those changes here
  useFocusEffect(
    React.useCallback(() => {
      if (session && session.sessionId === parsedSessionId) {
        // Pull latest score/spins/level from context
        if (
          session.score !== state.score ||
          session.spinsLeft !== state.spinsLeft ||
          session.level !== state.level
        ) {
          console.log(`[GameSync] Pulling from context: score=${session.score}, spins=${session.spinsLeft}, level=${session.level}`);
          actions.updateState(session.score, session.spinsLeft, session.level);
        }
      }
    }, [session?.sessionId, session?.score, session?.spinsLeft, session?.level, parsedSessionId])
  );

  // Load win sound

  // Load win sound
  useEffect(() => {
    async function loadSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/win.wav')
        );
        winSound.current = sound;
      } catch (error) {
        console.error('Failed to load win sound:', error);
      }
    }
    loadSound();

    // Cleanup
    return () => {
      if (winSound.current) {
        winSound.current.unloadAsync();
      }
    };
  }, []);

  // Preload all images
  useEffect(() => {
    async function loadAssets() {
      try {
        const imageAssets = [
          require('../assets/images/slot_machine.png'),
          ...Object.values(symbolSources),
        ].map(image => Asset.fromModule(image).downloadAsync());

        await Promise.all(imageAssets);
        setAssetsLoaded(true);
      } catch (error) {
        console.error('Error loading assets:', error);
        setAssetsLoaded(true); // Continue anyway
      }
    }

    loadAssets();
  }, []);

  const handleSpin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await actions.spin();
  };

  const handleGameOverNavigation = () => {
    Haptics.selectionAsync();
    router.push('/mode-selection');
  };

  const handleExitGame = () => {
    Haptics.selectionAsync();
    router.push('/mode-selection');
  };

  const handleSymbolsInfo = () => {
    Haptics.selectionAsync();
    router.push(`/symbols-info?sessionId=${parsedSessionId}`);
  };

  const handleExit = () => {
    Haptics.selectionAsync();
    router.push('/mode-selection');
  };

  const handleMarket = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://abyss-server-gilt.vercel.app';
      const response = await fetch(`${API_URL}/api/sync-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: parsedSessionId,
          score: state.score,
          level: state.level,
        }),
      });
      if (!response.ok) {
        console.error('Failed to sync score');
      }
      router.push(`/market?sessionId=${parsedSessionId}`);
    } catch (error) {
      console.error('Sync error:', error);
      router.push(`/market?sessionId=${parsedSessionId}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInventory = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://abyss-server-gilt.vercel.app';
      const response = await fetch(`${API_URL}/api/sync-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: parsedSessionId,
          score: state.score,
          level: state.level,
        }),
      });
      if (!response.ok) {
        console.error('Failed to sync score');
      }
      router.push(`/inventory?sessionId=${parsedSessionId}`);
    } catch (error) {
      console.error('Sync error:', error);
      router.push(`/inventory?sessionId=${parsedSessionId}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePatternAnimationsComplete = () => {
    setShowPatternAnimations(false);
    setHitPatterns([]);
    setCurrentPatternIndex(-1);
  };

  const handleCurrentPatternChange = async (index: number) => {
    setCurrentPatternIndex(index);

    // Trigger flash effect and play sound when a new pattern is shown
    if (index >= 0) {
      setShowFlash(true);
      setTimeout(() => {
        setShowFlash(false);
      }, 150); // Flash duration

      // Play win sound for 0.5 seconds
      try {
        if (winSound.current) {
          await winSound.current.setPositionAsync(0);
          await winSound.current.playAsync();

          // Stop after 500ms (0.5 seconds)
          setTimeout(async () => {
            if (winSound.current) {
              await winSound.current.stopAsync();
            }
          }, 400);
        }
      } catch (error) {
        console.error('Failed to play win sound:', error);
      }
    }
  };

  // Get score threshold needed to reach next level (matches contract logic)
  const getScoreNeededForNextLevel = (currentLevel: number) => {
    return getLevelThreshold(currentLevel);
  };

  // Load session data from contract
  const loadSessionData = async () => {
    if (parsedSessionId > 0) {
      try {
        const data = await getSessionData(parsedSessionId);
        setSessionData(data);
        setSessionDataLoaded(true);
      } catch (error) {
        console.error('Failed to load session data:', error);
        setSessionDataLoaded(true); // Still mark as loaded to continue
      }
    } else {
      setSessionDataLoaded(true); // New session, no data to load
    }
  };

  // Load inventory and apply item effects
  const loadInventoryAndApplyEffects = async () => {
    if (parsedSessionId > 0) {
      try {
        // Fetch owned items
        const playerItems = await getSessionItems(parsedSessionId);

        // Fetch full item details (convert BigInt to Number)
        const items = await Promise.all(
          playerItems.map(pi => getItemInfo(Number(pi.item_id)))
        );
        setOwnedItems(items);

        // Apply effects to game config
        const effects = applyItemEffects(DEFAULT_GAME_CONFIG, items);
        setAppliedEffects(effects);

        // Calculate bonus spins
        const bonusSpins = calculateBonusSpins(items);
        // Note: bonus spins will be applied in useGameLogic initialization

        setItemsLoaded(true);
      } catch (error) {
        console.error('Failed to load inventory:', error);
        // Set empty effects so game can continue
        setAppliedEffects({
          modifiedConfig: DEFAULT_GAME_CONFIG,
          activeEffects: []
        });
        setItemsLoaded(true);
      }
    } else {
      // No session yet, use default config
      setAppliedEffects({
        modifiedConfig: DEFAULT_GAME_CONFIG,
        activeEffects: []
      });
      setItemsLoaded(true);
    }
  };

  // Load session data on component mount
  useEffect(() => {
    loadSessionData();
  }, [parsedSessionId]);

  // Load inventory after session data is loaded
  useEffect(() => {
    if (sessionDataLoaded) {
      loadInventoryAndApplyEffects();
    }
  }, [sessionDataLoaded]);

  // Reload inventory when returning from market/inventory screens
  useFocusEffect(
    React.useCallback(() => {
      if (sessionDataLoaded) {
        // Reload session data and inventory when returning to screen
        loadSessionData();
        loadInventoryAndApplyEffects();
      }
    }, [sessionDataLoaded])
  );

  // Log session data when loaded and update game state
  useEffect(() => {
    if (sessionDataLoaded && sessionData) {
      // Extract data from contract response
      const contractScore = Number(sessionData.score || 0n);
      const contractSpins = Number(sessionData.spins_remaining || 0n);
      const contractTotalScore = Number(sessionData.total_score || 0n);
      const contractLevel = Number(sessionData.level || 1n);
      const contractIsActive = sessionData.is_active;
      const contractIsCompetitive = sessionData.is_competitive;

      // Update game state with contract data
      // CRITICAL FIX: Do NOT overwrite local state with contract data here.
      // Contract data (especially spins) is often stale because we don't sync every spin to chain.
      // Local state (AsyncStorage/Context) is the source of truth for active gameplay.

      // Only update if we absolutely have no state? No, trust local state initialization.
      // actions.updateState(contractScore, contractSpins, contractLevel);
    }
  }, [sessionDataLoaded, sessionData]);

  // Handle game over state with delay
  useEffect(() => {
    if (state.gameOver && !state.isSpinning) {
      // Add a delay before showing game over screen
      const timer = setTimeout(() => {
        setShowGameOver(true);
      }, 1000); // 1 second delay (Reduced from 3s)
      return () => clearTimeout(timer);
    } else {
      setShowGameOver(false);
    }
  }, [state.gameOver, state.isSpinning]);

  if (!assetsLoaded || !sessionDataLoaded || !itemsLoaded) {
    return (
      <ImageBackground
        source={require('../assets/images/bg-welcome.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>
              {!assetsLoaded ? 'Loading...' :
                !sessionDataLoaded ? (parsedSessionId > 0 ? 'Loading session data...' : 'Preparing new game...') :
                  'Loading inventory...'}
            </Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // Show game over screen
  if (state.gameOver && !state.isSpinning && showGameOver) {
    return (
      <ImageBackground
        source={require('../assets/images/bg-welcome.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <Animated.View
            entering={FadeIn.duration(800)}
            exiting={FadeOut.duration(400)}
            style={styles.gameOverContainer}
          >
            {/* Exit button */}
            <Pressable style={styles.exitButton} onPress={handleExitGame}>
              <Ionicons name="close-circle-outline" size={28} color={Theme.colors.primary} />
            </Pressable>

            <View style={styles.gameOverContent}>
              <Text style={[styles.gameOverTitle, state.is666 && styles.gameOverTitle666]}>
                {state.is666 ? '666 TRIGGERED' : 'GAME OVER'}
              </Text>

              <Text style={styles.gameOverSubtitle}>
                {state.is666
                  ? 'All progress lost!'
                  : 'No spins remaining'
                }
              </Text>

              <View style={styles.finalScoreContainer}>
                <Text style={styles.finalScoreLabel}>Final Score:</Text>
                <Text style={styles.finalScoreValue}>{state.score}</Text>
              </View>

              <Pressable
                style={styles.gameOverOption}
                onPress={handleGameOverNavigation}
              >
                <Text style={styles.gameOverOptionText}>&gt; back to mode selection ☐</Text>
              </Pressable>
            </View>
          </Animated.View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/images/bg-welcome.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.gameArea}>
          <ImageBackground
            source={require('../assets/images/slot_machine.png')}
            style={styles.background}
            resizeMode="contain"
            onError={(error) => {
              console.error('Slot machine image failed to load:', error.nativeEvent.error);
            }}
          >
            {/* Clickable area for spin - only over slot machine */}
            <Pressable
              onPress={handleSpin}
              disabled={state.isSpinning || showPatternAnimations}
              style={styles.slotMachineClickArea}
            />
            {/* Header with score and spins */}
            <View style={styles.header}>
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreText}>{state.score}</Text>
                <Image
                  source={require('../assets/images/coin.png')}
                  style={{ width: 24, height: 24 }}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.spinsText}>Spins: {state.spinsLeft}</Text>
            </View>

            {/* Level indicator */}
            <View style={styles.levelContainer}>
              <Text style={styles.levelText}>Level {state.level}</Text>
            </View>

            {/* 666 Probability indicator */}
            <View style={styles.probabilityContainer}>
              <Ionicons name="warning" size={16} color="#ff4444" />
              <Text style={styles.probabilityText}>
                666 Risk: {calculate666Probability(state.level).toFixed(1)}%
              </Text>
            </View>

            {/* Points needed for next level */}
            <View style={styles.nextLevelContainer}>
              <Text style={styles.nextLevelText}>
                Next: {getScoreNeededForNextLevel(state.level)} pts
              </Text>
            </View>

            {/* Slot Grid */}
            <View style={[styles.gridWrapper, {
              top: gridPosition.top as unknown as number,
              left: gridPosition.left as unknown as number,
              width: gridPosition.width,
              height: gridPosition.height,
            }]}>
              <SlotGrid
                grid={state.grid}
                symbolSize={symbolSize}
                isSpinning={state.isSpinning}
                patterns={currentPatternIndex >= 0 && hitPatterns[currentPatternIndex] ? [hitPatterns[currentPatternIndex]] : []}
                showPatternLines={!state.isSpinning && currentPatternIndex >= 0}
              />
            </View>

            {/* Tap hint text */}
            {!state.isSpinning && state.spinsLeft > 0 && !state.gameOver && (
              <View style={styles.hintWrapper}>
                <Text style={styles.hintText}>tap to spin</Text>
              </View>
            )}

            {/* Pattern hit animations */}
            {showPatternAnimations && (
              <PatternHitAnimations
                patterns={hitPatterns}
                gameConfig={appliedEffects?.modifiedConfig}
                onAllAnimationsComplete={handlePatternAnimationsComplete}
                onCurrentPatternChange={handleCurrentPatternChange}
              />
            )}

            {/* Biblia Save Animation */}
            {state.bibliaSaved && (
              <BibliaSaveAnimation
                onComplete={() => {
                  // Animation complete, nothing to do (flag already reset in useGameLogic)
                }}
              />
            )}

            {/* Game ending indicator */}
            {state.gameOver && !state.isSpinning && !showGameOver && (
              <View style={styles.gameEndingIndicator}>
                <Text style={styles.gameEndingText}>Game Ending...</Text>
              </View>
            )}

            {/* Info button in bottom right */}
            <Pressable
              style={styles.infoButton}
              onPress={handleSymbolsInfo}
              onPressIn={(e) => e.stopPropagation()}
            >
              <Ionicons name="information-circle-outline" size={28} color={Theme.colors.primary} />
            </Pressable>

            {/* Exit button in bottom left */}
            <Pressable
              style={styles.exitButton}
              onPress={handleExit}
              onPressIn={(e) => e.stopPropagation()}
            >
              <Ionicons name="exit-outline" size={28} color={Theme.colors.primary} />
            </Pressable>

            {/* Market button in top right */}
            <Pressable
              style={styles.marketButton}
              onPress={() => {
                Haptics.selectionAsync();
                handleMarket();
              }}
              onPressIn={(e) => e.stopPropagation()}
            >
              <Ionicons name="storefront" size={24} color={Theme.colors.primary} />
              {ownedItems.length > 0 && (
                <View style={styles.itemBadge}>
                  <Text style={styles.itemBadgeText}>{ownedItems.length}</Text>
                </View>
              )}
            </Pressable>

            {/* Inventory button below market */}
            <Pressable
              style={styles.inventoryButton}
              onPress={() => {
                Haptics.selectionAsync();
                handleInventory();
              }}
              onPressIn={(e) => e.stopPropagation()}
            >
              <Ionicons name="bag-handle" size={24} color={Theme.colors.primary} />
              {ownedItems.length > 0 && (
                <View style={styles.itemBadge}>
                  <Text style={styles.itemBadgeText}>{ownedItems.length}</Text>
                </View>
              )}
            </Pressable>

            {/* Flash overlay for pattern hits */}
            {showFlash && (
              <View style={styles.flashOverlay} />
            )}
          </ImageBackground>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  gameArea: {
    flex: 1,
  },
  slotMachineClickArea: {
    position: 'absolute',
    top: '25%',
    left: '15%',
    right: '15%',
    bottom: '25%',
    zIndex: 1,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: Theme.spacing.md,
    left: Theme.spacing.lg,
    right: Theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
    paddingTop: Theme.spacing.md,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: Theme.spacing.sm,
    marginVertical: Theme.spacing.xs,
  },
  scoreText: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    color: Theme.colors.primary,
  },
  symbolsInfoButton: {
    padding: Theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  infoButton: {
    position: 'absolute',
    bottom: Theme.spacing.xl,
    right: Theme.spacing.xl,
    padding: Theme.spacing.md,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    zIndex: 10,
  },
  exitButton: {
    position: 'absolute',
    bottom: Theme.spacing.xl,
    left: Theme.spacing.xl,
    padding: Theme.spacing.md,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    zIndex: 10,
  },
  marketButton: {
    position: 'absolute',
    top: 80,
    right: Theme.spacing.xl,
    padding: Theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    zIndex: 10,
  },
  inventoryButton: {
    position: 'absolute',
    top: 150, // Below market button
    right: Theme.spacing.xl,
    padding: Theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    zIndex: 10,
  },
  itemBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  itemBadgeText: {
    fontFamily: Theme.fonts.body,
    fontSize: 12,
    color: Theme.colors.white,
    fontWeight: 'bold',
  },
  sessionInfoContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 8,
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  sessionInfoText: {
    color: Theme.colors.white,
    fontSize: 12,
    textAlign: 'center',
    fontFamily: Theme.fonts.body,
  },
  levelContainer: {
    position: 'absolute',
    top: 55,
    left: Theme.spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 12,
    borderRadius: 6,
  },
  levelText: {
    color: Theme.colors.primary,
    fontSize: 14,
    fontFamily: Theme.fonts.body,
    fontWeight: 'bold',
  },
  probabilityContainer: {
    position: 'absolute',
    top: 85,
    left: Theme.spacing.lg,
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  probabilityText: {
    fontFamily: Theme.fonts.body,
    fontSize: 11,
    color: '#ff4444',
    fontWeight: 'bold',
  },
  nextLevelContainer: {
    position: 'absolute',
    top: 115,
    left: Theme.spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  nextLevelText: {
    color: '#FF0000', // Red color
    fontSize: 12,
    fontFamily: Theme.fonts.body,
    fontWeight: 'normal',
  },
  transactionIndicator: {
    position: 'absolute',
    top: 100,
    right: Theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 8,
    zIndex: 1000,
  },
  transactionText: {
    color: Theme.colors.white,
    fontSize: 12,
    fontFamily: Theme.fonts.body,
    fontWeight: 'bold',
  },
  spinsText: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    color: Theme.colors.primary,
  },
  gridWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [
      { translateX: '-50%' },
      { translateY: '-50%' }
    ],
  },
  hintWrapper: {
    position: 'absolute',
    bottom: Theme.spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    color: Theme.colors.white,
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Theme.spacing.lg,
  },
  loadingText: {
    fontFamily: Theme.fonts.body,
    fontSize: 20,
    color: Theme.colors.primary,
  },
  debugOverlay: {
    position: 'absolute',
    top: -20,
    left: -50,
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    padding: 4,
    borderRadius: 4,
    zIndex: 1000,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gameOverContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverContent: {
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
    gap: Theme.spacing.lg,
  },
  gameOverTitle: {
    fontFamily: Theme.fonts.body,
    fontSize: 36,
    color: Theme.colors.primary,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  gameOverTitle666: {
    color: '#ff4444', // Red color for 666
    fontSize: 40,
  },
  gameOverSubtitle: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    color: Theme.colors.white,
    textAlign: 'center',
    opacity: 0.8,
  },
  finalScoreContainer: {
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginVertical: Theme.spacing.md,
  },
  finalScoreLabel: {
    fontFamily: Theme.fonts.body,
    fontSize: 20,
    color: Theme.colors.white,
    opacity: 0.7,
  },
  finalScoreValue: {
    fontFamily: Theme.fonts.body,
    fontSize: 32,
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  gameOverOption: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
    marginTop: Theme.spacing.lg,
  },
  gameOverOptionText: {
    fontFamily: Theme.fonts.body,
    fontSize: 24,
    color: Theme.colors.primary,
  },
  gameEndingIndicator: {
    position: 'absolute',
    top: '20%',
    right: Theme.spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  gameEndingText: {
    fontFamily: Theme.fonts.body,
    fontSize: 20,
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    zIndex: 999,
  },
});
