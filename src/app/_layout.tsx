import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0f172a',
            borderTopColor: '#1e293b',
            height: 52 + bottomInset,
            paddingBottom: bottomInset,
            paddingTop: 6,
          },
          tabBarActiveTintColor: '#38bdf8',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarLabelStyle: {
            fontSize: 10.5,
            fontWeight: '600',
          },
        }}
      >
        {/* 3 Main Visible Tabs */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'หน้าแรก',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={21} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="fluids"
          options={{
            title: 'สเปคของเหลว',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'water' : 'water-outline'} size={21} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'อื่นๆ',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={21} color={color} />
            ),
          }}
        />

        {/* Hidden from tab bar, but accessible via routing */}
        <Tabs.Screen
          name="cars"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="guides"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="logs"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}

