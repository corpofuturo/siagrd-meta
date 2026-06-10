import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import NetInfo from '@react-native-community/netinfo';
import { database } from '../database';
import { getAuthToken } from '../services/auth.service';
import { sincronizar } from '../services/sync.service';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkSession = async () => {
      const token = await getAuthToken();
      const inAuthGroup = segments[0] === 'login';

      if (!token && !inAuthGroup) {
        router.replace('/login');
      } else if (token && inAuthGroup) {
        router.replace('/(tabs)');
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    NetInfo.fetch().then((state) => {
      if (state.isConnected) {
        sincronizar().catch(() => {});
      }
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        sincronizar().catch(() => {});
      }
    });

    return unsubscribe;
  }, []);

  return (
    <DatabaseProvider database={database}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0A0E1A' },
          headerTintColor: '#FFFFFF',
          contentStyle: { backgroundColor: '#0A0E1A' },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="nuevo-incidente"
          options={{ title: 'Nuevo Incidente', presentation: 'modal' }}
        />
        <Stack.Screen
          name="incidente/[id]"
          options={{ title: 'Detalle de Incidente' }}
        />
      </Stack>
    </DatabaseProvider>
  );
}
