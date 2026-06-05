import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Head } from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { getAlertasCachedOrFetch, getNivelMaximo } from '../services/alertas.service';
import { registerServiceWorker } from '../lib/pwa';

/**
 * Layout raíz de la app ciudadana.
 * Al montar: obtiene alertas y redirige a /alerta-roja si el nivel es ROJO.
 * Las alertas se verifican sin requerir login.
 */
export default function RootLayout() {
  const router = useRouter();
  const checked = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      registerServiceWorker();
    }
  }, []);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    (async () => {
      try {
        const alertas = await getAlertasCachedOrFetch();
        const nivel = getNivelMaximo(alertas);
        if (nivel === 'ROJO') {
          router.replace('/alerta-roja');
        }
      } catch {
        // Sin red al inicio — continuar con la app normal
      }
    })();
  }, [router]);

  return (
    <>
      {Platform.OS === 'web' && (
        <Head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#0A0E1A" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="SIAGRD" />
        </Head>
      )}
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0F1117' },
          headerTintColor: '#F9FAFB',
          contentStyle: { backgroundColor: '#0F1117' },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="reportar"
          options={{
            headerShown: true,
            title: 'Reportar emergencia',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="alerta-roja"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            gestureEnabled: false,
          }}
        />
      </Stack>
    </>
  );
}
