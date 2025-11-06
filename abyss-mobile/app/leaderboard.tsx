import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, ImageBackground } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAegis } from '@cavos/aegis';
import { Theme } from '../constants/Theme';
import { getLeaderboard, getPrizePool } from '../utils/abyssContract';

interface LeaderboardEntry {
  player_address: bigint;
  session_id: bigint;
  level: bigint;
  total_score: bigint;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { aegisAccount } = useAegis();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prizePool, setPrizePool] = useState<string>('0');
  const [showPrizeModal, setShowPrizeModal] = useState(false);

  useEffect(() => {
    loadLeaderboard();
    loadPrizePool();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLeaderboard();

      // Take only top 10
      const top10 = data.slice(0, 10);
      setLeaderboardData(top10);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const loadPrizePool = async () => {
    try {
      const pool: any = await getPrizePool();

      // Handle different possible return formats
      let poolInWei: bigint;

      if (typeof pool === 'bigint') {
        poolInWei = pool;
      } else if (pool && typeof pool === 'object' && 'low' in pool) {
        // u256 format { low, high }
        poolInWei = BigInt(pool.low);
      } else if (pool && typeof pool === 'object' && '0' in pool) {
        // Array format [low, high]
        poolInWei = BigInt(pool[0]);
      } else {
        // Try to convert directly
        poolInWei = BigInt(pool);
      }

      const poolInChips = Number(poolInWei) / 10**18;
      setPrizePool(poolInChips.toFixed(0));
    } catch (err) {
      console.error('Failed to load prize pool:', err);
      setPrizePool('0');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const formatAddress = (address: bigint) => {
    const addressStr = '0x' + address.toString(16);

    // Check if this is the current user's address
    if (aegisAccount.address && addressStr.toLowerCase() === aegisAccount.address.toLowerCase()) {
      return 'you';
    }

    if (addressStr.length <= 10) return addressStr;
    return `${addressStr.slice(0, 6)}...${addressStr.slice(-4)}`;
  };

  const isCurrentUser = (address: bigint) => {
    const addressStr = '0x' + address.toString(16);
    return aegisAccount.address && addressStr.toLowerCase() === aegisAccount.address.toLowerCase();
  };

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <Text style={[styles.headerText, styles.rankColumn]}>#</Text>
      <Text style={[styles.headerText, styles.addressColumn]}>Player</Text>
      <Text style={[styles.headerText, styles.levelColumn]}>Level</Text>
      <Text style={[styles.headerText, styles.scoreColumn]}>Score</Text>
    </View>
  );

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrent = isCurrentUser(item.player_address);
    const isFirstPlace = index === 0;

    return (
      <Animated.View
        entering={FadeIn.delay(index * 50).duration(300)}
        style={styles.row}
      >
        <View style={styles.rankColumn}>
          {isFirstPlace ? (
            <Ionicons name="trophy" size={20} color={Theme.colors.primary} />
          ) : (
            <Text style={styles.rowText}>{index + 1}</Text>
          )}
        </View>
        <Text style={[
          styles.rowText,
          styles.addressColumn,
          isCurrent && styles.currentUserText
        ]}>
          {formatAddress(item.player_address)}
        </Text>
        <Text style={[styles.rowText, styles.levelColumn]}>{item.level.toString()}</Text>
        <Text style={[styles.rowText, styles.scoreColumn]}>{item.total_score.toString()}</Text>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No leaderboard data available</Text>
    </View>
  );

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
            <Text style={styles.loadingText}>Loading leaderboard...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  if (error) {
    return (
      <ImageBackground
        source={require('../assets/images/bg-welcome.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
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
      <View style={styles.titleContainer}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.primary} />
        </Pressable>
        <Text style={styles.subtitle}>Top 10 Players</Text>
        <Pressable style={styles.prizeButton} onPress={() => setShowPrizeModal(true)}>
          <Ionicons name="trophy" size={24} color={Theme.colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={leaderboardData}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.player_address}-${index}`}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Prize Pool Overlay - Sin Modal */}
      {showPrizeModal && (
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
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 15,
            }}>
              <Ionicons name="trophy" size={24} color={Theme.colors.primary} />
              <Text style={{
                fontFamily: Theme.fonts.body,
                fontSize: 16,
                color: Theme.colors.primary,
                fontWeight: 'bold',
              }}>Prize Pool</Text>
              <Pressable onPress={() => setShowPrizeModal(false)}>
                <Ionicons name="close" size={20} color={Theme.colors.primary} />
              </Pressable>
            </View>

            {/* Total Pool */}
            <Text style={{
              fontFamily: Theme.fonts.body,
              fontSize: 10,
              color: 'rgba(255, 255, 255, 0.8)',
              textAlign: 'center',
              marginBottom: 12,
            }}>Total Pool</Text>
            <Text style={{
              fontFamily: Theme.fonts.body,
              fontSize: 24,
              color: Theme.colors.primary,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 12,
            }}>{prizePool} CHIPS</Text>

            {/* Divider */}
            <View style={{ height: 2, backgroundColor: Theme.colors.primary, marginVertical: 12 }} />

            {/* Distribution Title */}
            <Text style={{
              fontFamily: Theme.fonts.body,
              fontSize: 12,
              color: Theme.colors.white,
              marginBottom: 12,
              textAlign: 'center',
            }}>Prize Distribution</Text>

            {/* 1st Place */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 132, 28, 0.2)',
            }}>
              <View style={{
                backgroundColor: Theme.colors.primary,
                paddingVertical: 3,
                paddingHorizontal: 8,
                borderRadius: 4,
                minWidth: 35,
                alignItems: 'center',
              }}>
                <Text style={{
                  fontFamily: Theme.fonts.body,
                  fontSize: 8,
                  color: '#000',
                  fontWeight: 'bold',
                }}>1st</Text>
              </View>
              <Text style={{
                fontFamily: Theme.fonts.body,
                fontSize: 9,
                color: Theme.colors.white,
                flex: 1,
                marginHorizontal: 8,
              }}>60% of pool</Text>
              <Text style={{
                fontFamily: Theme.fonts.body,
                fontSize: 10,
                color: Theme.colors.primary,
                fontWeight: 'bold',
              }}>{(Number(prizePool) * 0.6).toFixed(0)} CHIPS</Text>
            </View>

            {/* 2nd Place */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 132, 28, 0.2)',
            }}>
              <View style={{
                backgroundColor: Theme.colors.primary,
                paddingVertical: 3,
                paddingHorizontal: 8,
                borderRadius: 4,
                minWidth: 35,
                alignItems: 'center',
              }}>
                <Text style={{
                  fontFamily: Theme.fonts.body,
                  fontSize: 8,
                  color: '#000',
                  fontWeight: 'bold',
                }}>2nd</Text>
              </View>
              <Text style={{
                fontFamily: Theme.fonts.body,
                fontSize: 9,
                color: Theme.colors.white,
                flex: 1,
                marginHorizontal: 8,
              }}>30% of pool</Text>
              <Text style={{
                fontFamily: Theme.fonts.body,
                fontSize: 10,
                color: Theme.colors.primary,
                fontWeight: 'bold',
              }}>{(Number(prizePool) * 0.3).toFixed(0)} CHIPS</Text>
            </View>

            {/* 3rd Place */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 132, 28, 0.2)',
            }}>
              <View style={{
                backgroundColor: Theme.colors.primary,
                paddingVertical: 3,
                paddingHorizontal: 8,
                borderRadius: 4,
                minWidth: 35,
                alignItems: 'center',
              }}>
                <Text style={{
                  fontFamily: Theme.fonts.body,
                  fontSize: 8,
                  color: '#000',
                  fontWeight: 'bold',
                }}>3rd</Text>
              </View>
              <Text style={{
                fontFamily: Theme.fonts.body,
                fontSize: 9,
                color: Theme.colors.white,
                flex: 1,
                marginHorizontal: 8,
              }}>10% of pool</Text>
              <Text style={{
                fontFamily: Theme.fonts.body,
                fontSize: 10,
                color: Theme.colors.primary,
                fontWeight: 'bold',
              }}>{(Number(prizePool) * 0.1).toFixed(0)} CHIPS</Text>
            </View>

            {/* Close Button */}
            <Pressable
              style={{
                backgroundColor: Theme.colors.primary,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 15,
              }}
              onPress={() => setShowPrizeModal(false)}
            >
              <Text style={{
                fontFamily: Theme.fonts.body,
                fontSize: 14,
                color: '#000',
                fontWeight: 'bold',
              }}>Close</Text>
            </Pressable>
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
  },
  backButton: {
    padding: Theme.spacing.xs,
  },
  prizeButton: {
    padding: Theme.spacing.xs,
  },
  title: {
    fontFamily: Theme.fonts.title,
    fontSize: 32,
    color: Theme.colors.white,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Theme.fonts.body,
    fontSize: 14,
    color: Theme.colors.primary,
    textAlign: 'center',
    marginTop: Theme.spacing.xs,
  },
  listContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: Theme.spacing.sm,
  },
  headerText: {
    fontFamily: Theme.fonts.body,
    fontSize: 12,
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  rowText: {
    fontFamily: Theme.fonts.body,
    fontSize: 14,
    color: Theme.colors.white,
  },
  currentUserText: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  rankColumn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressColumn: {
    flex: 1,
    paddingHorizontal: Theme.spacing.sm,
  },
  levelColumn: {
    width: 60,
    textAlign: 'center',
  },
  scoreColumn: {
    width: 80,
    textAlign: 'right',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  loadingText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  errorText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.primary,
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: Theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
