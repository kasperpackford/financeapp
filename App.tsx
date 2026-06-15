import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, Text, View } from 'react-native';
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

const TAB_ICONS: Record<string, string> = {
  Dashboard: '◈',
  Subscriptions: '↻',
  Bills: '⊟',
  Spending: '◎',
  Goals: '◉',
  Savings: '⬡',
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 22,
        lineHeight: 26,
        color: focused ? colors.primary : colors.textDim,
      }}
    >
      {TAB_ICONS[label] ?? '·'}
    </Text>
  );
}

// Extracted so it can call useSafeAreaInsets (must be inside SafeAreaProvider)
function AppNavigator() {
  const insets = useSafeAreaInsets();
  // On devices with a home indicator (iPhone X+) the bottom inset is ~34pt.
  // Add 10pt of breathing room above the indicator; fall back to 12pt on flat-bottom devices.
  const tabBarPaddingBottom = insets.bottom > 0 ? insets.bottom + 10 : 12;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 10,
          paddingBottom: tabBarPaddingBottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Dashboard" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Subscriptions"
        component={SubscriptionsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Subscriptions" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Bills"
        component={BillsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Bills" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Spending"
        component={SpendingScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Spending" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Goals" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Savings"
        component={SavingsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Savings" focused={focused} />,
        }}
      />
      {/* Hidden from tab bar — navigated to via gear icon on Dashboard */}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.bg}>
        <View style={styles.frame}>
          <NavigationContainer>
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
});
