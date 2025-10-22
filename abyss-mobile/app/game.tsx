import { View, Text, StyleSheet, ImageBackground, Dimensions, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Asset } from 'expo-asset';
import { Theme } from '../constants/Theme';
import { DEFAULT_GAME_CONFIG } from '../constants/GameConfig';
import SlotGrid, { symbolSources } from '../components/SlotGrid';
import { PatternHitAnimations } from '../components/PatternHitDisplay';
import { useGameLogic } from '../hooks/useGameLogic';
import { wp, hp } from '../utils/dimensions';
import { getSlotGridPosition, getSymbolSize } from '../utils/slotMachinePositioning';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getSessionData } from '../utils/abyssContract';
import { Pattern } from '../utils/patternDetector';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function GameScreen() {
  const { sessionId, score } = useLocalSearchParams<{ sessionId: string; score: string }>();
  const router = useRouter();
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [sessionDataLoaded, setSessionDataLoaded] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);

  const initialScore = parseInt(score || '0', 10);
  const initialSpins = 10;
  const parsedSessionId = parseInt(sessionId || '0', 10);

  // Initialize with default values first
  const [state, actions] = useGameLogic(initialScore, initialSpins, parsedSessionId, DEFAULT_GAME_CONFIG, (patterns) => {
    setHitPatterns(patterns);
    setShowPatternAnimations(true);
  });
  const [showPatternAnimations, setShowPatternAnimations] = useState(false);
  const [hitPatterns, setHitPatterns] = useState<Pattern[]>([]);
  const [showGameOver, setShowGameOver] = useState(false);

  // Get responsive symbol size and positioning
  const symbolSize = getSymbolSize();
  const gridPosition = getSlotGridPosition();

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
    await actions.spin();
  };

  const handleGameOverNavigation = () => {
    router.push('/mode-selection');
  };

  const handleExitGame = () => {
    router.push('/mode-selection');
  };

  const handleSymbolsInfo = () => {
    router.push('/symbols-info');
  };

  const handleExit = () => {
    router.push('/mode-selection');
  };

  const handlePatternAnimationsComplete = () => {
    setShowPatternAnimations(false);
    setHitPatterns([]);
  };

  // Get score threshold needed to reach next level (matches contract logic)
  const getScoreNeededForNextLevel = (currentLevel: number) => {
    // These are the points needed AT each level to advance to the next
    // Index 0 = level 1 needs 33, Index 1 = level 2 needs 66, etc.
    const levelThresholds = [33, 66, 333, 666, 999, 1333, 1666, 1999, 2333, 2666];

    // Get threshold for current level (what you need to score at this level)
    if (currentLevel <= 10) {
      return levelThresholds[currentLevel - 1] || 0;
    } else {
      return 3000 * currentLevel;
    }
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

  // Load session data on component mount
  useEffect(() => {
    loadSessionData();
  }, [parsedSessionId]);

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
      actions.updateState(contractScore, contractSpins, contractLevel);
    }
  }, [sessionDataLoaded, sessionData]);

  // Handle game over state with delay
  useEffect(() => {
    if (state.gameOver && !state.isSpinning) {
      // Add a delay before showing game over screen
      const timer = setTimeout(() => {
        setShowGameOver(true);
      }, 3000); // 3 seconds delay
      return () => clearTimeout(timer);
    } else {
      setShowGameOver(false);
    }
  }, [state.gameOver, state.isSpinning]);

  if (!assetsLoaded || !sessionDataLoaded) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>
            {!assetsLoaded ? 'Loading...' : 
             parsedSessionId > 0 ? 'Loading session data...' : 'Preparing new game...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show game over screen
  if (state.gameOver && !state.isSpinning && showGameOver) {
    return (
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
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Pressable
        style={styles.pressableArea}
        onPress={handleSpin}
        disabled={state.isSpinning || showPatternAnimations}
      >
        <ImageBackground
          source={require('../assets/images/slot_machine.png')}
          style={styles.background}
          resizeMode="contain"
          onError={(error) => {
            console.error('Slot machine image failed to load:', error.nativeEvent.error);
          }}
        >
              {/* Header with score and spins */}
        <View style={styles.header}>
          <Text style={styles.scoreText}>Score: {state.score}</Text>
          <Text style={styles.spinsText}>Spins: {state.spinsLeft}</Text>
        </View>
        
        {/* Level indicator */}
        <View style={styles.levelContainer}>
          <Text style={styles.levelText}>Level {state.level}</Text>
        </View>

        {/* Points needed for next level */}
        <View style={styles.nextLevelContainer}>
          <Text style={styles.nextLevelText}>
            Next: {getScoreNeededForNextLevel(state.level)} pts
          </Text>
        </View>

        {/* Transaction status indicator */}
        {state.transactionStatus !== 'idle' && (
          <View style={styles.transactionIndicator}>
            <Text style={styles.transactionText}>
              {state.transactionStatus === 'pending' && 'Transaction pending...'}
              {state.transactionStatus === 'success' && 'Transaction successful!'}
              {state.transactionStatus === 'error' && 'La máquina se rompió'}
            </Text>
          </View>
        )}

          {/* Slot Grid */}
          <View style={[styles.gridWrapper, {
            top: gridPosition.top,
            left: gridPosition.left,
            transform: [
              { translateX: gridPosition.translateX },
              { translateY: gridPosition.translateY }
            ],
            width: gridPosition.width,
            height: gridPosition.height,
          }]}>
            <SlotGrid 
              grid={state.grid} 
              symbolSize={symbolSize} 
              isSpinning={state.isSpinning}
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
              onAllAnimationsComplete={handlePatternAnimationsComplete}
            />
          )}

          {/* Game ending indicator */}
          {state.gameOver && !state.isSpinning && !showGameOver && (
            <View style={styles.gameEndingIndicator}>
              <Text style={styles.gameEndingText}>Game Ending...</Text>
            </View>
          )}

          {/* Info button in bottom right */}
          <Pressable style={styles.infoButton} onPress={handleSymbolsInfo}>
            <Ionicons name="information-circle-outline" size={28} color={Theme.colors.primary} />
          </Pressable>

          {/* Exit button in bottom left */}
          <Pressable style={styles.exitButton} onPress={handleExit}>
            <Ionicons name="exit-outline" size={28} color={Theme.colors.primary} />
          </Pressable>
        </ImageBackground>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  pressableArea: {
    flex: 1,
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
  },
  scoreText: {
    fontFamily: Theme.fonts.body,
    fontSize: 24,
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 8,
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    alignSelf: 'center',
  },
  levelText: {
    color: Theme.colors.primary,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Theme.fonts.body,
    fontWeight: 'bold',
  },
  nextLevelContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 8,
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    alignSelf: 'flex-start',
    marginTop: Theme.spacing.md,
  },
  nextLevelText: {
    color: '#FF0000', // Red color
    fontSize: 14,
    textAlign: 'center',
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
    fontSize: 24,
    color: Theme.colors.primary,
  },
  gridWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: Theme.colors.background,
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
});
