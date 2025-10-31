import { View, Text, StyleSheet, Pressable, ScrollView, Image, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import {
  getSessionItems,
  getItemInfo,
  sellItem,
  getSessionData,
  ContractItem,
  ItemEffectType,
} from '../utils/abyssContract';
import { getItemImage } from '../utils/itemImages';
import { useAegis } from '@cavos/aegis';

export default function InventoryScreen() {
  const { sessionId } = useLocalSearchParams();
  const router = useRouter();
  const parsedSessionId = parseInt((sessionId as string) || '0', 10);
  const { aegisAccount } = useAegis();

  const [loading, setLoading] = useState(true);
  const [ownedItems, setOwnedItems] = useState<ContractItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [sellingItemId, setSellingItemId] = useState<number | null>(null);

  useEffect(() => {
    loadInventory();
  }, [sessionId]);

  async function loadInventory() {
    try {
      setLoading(true);

      // Fetch session data for balance
      const sessionData = await getSessionData(parsedSessionId);
      setBalance(Number(sessionData.score));

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

  async function handleSellItem(item: ContractItem) {
    Alert.alert(
      'Sell Item',
      `${item.name}\n\nYou will receive: ${item.sell_price} points`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sell',
          style: 'destructive',
          onPress: async () => {
            try {
              setSellingItemId(item.item_id);

              if (!aegisAccount) {
                throw new Error('Aegis account not found');
              }

              await sellItem(parsedSessionId, item.item_id, 1, aegisAccount);

              // Wait 6 seconds for the contract to update
              await new Promise(resolve => setTimeout(resolve, 6000));

              // Reload inventory and balance from contract
              await loadInventory();

              Alert.alert('Sold!', `Received ${item.sell_price} points`);
            } catch (error) {
              console.error('Sell item error:', error);
              Alert.alert('Error', 'Failed to sell item. Please try again.');
            } finally {
              setSellingItemId(null);
            }
          }
        }
      ]
    );
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
  }

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <ImageBackground
        source={require('../assets/images/bg-in-game.png')}
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
      source={require('../assets/images/bg-in-game.png')}
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
            <Text style={styles.title}>Inventory</Text>
            <View style={styles.spacer} />
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Balance:</Text>
              <Text style={styles.statValue}>{balance}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Items:</Text>
              <Text style={styles.statValue}>{ownedItems.length}/6</Text>
            </View>
          </View>

          {/* Inventory Items List */}
          {ownedItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bag-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
              <Text style={styles.emptyText}>No items owned</Text>
              <Text style={styles.emptySubtext}>Visit the market to purchase items</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            >
              {ownedItems.map((item, index) => {
                const isSelling = sellingItemId === item.item_id;

                return (
                  <Pressable
                    key={index}
                    style={[styles.itemCard, isSelling && styles.itemCardDisabled]}
                    onPress={() => !isSelling && handleSellItem(item)}
                    disabled={isSelling}
                  >
                    {/* Item Image */}
                    <View style={styles.itemImageContainer}>
                      <Image
                        source={getItemImage(item.item_id)}
                        style={styles.itemImage}
                        resizeMode="contain"
                      />
                    </View>

                    {/* Item Info */}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDescription}>{item.description}</Text>

                      {/* Effect Details */}
                      <View style={[styles.effectBadge, { backgroundColor: getEffectTypeColor(item.effect_type) }]}>
                        <Text style={styles.effectBadgeText}>
                          {getEffectDetails(item)}
                        </Text>
                      </View>

                      {/* Sell Price */}
                      <View style={styles.sellPriceContainer}>
                        <Text style={styles.sellPriceLabel}>Sell for:</Text>
                        <Text style={styles.sellPrice}>{item.sell_price} pts</Text>
                      </View>
                    </View>

                    {/* Sell Icon */}
                    <View style={styles.sellIconContainer}>
                      {isSelling ? (
                        <ActivityIndicator size="small" color={Theme.colors.primary} />
                      ) : (
                        <Ionicons name="cash-outline" size={24} color="#4CAF50" />
                      )}
                    </View>

                    {/* Loading overlay for selling */}
                    {isSelling && (
                      <View style={styles.sellingOverlay}>
                        <ActivityIndicator size="small" color={Theme.colors.primary} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
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
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  backButton: {
    padding: Theme.spacing.xs,
  },
  title: {
    fontFamily: Theme.fonts.body,
    fontSize: 24,
    color: Theme.colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  spacer: {
    width: 32,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: Theme.spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  statLabel: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statValue: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    color: Theme.colors.primary,
    fontWeight: 'bold',
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
  scrollView: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: Theme.spacing.xl,
    gap: Theme.spacing.md,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: Theme.spacing.md,
    alignItems: 'center',
  },
  itemCardDisabled: {
    opacity: 0.6,
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  itemImage: {
    width: 70,
    height: 70,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.primary,
    marginBottom: Theme.spacing.xs,
    fontWeight: 'bold',
  },
  itemDescription: {
    fontFamily: Theme.fonts.body,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: Theme.spacing.sm,
  },
  effectBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: Theme.spacing.sm,
  },
  effectBadgeText: {
    fontFamily: Theme.fonts.body,
    fontSize: 11,
    color: Theme.colors.white,
    fontWeight: 'bold',
  },
  sellPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  sellPriceLabel: {
    fontFamily: Theme.fonts.body,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  sellPrice: {
    fontFamily: Theme.fonts.body,
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  sellIconContainer: {
    marginLeft: Theme.spacing.sm,
    padding: Theme.spacing.xs,
  },
  sellingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
});
