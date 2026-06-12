import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const ACTIVE_COLOR = '#60A5FA';
const INACTIVE_COLOR = '#6B7280';
const TABBAR_BG = '#0D1320';
const HEADER_BG = '#0A0E1A';

function tabIcon(focused: boolean, name: IoniconsName) {
  return (
    <Ionicons
      name={name}
      size={24}
      color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
    />
  );
}

export default function TabsLayout() {
  const { session } = useAuth();
  const rol = (session as any)?.user?.rol ?? 'ciudadano';
  const isCiudadano = rol === 'ciudadano';

  const screenOptions = {
    headerShown: true,
    headerStyle: { backgroundColor: HEADER_BG },
    headerTintColor: '#F9FAFB',
    tabBarStyle: {
      backgroundColor: TABBAR_BG,
      borderTopColor: '#1F2937',
      height: 60,
    },
    tabBarActiveTintColor: ACTIVE_COLOR,
    tabBarInactiveTintColor: INACTIVE_COLOR,
    tabBarLabelStyle: { fontSize: 10, marginBottom: 4 },
  };

  if (isCiudadano) {
    return (
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ focused }) => tabIcon(focused, 'home-outline'),
          }}
        />
        <Tabs.Screen
          name="alertas"
          options={{
            title: 'Alertas',
            tabBarIcon: ({ focused }) => tabIcon(focused, 'warning-outline'),
          }}
        />
        <Tabs.Screen
          name="mapa"
          options={{
            title: 'Mapa',
            tabBarIcon: ({ focused }) => tabIcon(focused, 'map-outline'),
          }}
        />
        <Tabs.Screen
          name="reportar"
          options={{
            title: 'Reportar',
            tabBarIcon: ({ focused }) => tabIcon(focused, 'add-circle-outline'),
          }}
        />
        <Tabs.Screen
          name="autoproteccion"
          options={{
            title: 'Autoprotec.',
            tabBarIcon: ({ focused }) => tabIcon(focused, 'shield-checkmark-outline'),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ focused }) => tabIcon(focused, 'person-outline'),
          }}
        />
        <Tabs.Screen name="dashboard" options={{ href: null }} />
        <Tabs.Screen name="nuevo-incidente" options={{ href: null }} />
        <Tabs.Screen name="sync" options={{ href: null }} />
        <Tabs.Screen name="chats" options={{ href: null }} />
        <Tabs.Screen name="menu" options={{ href: null }} />
      </Tabs>
    );
  }

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Panel',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'grid-outline'),
        }}
      />
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'warning-outline'),
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'map-outline'),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'chatbubbles-outline'),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Más',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'menu-outline'),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'person-outline'),
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="autoproteccion" options={{ href: null }} />
      <Tabs.Screen name="reportar" options={{ href: null }} />
      <Tabs.Screen name="nuevo-incidente" options={{ href: null }} />
      <Tabs.Screen name="sync" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
