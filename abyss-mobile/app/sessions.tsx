import { View, Text, Pressable, StyleSheet, ScrollView, ImageBackground, Linking, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Theme } from '../constants/Theme';
import { MOCK_SESSIONS } from '../constants/MockData';
import { ModeType } from '../types';
import { getPlayerSessions, newSession } from '../utils/abyssContract';
import { useAegis } from '@cavos/aegis';
import { TransactionStatusComponent, TransactionStatus } from '../components/TransactionStatus';
import { Contract, RpcProvider } from 'starknet';

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'view',
  },
];

export default function SessionsScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const { aegisAccount } = useAegis();
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus | null>(null);
  const [sessions, setSessions] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [chipBalance, setChipBalance] = useState<string>('0');

  const mockSessions = MOCK_SESSIONS[mode as ModeType] || MOCK_SESSIONS.casual;

  const handleSessionSelect = (sessionId: number) => {
    router.push(`/game?sessionId=${sessionId}&score=0`);
  };

  const handleNewGame = async () => {
    try {
      // Show pending status
      setTransactionStatus({
        status: 'pending',
        message: 'Creating new session...'
      });

      // Show loading state while creating session
      setLoading(true);

      // Get player address from aegis account
      const playerAddress = aegisAccount.address;
      if (!playerAddress) {
        throw new Error('No player address available');
      }

      // Determine if competitive based on mode
      const isCompetitive = mode === 'competitive';

      // Create new session using contract
      const txHash = await newSession(aegisAccount, isCompetitive);

      // Show success status
      setTransactionStatus({
        status: 'success',
        message: 'Session created successfully!',
        txHash: txHash
      });

      // Wait 5 seconds before refreshing the sessions list
      setTimeout(async () => {
        await fetchSessions();
        setTransactionStatus(null); // Clear success message
      }, 5000);

    } catch (error) {
      console.error('Failed to create session:', error);
      setTransactionStatus({
        status: 'error',
        message: 'Failed to create session'
      });
      setLoading(false); // Stop loading on error
    }
  };

  const fetchChipBalance = async () => {
    try {
      if (!aegisAccount.address) return;

      const balance = await aegisAccount.getTokenBalance(process.env.EXPO_PUBLIC_CHIP_CONTRACT_ADDRESS || '', 18);
      setChipBalance(balance);
    } catch (error) {
      console.error('Failed to fetch CHIP balance:', error);
      setChipBalance('0');
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await getPlayerSessions(aegisAccount.address || '', mode === 'competitive');

      // Convert BigInt array to number array
      const sessionIds = data.map((id: bigint) => Number(id));
      setSessions(sessionIds);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      // Fallback to empty array on error
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    if (mode === 'competitive') {
      fetchChipBalance();
    }
  }, []);

  const handleBack = () => {
    router.back();
  };

  const dismissTransactionStatus = () => {
    setTransactionStatus(null);
  };

  const handleBuyChips = async () => {
    try {
      // Format address to be 66 characters (0x + 64 hex chars)
      let formattedAddress = aegisAccount.address;
      if (formattedAddress && formattedAddress.startsWith('0x')) {
        const hexPart = formattedAddress.slice(2);
        const paddedHex = hexPart.padStart(64, '0');
        formattedAddress = '0x' + paddedHex;
      }

      const buyUrl = `http://192.168.1.10:3000/purchase/${formattedAddress}`;
      const canOpen = await Linking.canOpenURL(buyUrl);
      if (canOpen) {
        await Linking.openURL(buyUrl);
      }
    } catch (error) {
      console.error('Failed to open buy chips URL:', error);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/images/bg-welcome.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
        {/* Transaction Status */}
        <TransactionStatusComponent 
          transaction={transactionStatus} 
          onDismiss={dismissTransactionStatus}
        />

        {/* Header with back button, chip balance, and new game */}
        <View style={styles.headerContainer}>
          <View style={styles.leftSection}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={Theme.colors.primary} />
            </Pressable>
            {mode === 'competitive' && (
              <>
                <View style={styles.balanceDisplay}>
                  <Text style={styles.balanceLabel}>CHIPS:</Text>
                  <Text style={styles.balanceValue}>{chipBalance}</Text>
                </View>
                <Pressable style={styles.buyChipsButton} onPress={handleBuyChips}>
                  <Ionicons name="add-circle" size={16} color={Theme.colors.background} />
                  <Text style={styles.buyChipsText}>Buy</Text>
                </Pressable>
              </>
            )}
          </View>
          <Pressable style={styles.newGameButton} onPress={handleNewGame}>
            <Ionicons name="add-circle-outline" size={24} color={Theme.colors.primary} />
          </Pressable>
        </View>

        {/* Cost info for competitive mode */}
        {mode === 'competitive' && (
          <View style={styles.costInfoContainer}>
            <Ionicons name="information-circle-outline" size={16} color={Theme.colors.primary} />
            <Text style={styles.costInfoText}>Session price: 5 CHIPS</Text>
          </View>
        )}

        <ScrollView
          style={styles.sessionsList}
          contentContainerStyle={styles.sessionsContent}
        >
          {/* Existing Sessions */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading sessions...</Text>
            </View>
          ) : sessions.length > 0 ? (
            sessions.map((sessionId) => (
              <Pressable
                key={sessionId}
                style={styles.sessionItem}
                onPress={() => handleSessionSelect(sessionId)}
              >
                <View style={styles.sessionItemContent}>
                  <Ionicons name="save-outline" size={20} color={Theme.colors.primary} />
                  <Text style={styles.sessionText}>
                    &gt; session id: {sessionId}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No sessions found</Text>
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
    paddingTop: Theme.spacing.xl,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xl,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  backButton: {
    padding: Theme.spacing.sm,
  },
  header: {
    fontFamily: Theme.fonts.body,
    color: Theme.colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  newGameButton: {
    padding: Theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sessionsList: {
    flex: 1,
  },
  sessionsContent: {
    gap: Theme.spacing.md,
  },
  sessionItem: {
    paddingVertical: Theme.spacing.md,
  },
  sessionItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  sessionText: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    color: Theme.colors.primary,
  },
  loadingContainer: {
    padding: Theme.spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.white,
    opacity: 0.7,
  },
  emptyContainer: {
    padding: Theme.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.white,
    opacity: 0.7,
  },
  balanceDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceLabel: {
    fontFamily: Theme.fonts.body,
    fontSize: 12,
    color: Theme.colors.white,
    opacity: 0.8,
  },
  balanceValue: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  buyChipsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  buyChipsText: {
    fontFamily: Theme.fonts.body,
    fontSize: 10,
    color: Theme.colors.background,
    fontWeight: 'bold',
  },
  costInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 132, 28, 0.1)',
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: Theme.spacing.md,
  },
  costInfoText: {
    fontFamily: Theme.fonts.body,
    fontSize: 11,
    color: Theme.colors.primary,
  },
});
