import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FavoritesScreen } from '../screens/FavoritesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { AnalyzeScreen } from '../screens/AnalyzeScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { colors, radii, spacing, type } from '../theme/theme';
import type { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function TabGlyph({ route, focused }: { route: keyof MainTabParamList; focused: boolean }): React.JSX.Element {
  const color = focused ? colors.forest : colors.inkMuted;
  if (route === 'Home') {
    return (
      <View accessibilityElementsHidden style={[styles.homeGlyph, { borderColor: color }]}>
        <View style={[styles.homeRoof, { borderColor: color }]} />
      </View>
    );
  }
  if (route === 'Journal') {
    return (
      <View accessibilityElementsHidden style={[styles.journalGlyph, { borderColor: color }]}>
        <View style={[styles.journalLine, { backgroundColor: color }]} />
        <View style={[styles.journalLine, { backgroundColor: color }]} />
      </View>
    );
  }
  return <Text accessibilityElementsHidden style={[styles.favoriteGlyph, { color }]}>♥</Text>;
}

function MainTabs(): React.JSX.Element {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarIcon: ({ focused }) => <TabGlyph route={route.name} focused={focused} />,
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ tabBarAccessibilityLabel: 'Home tab' }} />
      <Tabs.Screen name="Journal" component={JournalScreen} options={{ tabBarAccessibilityLabel: 'Journal tab' }} />
      <Tabs.Screen name="Favorites" component={FavoritesScreen} options={{ tabBarAccessibilityLabel: 'Favorites tab' }} />
    </Tabs.Navigator>
  );
}

export function AppNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="Scanner" component={ScannerScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Analyze" component={AnalyzeScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="Result" component={ResultScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderTopColor: colors.line,
  },
  tabItem: { minHeight: 48 },
  tabLabel: { ...type.small, fontSize: 11, lineHeight: 14, fontWeight: '700' },
  homeGlyph: {
    width: 20,
    height: 16,
    borderWidth: 2,
    borderTopWidth: 0,
    borderRadius: radii.sm,
    marginTop: 5,
  },
  homeRoof: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    transform: [{ rotate: '45deg' }],
    top: -7,
    left: 1,
    borderTopLeftRadius: 3,
  },
  journalGlyph: {
    width: 20,
    height: 22,
    borderWidth: 2,
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingTop: 5,
    gap: 4,
  },
  journalLine: { height: 2, borderRadius: radii.pill },
  favoriteGlyph: { fontSize: 23, lineHeight: 25 },
});
