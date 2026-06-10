import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

function SyncIcon({ focused, count }: { focused: boolean; count: number }) {
  return (
    <View>
      <Ionicons
        name="sync-outline"
        size={24}
        color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
      />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { session } = useAuth();
  const rol = session?.user?.rol ?? 'ciudadano';
  const isCiudadano = rol === 'ciudadano';
  const [syncCount, setSyncCount] = useState(0);

  useEffect(() => {
    if (isCiudadano) return;

    async function loadCount() {
      try {
        const raw = await AsyncStorage.getItem('satam_incidente_queue');
        const queue = raw ? JSON.parse(raw) : [];
        setSyncCount(Array.isArray(queue) ? queue.length : 0);
      } catch {
        setSyncCount(0);
      }
    }

    loadCount();
    const interval = setInterval(loadCount, 5000);
    return () => clearInterval(interval);
  }, [isCiudadano]);

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
            href: '/reportar',
            tabBarIcon: ({ focused }) => tabIcon(focused, 'warning-outline'),
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
        <Tabs.Screen name="alertas" options={{ href: null }} />
        <Tabs.Screen name="autoproteccion" options={{ href: null }} />
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
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'map-outline'),
        }}
      />
      <Tabs.Screen
        name="nuevo-incidente"
        options={{
          title: 'Incidente',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'add-circle-outline'),
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: 'Sync',
          tabBarIcon: ({ focused }) => (
            <SyncIcon focused={focused} count={syncCount} />
          ),
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
      <Tabs.Screen name="alertas" options={{ href: null }} />
      <Tabs.Screen name="autoproteccion" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
