import { View, Text, Pressable, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Theme } from '../constants/Theme';
import { SymbolType } from '../types';
import { DEFAULT_GAME_CONFIG } from '../constants/GameConfig';
import { symbolSources } from '../components/SlotGrid';

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
  const [activeTab, setActiveTab] = useState<'symbols' | 'patterns'>('symbols');

  const handleBack = () => {
    router.back();
  };

  const handleSymbolsTab = () => {
    setActiveTab('symbols');
  };

  const handlePatternsTab = () => {
    setActiveTab('patterns');
  };

  const symbols = DEFAULT_GAME_CONFIG.symbols;
  const patterns = DEFAULT_GAME_CONFIG.patternMultipliers;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
        {/* Header with back button */}
        <View style={styles.headerContainer}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.primary} />
          </Pressable>
          <Text style={styles.header}>symbols & patterns</Text>
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
              <Text style={styles.sectionTitle}>Symbols</Text>
              
              {symbols.map((symbol, index) => (
                <View key={symbol.type} style={styles.symbolRow}>
                  <Image 
                    source={symbolSources[symbol.type as keyof typeof symbolSources]} 
                    style={styles.symbolImage}
                  />
                  <View style={styles.symbolInfo}>
                    <Text style={styles.symbolName}>{symbol.type.toUpperCase()}</Text>
                    <Text style={styles.symbolReward}>Points: {symbol.points}</Text>
                    <Text style={styles.symbolProbability}>
                      {symbol.probability}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Patterns Section */}
          {activeTab === 'patterns' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Patterns</Text>
              
              {patterns.map((pattern, index) => (
                <View key={pattern.type} style={styles.patternRow}>
                  <PatternVisualization patternType={pattern.type} />
                  <View style={styles.patternInfo}>
                    <Text style={styles.patternName}>
                      {pattern.type.replace('-', ' ').toUpperCase()}
                    </Text>
                    <Text style={styles.patternMultiplier}>{pattern.multiplier}x</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
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
});
