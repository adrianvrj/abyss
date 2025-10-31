import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, ImageBackground } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAegis } from '@cavos/aegis';
import { Theme } from '../constants/Theme';
import { getLeaderboard } from '../utils/abyssContract';

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

  useEffect(() => {
    loadLeaderboard();
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
        <View style={styles.spacer} />
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
  spacer: {
    width: 32, // Same width as back button to center title
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
