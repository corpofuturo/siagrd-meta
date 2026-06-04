import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import NetInfo from '@react-native-community/netinfo';
import { database } from '../database';
import { supabase } from '../services/auth.service';
import { sincronizar } from '../services/sync.service';

/**
 * Layout raíz de la aplicación.
 * - Envuelve toda la navegación con DatabaseProvider (WatermelonDB).
 * - Verifica sesión al montar; redirige a /login si no hay sesión activa.
 * - Escucha cambios de conectividad y dispara sincronización al reconectar.
 * - Sincroniza al iniciar si hay conexión disponible.
 */
export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Verificar sesión y redirigir si es necesario
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const inAuthGroup = segments[0] === 'login';

      if (!data.session && !inAuthGroup) {
        router.replace('/login');
      } else if (data.session && inAuthGroup) {
        router.replace('/(tabs)');
      }
    };

    checkSession();

    // Escuchar cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      } else if (event === 'SIGNED_IN' && session) {
        router.replace('/(tabs)');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Sincronizar al iniciar si hay conexión
    NetInfo.fetch().then((state) => {
      if (state.isConnected) {
        sincronizar().catch(console.error);
      }
    });

    // Sincronizar automáticamente al reconectar
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        sincronizar().catch(console.error);
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
