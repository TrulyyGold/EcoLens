import React from 'react';
import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppDataProvider } from './src/context/AppDataContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/theme';

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.forest,
    background: colors.paper,
    card: colors.white,
    text: colors.ink,
    border: colors.line,
    notification: colors.coral,
  },
};

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AppDataProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="dark" backgroundColor={colors.paper} />
          <AppNavigator />
        </NavigationContainer>
      </AppDataProvider>
    </SafeAreaProvider>
  );
}
