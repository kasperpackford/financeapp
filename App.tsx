import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from './src/theme';
import DashboardScreen from './src/screens/DashboardScreen';
import SubscriptionsScreen from './src/screens/SubscriptionsScreen';
import BillsScreen from './src/screens/BillsScreen';
import SpendingScreen from './src/screens/SpendingScreen';
import GoalsScreen from './src/screens/GoalsScreen';
import SavingsScreen from './src/screens/SavingsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
    primary: colors.primary,
  },
};

const TAB_ICONS: Record<string, string> = {
  Dashboard: '◈',
  Subscriptions: '↻',
  Bills: '⊟',
  Spending: '◎',
  Goals: '◉',
  Savings: '⬡',
};

const HIDDEN_TABS = new Set(['Settings']);

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((r) => !HIDDEN_TABS.has(r.name));

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
      {visibleRoutes.map((route) => {
        const isFocused = state.routes[state.index]?.key === route.key;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.65}
          >
            <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
              <Text style={[styles.tabIcon, isFocused && styles.tabIconActive]}>
                {TAB_ICONS[route.name] ?? '·'}
              </Text>
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AppNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <Tab.Screen name="Bills" component={BillsScreen} />
      <Tab.Screen name="Spending" component={SpendingScreen} />
      <Tab.Screen name="Goals" component={GoalsScreen} />
      <Tab.Screen name="Savings" component={SavingsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.bg}>
        <View style={styles.frame}>
          <NavigationContainer theme={NAV_THEME}>
            <StatusBar style="light" />
            <AppNavigator />
          </NavigationContainer>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: { maxWidth: 480, overflow: 'hidden' },
      default: {},
    }),
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapActive: {
    backgroundColor: colors.primaryDim,
  },
  tabIcon: {
    fontSize: 20,
    lineHeight: 22,
    color: colors.textDim,
  },
  tabIconActive: {
    color: colors.primary,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textDim,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
