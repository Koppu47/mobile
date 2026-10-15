import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeStorage } from '../lib/safeStorage';

import { LanguageProvider, useLanguage } from '../lib/LanguageContext';
import { AuthProvider } from '../lib/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <RootTabs />
      </LanguageProvider>
    </AuthProvider>
  );
}

function RootTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const { lang } = useLanguage();

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0f172a',
            borderTopColor: '#1e293b',
            height: 60 + bottomInset,
            paddingBottom: Math.max(bottomInset, 10),
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#38bdf8',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
        }}
      >
        {/* 4 Main Visible Tabs */}
        <Tabs.Screen
          name="index"
          options={{
            title: lang === 'th' ? 'หน้าแรก' : 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={21} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="logs"
          options={{
            title: lang === 'th' ? 'บันทึกงาน DIY' : 'DIY Logs',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'clipboard' : 'clipboard-outline'} size={21} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="fluids"
          options={{
            title: lang === 'th' ? 'สเปคของเหลว' : 'Fluid Specs',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'water' : 'water-outline'} size={21} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: lang === 'th' ? 'อื่นๆ' : 'More',
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
          name="explore"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="login"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="language"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}
