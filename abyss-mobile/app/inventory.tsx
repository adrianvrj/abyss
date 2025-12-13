import { View, Text, StyleSheet, Pressable, ScrollView, Image, ImageBackground, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { Theme } from '../constants/Theme';
import { useGameSession } from '../contexts/GameSessionContext';
import {
  getSessionItems,
  getItemInfo,
  sellItem,
  ContractItem,
  ItemEffectType,
} from '../utils/abyssContract';
import { getItemImage, itemImages } from '../utils/itemImages';
import { useAegis } from '@cavos/aegis';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Preload all item images
const preloadImages = async () => {
  const imageAssets = Object.values(itemImages).map(image =>
    Asset.fromModule(image).downloadAsync()
  );
  await Promise.all(imageAssets);
};

// Responsive sizing calculations
const itemImageSize = 220;
const cardMaxWidth = Math.min(SCREEN_WIDTH * 0.85, 350);
const effectBadgeFontSize = SCREEN_WIDTH < 375 ? 11 : 12;
const sellButtonFontSize = SCREEN_WIDTH < 375 ? 14 : 15;
const emptySlotFontSize = SCREEN_WIDTH < 375 ? 24 : 32;
const arrowSize = SCREEN_WIDTH < 375 ? 40 : 48;

export default function InventoryScreen() {
  const { sessionId } = useLocalSearchParams();
  const router = useRouter();
  const parsedSessionId = parseInt((sessionId as string) || '0', 10);
  const { session, adjustScore, adjustSpins, adjustBonusSpins } = useGameSession();
  const { aegisAccount } = useAegis();

  const [loading, setLoading] = useState(true);
  const [ownedItems, setOwnedItems] = useState<ContractItem[]>([]);
  const [balance, setBalance] = useState(session?.score ?? 0); // Initialize with context score
  const [sellingItemId, setSellingItemId] = useState<number | null>(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [itemToSell, setItemToSell] = useState<ContractItem | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  // Sync local balance with context when context score changes
  useEffect(() => {
    if (session) {
      setBalance(session.score);
    }
  }, [session?.score]);

  useEffect(() => {
    // Preload images on mount
    preloadImages();
    loadInventory();
  }, [sessionId]);

  async function loadInventory() {
    try {
      setLoading(true);

      // Balance is set from URL params (client state)

      // Fetch owned items
      const playerItems = await getSessionItems(parsedSessionId);

      // Fetch full item details (convert BigInt to Number)
      const items = await Promise.all(
        playerItems.map(pi => getItemInfo(Number(pi.item_id)))
      );
      setOwnedItems(items);

    } catch (error) {
      console.error('Failed to load inventory:', error);
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }

  function handleSellItem(item: ContractItem) {
    setItemToSell(item);
    setShowSellModal(true);
  }

  async function confirmSellItem() {
    if (!itemToSell) return;

    try {
      setSellingItemId(itemToSell.item_id);
      setShowSellModal(false);

      if (!aegisAccount) {
        throw new Error('Aegis account not found');
      }

      await sellItem(parsedSessionId, itemToSell.item_id, 1, aegisAccount);

      // Update balance locally and in global context
      setBalance((prev: number) => prev + itemToSell.sell_price);
      adjustScore(itemToSell.sell_price); // Update global context so game screen knows

      // Remove spins if sold item was a bonus spin
      // Also remove from bonusSpins tracking so it doesn't persist on level ups
      if (itemToSell.effect_type === ItemEffectType.SpinBonus) {
        adjustSpins(-itemToSell.effect_value);
        adjustBonusSpins(-itemToSell.effect_value); // Remove from permanent tracking
      }

      // Reload inventory (items list only, balance is tracked locally)
      const playerItems = await getSessionItems(parsedSessionId);
      const items = await Promise.all(
        playerItems.map(pi => getItemInfo(Number(pi.item_id)))
      );
      setOwnedItems(items);
    } catch (error) {
      console.error('Sell item error:', error);
      Alert.alert('Error', 'Failed to sell item. Please try again.');
    } finally {
      setSellingItemId(null);
      setItemToSell(null);
    }
  }

  function cancelSell() {
    setShowSellModal(false);
    setItemToSell(null);
  }

  function getEffectTypeLabel(effectType: ItemEffectType): string {
    switch (effectType) {
      case ItemEffectType.DirectScoreBonus:
        return 'Score Boost';
      case ItemEffectType.SymbolProbabilityBoost:
        return 'Probability Boost';
      case ItemEffectType.PatternMultiplierBoost:
        return 'Pattern Boost';
      case ItemEffectType.ScoreMultiplier:
        return 'Score Multiplier';
      case ItemEffectType.SpinBonus:
        return 'Extra Spins';
      case ItemEffectType.LevelProgressionBonus:
        return 'Level Boost';
      default:
        return 'Unknown';
    }
  }

  function getEffectTypeColor(effectType: ItemEffectType): string {
    switch (effectType) {
      case ItemEffectType.DirectScoreBonus:
      case ItemEffectType.ScoreMultiplier:
        return '#4CAF50'; // Green
      case ItemEffectType.SymbolProbabilityBoost:
        return '#2196F3'; // Blue
      case ItemEffectType.PatternMultiplierBoost:
        return '#FF9800'; // Orange
      case ItemEffectType.SpinBonus:
        return '#9C27B0'; // Purple
      case ItemEffectType.LevelProgressionBonus:
        return '#F44336'; // Red
      default:
        return Theme.colors.primary;
    }
  }

  function getEffectDetails(item: ContractItem): string {
    const value = item.effect_value;

    switch (item.effect_type) {
      case ItemEffectType.DirectScoreBonus:
        return `+${value} points to ${item.target_symbol}`;
      case ItemEffectType.SymbolProbabilityBoost:
        return `+${value}% chance for ${item.target_symbol}`;
      case ItemEffectType.PatternMultiplierBoost:
        return `+${value}% to all patterns`;
      case ItemEffectType.ScoreMultiplier:
        return `+${value}% to all scores`;
      case ItemEffectType.SpinBonus:
        return `+${value} extra spins`;
      case ItemEffectType.LevelProgressionBonus:
        return `-${value}% level requirements`;
      default:
        return 'Unknown effect';
    }
  }

  const handleBack = () => {
    router.back();
  };

  // Create array with items + empty slots (total 7)
  const inventorySlots = [...ownedItems];
  while (inventorySlots.length < 7) {
    inventorySlots.push(null as any); // Add null for empty slots
  }

  if (loading) {
    return (
      <ImageBackground
        source={require('../assets/images/bg-welcome.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>Loading inventory...</Text>
          </View>
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
      <SafeAreaView style={styles.container}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={Theme.colors.primary} />
            </Pressable>
          </View>

          {/* Inventory Carousel */}
          <View style={styles.carouselContainer}>
            <View style={styles.carouselContent}>
              {/* Previous Arrow */}
              <Pressable
                style={styles.arrowButton}
                onPress={() => setCurrentItemIndex(prev => prev === 0 ? 6 : prev - 1)}
              >
                <Ionicons name="chevron-back" size={arrowSize} color={Theme.colors.primary} />
              </Pressable>

              {/* Current Item Card */}
              <View style={styles.itemCardContainer}>
                <View style={styles.itemCard}>
                  {inventorySlots[currentItemIndex] ? (
                    <>
                      {/* Item Image Container with overflow */}
                      <View style={styles.itemImageContainer}>
                        <Image
                          source={getItemImage(inventorySlots[currentItemIndex].item_id)}
                          style={[styles.itemImage, { width: itemImageSize, height: itemImageSize }]}
                          resizeMode="contain"
                        />
                      </View>

                      {/* Effect Badge */}
                      <View style={[styles.effectBadge, { backgroundColor: getEffectTypeColor(inventorySlots[currentItemIndex].effect_type) }]}>
                        <Text style={[styles.effectBadgeText, { fontSize: effectBadgeFontSize }]}>
                          {getEffectDetails(inventorySlots[currentItemIndex])}
                        </Text>
                      </View>

                      {/* Sell Button */}
                      <Pressable
                        style={[styles.sellButton, sellingItemId === inventorySlots[currentItemIndex].item_id && styles.sellButtonDisabled]}
                        onPress={() => handleSellItem(inventorySlots[currentItemIndex])}
                        disabled={sellingItemId === inventorySlots[currentItemIndex].item_id}
                      >
                        {sellingItemId === inventorySlots[currentItemIndex].item_id ? (
                          <ActivityIndicator size="small" color={Theme.colors.background} />
                        ) : (
                          <>
                            <Image
                              source={require('../assets/images/coin.png')}
                              style={styles.sellButtonIcon}
                              resizeMode="contain"
                            />
                            <Text style={[styles.sellButtonText, { fontSize: sellButtonFontSize }]}>sell</Text>
                          </>
                        )}
                      </Pressable>

                      {/* Position Indicator */}
                      <Text style={styles.positionIndicator}>
                        {currentItemIndex + 1}/7
                      </Text>
                    </>
                  ) : (
                    <>
                      {/* Empty Slot */}
                      <Text style={[styles.emptySlotText, { fontSize: emptySlotFontSize }]}>empty</Text>

                      {/* Position Indicator */}
                      <Text style={styles.positionIndicator}>
                        {currentItemIndex + 1}/7
                      </Text>
                    </>
                  )}
                </View>
              </View>

              {/* Next Arrow */}
              <Pressable
                style={styles.arrowButton}
                onPress={() => setCurrentItemIndex(prev => prev === 6 ? 0 : prev + 1)}
              >
                <Ionicons name="chevron-forward" size={arrowSize} color={Theme.colors.primary} />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* Sell Confirmation Modal */}
        {showSellModal && itemToSell && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Sell for</Text>

              <View style={styles.modalPriceValue}>
                <Text style={styles.modalPriceText}>{itemToSell.sell_price}</Text>
                <Image
                  source={require('../assets/images/coin.png')}
                  style={styles.modalCoinIcon}
                  resizeMode="contain"
                />
                <Text style={styles.modalQuestionText}>?</Text>
              </View>

              <View style={styles.modalButtons}>
                <Pressable style={styles.modalCancelButton} onPress={cancelSell}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalConfirmButton} onPress={confirmSellItem}>
                  <Text style={styles.modalConfirmText}>Sell</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
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
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.primary,
    marginTop: Theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  backButton: {
    padding: Theme.spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  emptyText: {
    fontFamily: Theme.fonts.body,
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: Theme.spacing.md,
  },
  emptySubtext: {
    fontFamily: Theme.fonts.body,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: Theme.spacing.xs,
    textAlign: 'center',
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  carouselContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flex: 1,
  },
  arrowButton: {
    padding: Theme.spacing.md,
  },
  itemCardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    borderRadius: 12,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: 350,
    height: 350,
  },
  itemImageContainer: {
    height: 160,
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
    overflow: 'visible',
  },
  itemImage: {
    // Image will overflow this container
  },
  effectBadge: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: Theme.spacing.lg,
  },
  effectBadgeText: {
    fontFamily: Theme.fonts.body,
    color: Theme.colors.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sellButton: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    minWidth: 140,
  },
  sellButtonDisabled: {
    opacity: 0.6,
  },
  sellButtonIcon: {
    width: 22,
    height: 22,
  },
  sellButtonText: {
    fontFamily: Theme.fonts.body,
    color: Theme.colors.white,
    fontWeight: 'bold',
    textTransform: 'lowercase',
  },
  emptySlotText: {
    fontFamily: Theme.fonts.body,
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: 'bold',
    textTransform: 'lowercase',
  },
  positionIndicator: {
    fontFamily: Theme.fonts.body,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: Theme.spacing.md,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: Theme.fonts.body,
    fontSize: 28,
    color: Theme.colors.primary,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalPriceValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  modalPriceText: {
    fontFamily: Theme.fonts.body,
    fontSize: 48,
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  modalQuestionText: {
    fontFamily: Theme.fonts.body,
    fontSize: 48,
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  modalCoinIcon: {
    width: 42,
    height: 42,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalCancelText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.white,
    fontWeight: 'bold',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.background,
    fontWeight: 'bold',
  },
});
