import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, BackHandler, NativeScrollEvent, NativeSyntheticEvent, AppState, AppStateStatus, ImageBackground } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../constants/Theme';
import { CURRENT_TOS } from '../constants/TermsOfServiceContent';
import { storeToSAcceptance } from '../utils/tosStorage';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const appState = useRef(AppState.currentState);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    setScrolledToBottom(isCloseToBottom);
  };

  const handleAccept = async () => {
    try {
      setLoading(true);
      await storeToSAcceptance(CURRENT_TOS.version);
      router.replace('/title');
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Error',
        'Failed to save your acceptance. Please try again.',
        [{ text: 'OK' }]
      );
      console.error('Failed to accept ToS:', error);
    }
  };

  const handleDecline = () => {
    setShowDeclineModal(true);
  };

  const handleCloseApp = () => {
    BackHandler.exitApp();
  };

  const handleReviewAgain = () => {
    setShowDeclineModal(false);
  };

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        // State is automatically preserved by React
        console.log('App returned to foreground on ToS screen');
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <ImageBackground
      source={require('../assets/images/bg-welcome.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{CURRENT_TOS.title}</Text>
        <Text style={styles.version}>Version {CURRENT_TOS.version}</Text>
        <Text style={styles.lastUpdated}>Last Updated: {CURRENT_TOS.lastUpdated}</Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {CURRENT_TOS.sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        {/* Buttons at end of content */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={handleDecline}
            disabled={loading}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, loading && styles.acceptButtonDisabled]}
            onPress={handleAccept}
            disabled={loading}
          >
            <Text style={styles.acceptButtonText}>
              {loading ? 'Accepting...' : 'Accept'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Decline Modal */}
      <Modal
        visible={showDeclineModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeclineModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Terms of Service Required</Text>
            <Text style={styles.modalMessage}>
              You must accept the Terms of Service to use this app.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleReviewAgain}
              >
                <Text style={styles.modalButtonText}>Review Terms</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleCloseApp}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                  Close App
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontFamily: Theme.fonts.title,
    fontSize: 28,
    color: Theme.colors.white,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  version: {
    fontFamily: Theme.fonts.body,
    fontSize: 14,
    color: Theme.colors.primary,
    textAlign: 'center',
  },
  lastUpdated: {
    fontFamily: Theme.fonts.body,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: Theme.spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },
  section: {
    marginBottom: Theme.spacing.lg,
  },
  sectionHeading: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.white,
    marginBottom: Theme.spacing.sm,
  },
  sectionContent: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.xl,
  },
  declineButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Theme.colors.white,
    backgroundColor: 'transparent',
  },
  declineButtonText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderRadius: 8,
    backgroundColor: Theme.colors.primary,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
    fontFamily: Theme.fonts.title,
    fontSize: 24,
    color: Theme.colors.white,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  modalMessage: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Theme.spacing.lg,
  },
  modalButtons: {
    gap: Theme.spacing.sm,
  },
  modalButton: {
    paddingVertical: Theme.spacing.md,
    borderRadius: 8,
    backgroundColor: Theme.colors.primary,
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Theme.colors.white,
  },
  modalButtonText: {
    fontFamily: Theme.fonts.body,
    fontSize: 16,
    color: Theme.colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalButtonTextSecondary: {
    color: Theme.colors.white,
  },
});
