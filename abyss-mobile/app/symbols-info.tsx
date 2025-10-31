import { View, Text, Pressable, StyleSheet, ScrollView, Image, ImageBackground, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Theme } from '../constants/Theme';
import { SymbolType } from '../types';
import { DEFAULT_GAME_CONFIG, GameConfig } from '../constants/GameConfig';
import { symbolSources } from '../components/SlotGrid';
import { getSessionItems, getItemInfo, ContractItem } from '../utils/abyssContract';
import { applyItemEffects } from '../utils/itemEffects';

// Pattern visualization component
const PatternVisualization = ({ patternType }: { patternType: string }) => {
  const getPatternLayout = (type: string) => {
    switch (type) {
      case 'horizontal-3':
        return [
          ['X', 'X', 'X', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', '']
        ];
      case 'horizontal-4':
        return [
          ['X', 'X', 'X', 'X', ''],
          ['', '', '', '', ''],
          ['', '', '', '', '']
        ];
      case 'horizontal-5':
        return [
          ['X', 'X', 'X', 'X', 'X'],
          ['', '', '', '', ''],
          ['', '', '', '', '']
        ];
      case 'vertical-3':
        return [
          ['X', '', '', '', ''],
          ['X', '', '', '', ''],
          ['X', '', '', '', '']
        ];
      case 'diagonal-3':
        return [
          ['X', '', '', '', ''],
          ['', 'X', '', '', ''],
          ['', '', 'X', '', '']
        ];
      default:
        return [
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', '']
        ];
    }
  };

  const layout = getPatternLayout(patternType);

  return (
    <View style={styles.patternVisualization}>
      {layout.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.patternGridRow}>
          {row.map((cell, colIndex) => (
            <View key={colIndex} style={styles.patternCell}>
              {cell === 'X' && (
                <View style={styles.patternSymbol}>
                  <Text style={styles.patternSymbolText}>●</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

export default function SymbolsInfoScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const parsedSessionId = parseInt(sessionId || '0', 10);

  const [activeTab, setActiveTab] = useState<'symbols' | 'patterns'>('symbols');
  const [loading, setLoading] = useState(false);
  const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_GAME_CONFIG);
  const [ownedItems, setOwnedItems] = useState<ContractItem[]>([]);

  // Load items and apply effects
  useEffect(() => {
    const loadItemsAndEffects = async () => {
      if (parsedSessionId > 0) {
        try {
          setLoading(true);
          const playerItems = await getSessionItems(parsedSessionId);
          const items = await Promise.all(
            playerItems.map(pi => getItemInfo(Number(pi.item_id)))
          );
          setOwnedItems(items);

          const effects = applyItemEffects(DEFAULT_GAME_CONFIG, items);
          setGameConfig(effects.modifiedConfig);
        } catch (error) {
          console.error('Failed to load items:', error);
          setGameConfig(DEFAULT_GAME_CONFIG);
        } finally {
          setLoading(false);
        }
      }
    };

    loadItemsAndEffects();
  }, [parsedSessionId]);

  const handleBack = () => {
    router.back();
  };

  const handleSymbolsTab = () => {
    setActiveTab('symbols');
  };

  const handlePatternsTab = () => {
    setActiveTab('patterns');
  };

  const symbols = gameConfig.symbols;
  const patterns = gameConfig.patternMultipliers;

  // Helper to check if value was modified
  const wasModified = (currentValue: number, originalValue: number) => {
    return currentValue !== originalValue;
  };

  return (
    <ImageBackground
      source={require('../assets/images/bg-welcome.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
        {/* Header with back button */}
        <View style={styles.headerContainer}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.primary} />
          </Pressable>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <Pressable 
            style={[styles.tab, activeTab === 'symbols' && styles.activeTab]} 
            onPress={handleSymbolsTab}
          >
            <Text style={[styles.tabText, activeTab === 'symbols' && styles.activeTabText]}>
              symbols
            </Text>
          </Pressable>
          <Pressable 
            style={[styles.tab, activeTab === 'patterns' && styles.activeTab]} 
            onPress={handlePatternsTab}
          >
            <Text style={[styles.tabText, activeTab === 'patterns' && styles.activeTabText]}>
              patterns
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Symbols Section */}
          {activeTab === 'symbols' && (
            <View style={styles.section}>

              {loading ? (
                <ActivityIndicator size="large" color={Theme.colors.primary} />
              ) : (
                symbols.map((symbol, index) => {
                  const originalSymbol = DEFAULT_GAME_CONFIG.symbols.find(s => s.type === symbol.type);
                  const pointsModified = originalSymbol && wasModified(symbol.points, originalSymbol.points);
                  const probModified = originalSymbol && wasModified(symbol.probability, originalSymbol.probability);

                  return (
                    <View key={symbol.type} style={styles.symbolRow}>
                      <Image
                        source={symbolSources[symbol.type as keyof typeof symbolSources]}
                        style={styles.symbolImage}
                      />
                      <View style={styles.symbolInfo}>
                        <Text style={styles.symbolName}>{symbol.type.toUpperCase()}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.symbolReward, pointsModified && styles.modifiedValue]}>
                            Points: {symbol.points}
                          </Text>
                          {pointsModified && originalSymbol && (
                            <Text style={styles.originalValue}> ({originalSymbol.points})</Text>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.symbolProbability, probModified && styles.modifiedValue]}>
                            {symbol.probability.toFixed(1)}%
                          </Text>
                          {probModified && originalSymbol && (
                            <Text style={styles.originalValue}> ({originalSymbol.probability.toFixed(1)}%)</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Patterns Section */}
          {activeTab === 'patterns' && (
            <View style={styles.section}>

              {loading ? (
                <ActivityIndicator size="large" color={Theme.colors.primary} />
              ) : (
                patterns.map((pattern, index) => {
                  const originalPattern = DEFAULT_GAME_CONFIG.patternMultipliers.find(p => p.type === pattern.type);
                  const multiplierModified = originalPattern && wasModified(pattern.multiplier, originalPattern.multiplier);

                  return (
                    <View key={pattern.type} style={styles.patternRow}>
                      <PatternVisualization patternType={pattern.type} />
                      <View style={styles.patternInfo}>
                        <Text style={styles.patternName}>
                          {pattern.type.replace('-', ' ').toUpperCase()}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.patternMultiplier, multiplierModified && styles.modifiedValue]}>
                            {pattern.multiplier}x
                          </Text>
                          {multiplierModified && originalPattern && (
                            <Text style={styles.originalValue}> ({originalPattern.multiplier}x)</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
        </Animated.View>
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
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  backButton: {
    marginRight: Theme.spacing.md,
    padding: Theme.spacing.sm,
  },
  header: {
    fontFamily: Theme.fonts.body,
    fontSize: 24,
    color: Theme.colors.primary,
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.white,
  },
  activeTab: {
    backgroundColor: Theme.colors.primary,
  },
  activeTabText: {
    color: Theme.colors.background,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Theme.spacing.xl,
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: Theme.fonts.body,
    fontSize: 20,
    color: Theme.colors.primary,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.md,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  symbolImage: {
    width: 40,
    height: 40,
    marginRight: Theme.spacing.md,
  },
  symbolInfo: {
    flex: 1,
  },
  symbolName: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.white,
    fontWeight: 'bold',
  },
  symbolReward: {
    fontFamily: Theme.fonts.body,
    fontSize: 14,
    color: '#FFD700',
    marginTop: 2,
  },
  symbolProbability: {
    fontFamily: Theme.fonts.body,
    fontSize: 14,
    color: Theme.colors.white,
    opacity: 0.7,
    marginTop: 2,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  patternVisualization: {
    marginRight: Theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    padding: 4,
  },
  patternGridRow: {
    flexDirection: 'row',
  },
  patternCell: {
    width: 12,
    height: 12,
    margin: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternSymbol: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternSymbolText: {
    fontSize: 6,
    color: '#000',
    fontWeight: 'bold',
  },
  patternInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patternName: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.white,
  },
  patternMultiplier: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  modifiedValue: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  originalValue: {
    fontFamily: Theme.fonts.body,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textDecorationLine: 'line-through',
  },
});
