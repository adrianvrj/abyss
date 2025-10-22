import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../constants/Theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Navigation error caught by ErrorBoundary:', error);
    console.error('Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops!</Text>
          <Text style={styles.message}>
            Something went wrong. Please restart the app.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.errorDetails}>
              {this.state.error.toString()}
            </Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  title: {
    fontFamily: Theme.fonts.body,
    fontSize: 32,
    color: Theme.colors.primary,
    marginBottom: Theme.spacing.lg,
  },
  message: {
    fontFamily: Theme.fonts.body,
    fontSize: 18,
    color: Theme.colors.white,
    textAlign: 'center',
  },
  errorDetails: {
    fontFamily: Theme.fonts.body,
    fontSize: 12,
    color: Theme.colors.primary,
    marginTop: Theme.spacing.xl,
    textAlign: 'center',
  },
});
