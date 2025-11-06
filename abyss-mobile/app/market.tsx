import { View, Text, StyleSheet, Pressable, ScrollView, Image, ImageBackground, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import { Theme } from '../constants/Theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
import {
  getSessionMarket,
  getItemInfo,
  buyItemFromMarket,
  refreshMarket,
  getSessionData,
  getSessionInventoryCount,
  getSessionItems,
  ContractItem,
  SessionMarket as SessionMarketType,
  ItemEffectType,
} from '../utils/abyssContract';
import { getItemImage, itemImages } from '../utils/itemImages';
import { useAegis } from '@cavos/aegis';

// Preload all item images
const preloadImages = async () => {
  const imageAssets = Object.values(itemImages).map(image =>
    Asset.fromModule(image).downloadAsync()
  );
  await Promise.all(imageAssets);
};

export default function MarketScreen() {
  const { sessionId } = useLocalSearchParams();
  const router = useRouter();
  const parsedSessionId = parseInt((sessionId as string) || '0', 10);
  const {aegisAccount} = useAegis();
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState<SessionMarketType | null>(null);
  const [marketItems, setMarketItems] = useState<ContractItem[]>([]);
  const [ownedItemIds, setOwnedItemIds] = useState<Set<number>>(new Set());
  const [balance, setBalance] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasingSlot, setPurchasingSlot] = useState<number | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    // Preload images on mount
    preloadImages();
    loadMarketData();
  }, [sessionId]);

  // Reload data when screen comes back into focus (e.g., returning from inventory)
  useFocusEffect(
    React.useCallback(() => {
      loadMarketData();
    }, [sessionId])
  );

  async function loadMarketData() {
    try {
      setLoading(true);

      // Fetch session data for balance
      const sessionData = await getSessionData(parsedSessionId);
      setBalance(Number(sessionData.score));

      // Fetch market data
      const market = await getSessionMarket(parsedSessionId);
      setMarketData(market);

      // Fetch item details for each market slot (convert BigInt to Number)
      const itemIds = [
        Number(market.item_slot_1),
        Number(market.item_slot_2),
        Number(market.item_slot_3),
        Number(market.item_slot_4),
        Number(market.item_slot_5),
        Number(market.item_slot_6),
      ];

      const items = await Promise.all(
        itemIds.map(id => getItemInfo(id))
      );
      setMarketItems(items);

      // Fetch inventory count
      const invCount = await getSessionInventoryCount(parsedSessionId);
      setInventoryCount(Number(invCount));

      // Fetch owned item IDs
      const playerItems = await getSessionItems(parsedSessionId);
      const ownedIds = new Set(playerItems.map(pi => Number(pi.item_id)));
      setOwnedItemIds(ownedIds);

    } catch (error) {
      console.error('Failed to load market:', error);
      Alert.alert('Error', 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  }

  async function handleBuyItem(marketSlot: number, item: ContractItem) {
    // Check if already owned
    if (ownedItemIds.has(item.item_id)) {
      Alert.alert('Cannot Purchase', 'You already own this item');
      return;
    }

    // Check inventory full
    if (inventoryCount >= 6) {
      Alert.alert('Inventory Full', 'You can only own 6 items at a time');
      return;
    }

    // Check balance
    if (balance < item.price) {
      Alert.alert('Insufficient Balance', `You need ${item.price} points but only have ${balance}`);
      return;
    }

    // Purchase immediately without confirmation
    try {
      setPurchasingSlot(marketSlot);

      if (!aegisAccount) {
        throw new Error('Aegis account not found');
      }

      await buyItemFromMarket(parsedSessionId, marketSlot, aegisAccount);

      // Wait 6 seconds for the contract to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reload market data and balance from contract
      await loadMarketData();
    } catch (error: any) {
      console.error('Buy item error:', error);

      // Parse error message
      const message = error.message || '';
      if (message.includes('already owned')) {
        Alert.alert('Error', 'Item already owned');
      } else if (message.includes('Inventory full')) {
        Alert.alert('Error', 'Inventory full (max 6 items)');
      } else if (message.includes('Insufficient')) {
        Alert.alert('Error', 'Not enough balance');
      } else {
        Alert.alert('Error', 'Purchase failed. Please try again.');
      }
    } finally {
      setPurchasingSlot(null);
    }
  }

  async function handleRefreshMarket() {
    if (!marketData) return;

    // Calculate refresh cost using same formula as contract: 5 + (refresh_count * 2)
    const refreshCost = 5 + (Number(marketData.refresh_count) * 2);

    if (balance < refreshCost) {
      Alert.alert('Insufficient Balance', `Market refresh costs ${refreshCost} points`);
      return;
    }

    setRefreshing(true);
    try {
      // Execute refresh transaction
      const txHash = await refreshMarket(parsedSessionId, aegisAccount);
      console.log('Refresh market tx:', txHash);

      // Wait for the contract to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reload market data from contract
      await loadMarketData();
    } catch (error: any) {
      console.error('Refresh market error:', error);
      const message = error.message || '';
      if (message.includes('Insufficient')) {
        Alert.alert('Error', 'Not enough balance');
      } else {
        Alert.alert('Error', 'Failed to refresh market. Please try again.');
      }
    } finally {
      setRefreshing(false);
    }
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
    try {
      const label = getEffectTypeLabel(item.effect_type);
      const value = item.effect_value;

      switch (item.effect_type) {
        case ItemEffectType.DirectScoreBonus:
          return `${label}: +${value} points to ${item.target_symbol}`;
        case ItemEffectType.SymbolProbabilityBoost:
          return `${label}: +${value}% chance for ${item.target_symbol}`;
        case ItemEffectType.PatternMultiplierBoost:
          return `${label}: +${value}% to all patterns`;
        case ItemEffectType.ScoreMultiplier:
          return `${label}: +${value}% to all scores`;
        case ItemEffectType.SpinBonus:
          return `${label}: +${value} extra spins`;
        case ItemEffectType.LevelProgressionBonus:
          return `${label}: -${value}% level requirements`;
        default:
          return label;
      }
    } catch (error) {
      console.error('Error in getEffectDetails:', error, item);
      return 'Unknown effect';
    }
  }

  const handlePreviousItem = () => {
    setCurrentItemIndex(prev => (prev === 0 ? marketItems.length - 1 : prev - 1));
  };

  const handleNextItem = () => {
    setCurrentItemIndex(prev => (prev === marketItems.length - 1 ? 0 : prev + 1));
  };

  const handleBack = () => {
    router.back();
  };

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
            <Text style={styles.loadingText}>Loading market...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // Calculate refresh cost using same formula as contract: 5 + (refresh_count * 2)
  const refreshCost = marketData ? 5 + (Number(marketData.refresh_count) * 2) : 5;
  const currentItem = marketItems[currentItemIndex];
  const isOwned = currentItem ? ownedItemIds.has(currentItem.item_id) : false;
  const isInventoryFull = inventoryCount >= 6 && !isOwned;
  const canAfford = currentItem ? balance >= currentItem.price : false;
  const isPurchasing = purchasingSlot === (currentItemIndex + 1); // marketSlot is 1-indexed
  const canPurchase = currentItem && !isOwned && !isInventoryFull && canAfford && !isPurchasing;

  return (
    <ImageBackground
      source={require('../assets/images/bg-welcome.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
          {/* Header with Balance */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={28} color={Theme.colors.primary} />
              </Pressable>
              <View style={styles.balanceContainer}>
                <Text style={styles.balanceValue}>{balance}</Text>
                <Image
                  source={require('../assets/images/coin.png')}
                  style={{ width: 24, height: 24 }}
                  resizeMode="contain"
                />
              </View>
            </View>
            <View style={styles.refreshContainer}>
              <Pressable
                style={styles.refreshButton}
                onPress={handleRefreshMarket}
                disabled={refreshing}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={Theme.colors.primary} />
                ) : (
                  <Ionicons name="refresh" size={24} color={Theme.colors.primary} />
                )}
              </Pressable>
              <View style={styles.refreshCostContainer}>
                <Text style={styles.refreshCostText}>{refreshCost}</Text>
                <Image
                  source={require('../assets/images/coin.png')}
                  style={styles.refreshCoinIcon}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>

          {/* Inventory Full Message */}
          {inventoryCount >= 6 ? (
            <View style={styles.inventoryFullContainer}>
              <Ionicons name="albums" size={80} color={Theme.colors.primary} />
              <Text style={styles.inventoryFullTitle}>Inventory Full</Text>
              <Text style={styles.inventoryFullText}>
                You have reached the maximum of 6 items.
              </Text>
              <Text style={styles.inventoryFullText}>
                Sell items from your inventory to make space for new purchases.
              </Text>
            </View>
          ) : (
            /* Item Carousel */
            currentItem && (
              <View style={styles.carouselContainer}>
                {/* Item Display */}
                <View style={styles.itemDisplayContainer}>
                  {/* Item Image - Large, centered - Clickable */}
                  <Pressable style={styles.itemImageWrapper} onPress={() => setShowInfoModal(true)}>
                    <Image
                      source={getItemImage(currentItem.item_id)}
                      style={styles.itemImageLarge}
                      resizeMode="contain"
                    />
                  </Pressable>

                  {/* Navigation Arrows and Buy Button */}
                <View style={styles.navigationContainer}>
                  <Pressable style={styles.arrowButton} onPress={handlePreviousItem}>
                    <Ionicons name="chevron-back" size={48} color={Theme.colors.primary} />
                  </Pressable>

                  {/* Buy Button */}
                  <Pressable
                    style={[styles.buyButton, !canPurchase && styles.buyButtonDisabled]}
                    onPress={() => canPurchase && handleBuyItem(currentItemIndex + 1, currentItem)}
                    disabled={!canPurchase}
                  >
                    {isPurchasing ? (
                      <ActivityIndicator size="small" color={Theme.colors.background} />
                    ) : (
                      <>
                        <Image
                          source={require('../assets/images/coin.png')}
                          style={{
                            width: 28,
                            height: 28,
                            opacity: isOwned || !canAfford ? 0.5 : 1
                          }}
                          resizeMode="contain"
                        />
                        <Text style={styles.buyButtonText}>
                          {isOwned ? 'OWNED' : currentItem.price}
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable style={styles.arrowButton} onPress={handleNextItem}>
                    <Ionicons name="chevron-forward" size={48} color={Theme.colors.primary} />
                  </Pressable>
                </View>

                  {/* Position Indicator */}
                  <Text style={styles.positionIndicator}>
                    {currentItemIndex + 1}/{marketItems.length}
                  </Text>
              </View>
            </View>
            )
          )}
        </Animated.View>

        {/* Info Overlay - Sin Modal */}
        {showInfoModal && currentItem && (
          <View style={{
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
          }}>
            <View style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 12,
              padding: 20,
              width: '100%',
              maxWidth: 400,
              borderWidth: 2,
              borderColor: Theme.colors.primary,
            }}>
              <Text style={{
                fontFamily: Theme.fonts.body,
                fontSize: 24,
                color: Theme.colors.primary,
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: 10,
              }}>{currentItem.name || 'Unknown Item'}</Text>

              <Text style={{
                fontFamily: Theme.fonts.body,
                fontSize: 16,
                color: 'rgba(255, 255, 255, 0.8)',
                textAlign: 'center',
                marginBottom: 20,
              }}>{currentItem.description || 'No description'}</Text>

              <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)', marginVertical: 15 }} />

              <Text style={{
                fontFamily: Theme.fonts.body,
                fontSize: 18,
                color: Theme.colors.primary,
                fontWeight: 'bold',
                marginBottom: 10,
              }}>Effect</Text>

              <Text style={{
                fontFamily: Theme.fonts.body,
                fontSize: 16,
                color: Theme.colors.white,
                marginBottom: 20,
              }}>{getEffectDetails(currentItem)}</Text>

              <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)', marginVertical: 15 }} />

              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ fontFamily: Theme.fonts.body, fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }}>Buy Price:</Text>
                  <Text style={{ fontFamily: Theme.fonts.body, fontSize: 18, color: Theme.colors.primary, fontWeight: 'bold' }}>{currentItem.price} pts</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: Theme.fonts.body, fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }}>Sell Price:</Text>
                  <Text style={{ fontFamily: Theme.fonts.body, fontSize: 18, color: Theme.colors.primary, fontWeight: 'bold' }}>{currentItem.sell_price} pts</Text>
                </View>
              </View>

              <Pressable
                style={{
                  backgroundColor: Theme.colors.primary,
                  paddingVertical: 15,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => setShowInfoModal(false)}
              >
                <Text style={{
                  fontFamily: Theme.fonts.body,
                  fontSize: 16,
                  color: '#000',
                  fontWeight: 'bold',
                }}>Close</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Purchase Loading Overlay */}
        {isPurchasing && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
          }}>
            <View style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 12,
              padding: 40,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: Theme.colors.primary,
            }}>
              <ActivityIndicator size="large" color={Theme.colors.primary} />
              <Text style={{
                fontFamily: Theme.fonts.body,
                fontSize: 16,
                color: Theme.colors.primary,
                marginTop: 20,
                textAlign: 'center',
              }}>Processing Purchase...</Text>
              <Text style={{
                fontFamily: Theme.fonts.body,
                fontSize: 12,
                color: 'rgba(255, 255, 255, 0.6)',
                marginTop: 10,
                textAlign: 'center',
              }}>Please wait</Text>
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
  inventoryFullContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  inventoryFullTitle: {
    fontFamily: Theme.fonts.body,
    fontSize: 28,
    color: Theme.colors.primary,
    fontWeight: 'bold',
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  inventoryFullText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.white,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
    lineHeight: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.sm,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  infoButtonHeader: {
    marginLeft: Theme.spacing.xs,
    padding: Theme.spacing.xs,
  },
  balanceValue: {
    fontFamily: Theme.fonts.body,
    fontSize: 24,
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  refreshContainer: {
    alignItems: 'center',
  },
  refreshButton: {
    padding: Theme.spacing.xs,
  },
  refreshCostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  refreshCostText: {
    fontFamily: Theme.fonts.body,
    fontSize: 12,
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  refreshCoinIcon: {
    width: 16,
    height: 16,
  },
  backButton: {
    padding: Theme.spacing.xs,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.lg,
  },
  itemDisplayContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  itemImageWrapper: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  itemImageLarge: {
    width: Math.min(SCREEN_WIDTH * 0.7, 280),
    height: Math.min(SCREEN_WIDTH * 0.7, 280),
  },
  infoButton: {
    position: 'absolute',
    bottom: -15,
    alignSelf: 'center',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.xl,
  },
  arrowButton: {
    padding: Theme.spacing.sm,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
    minHeight: 48,
  },
  buyButtonDisabled: {
    backgroundColor: 'rgba(255, 149, 0, 0.5)',
  },
  buyButtonText: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    color: Theme.colors.white,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
    padding: Theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
  },
  modalTitle: {
    fontFamily: Theme.fonts.body,
    fontSize: 24,
    color: Theme.colors.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
  },
  modalDescription: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: Theme.spacing.md,
  },
  modalSectionTitle: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    color: Theme.colors.primary,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.sm,
  },
  modalEffectBadge: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 8,
    marginBottom: Theme.spacing.sm,
  },
  modalEffectText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalStats: {
    gap: Theme.spacing.sm,
  },
  modalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalStatLabel: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modalStatValue: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: Theme.spacing.md,
    borderRadius: 8,
    marginTop: Theme.spacing.lg,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.background,
    fontWeight: 'bold',
  },
  positionIndicator: {
    fontFamily: Theme.fonts.body,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: Theme.spacing.md,
    textAlign: 'center',
  },
});
