import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';

export interface TransactionStatus {
  status: 'pending' | 'success' | 'error';
  message: string;
  txHash?: string;
}

interface TransactionStatusProps {
  transaction: TransactionStatus | null;
  onDismiss: () => void;
}

export function TransactionStatusComponent({ transaction, onDismiss }: TransactionStatusProps) {
  if (!transaction) return null;

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'pending':
        return Theme.colors.primary; // Orange
      case 'success':
        return Theme.colors.primary; // Orange
      case 'error':
        return '#ff0000'; // Red
      default:
        return Theme.colors.primary;
    }
  };

  const getStatusIcon = () => {
    switch (transaction.status) {
      case 'pending':
        return 'time-outline';
      case 'success':
        return 'checkmark-circle-outline';
      case 'error':
        return 'close-circle-outline';
      default:
        return 'information-circle-outline';
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[styles.container, { borderColor: getStatusColor() }]}
    >
      <View style={styles.content}>
        <Ionicons
          name={getStatusIcon()}
          size={20}
          color={getStatusColor()}
        />
        <View style={styles.textContainer}>
          <Text style={[styles.message, { color: getStatusColor() }]}>
            {transaction.message}
          </Text>
          {transaction.txHash && (
            <Text style={[styles.txHash, { color: getStatusColor() }]}>
              tx: {transaction.txHash.slice(0, 8)}...{transaction.txHash.slice(-8)}
            </Text>
          )}
        </View>
        <Ionicons
          name="close"
          size={16}
          color={getStatusColor()}
          onPress={onDismiss}
          style={styles.closeButton}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: Theme.spacing.md,
    left: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    padding: Theme.spacing.md,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.primary,
  },
  txHash: {
    fontFamily: Theme.fonts.body,
    fontSize: 12,
    color: Theme.colors.primary,
    opacity: 0.7,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
});
