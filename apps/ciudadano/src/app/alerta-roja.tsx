/**
 * AlertaRojaScreen — Pantalla full-screen de emergencia crítica.
 * Fondo rojo pulsante, título enorme, instrucciones grandes, 2 botones 56dp.
 * Se activa cuando el nivel de alerta del municipio es ROJO.
 */
import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Linking,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function AlertaRojaScreen() {
  const router = useRouter();
  const pulso = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, {
          toValue: 1.015,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulso, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulso]);

  return (
    <Animated.View
      style={[styles.container, { transform: [{ scale: pulso }] }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1C0505" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Ícono de emergencia */}
        <Text style={styles.emoji}>🚨</Text>

        {/* Título enorme */}
        <Text style={styles.titulo}>ALERTA ROJA</Text>
        <Text style={styles.subtitulo}>EMERGENCIA ACTIVA</Text>

        {/* Instrucciones grandes */}
        <View style={styles.instruccionesBox}>
          <Text style={styles.instruccionesHeader}>QUÉ DEBES HACER AHORA</Text>

          {[
            '1. Mantén la calma y pon atención a las instrucciones oficiales.',
            '2. Si las autoridades indican evacuar, hazlo de inmediato.',
            '3. Sigue las rutas de evacuación señalizadas.',
            '4. No regreses al área afectada hasta que se autorice.',
            '5. Comunica tu estado a familiares.',
            '6. Si necesitas ayuda, llama al 123.',
          ].map((instruccion, idx) => (
            <Text key={idx} style={styles.instruccionTexto}>
              {instruccion}
            </Text>
          ))}
        </View>

        {/* Espaciado para botones */}
        <View style={styles.espaciador} />
      </ScrollView>

      {/* Botones fijos en la parte inferior */}
      <View style={styles.botonesContainer}>
        {/* Botón 1: Ver mapa — 56dp */}
        <TouchableOpacity
          style={[styles.boton, styles.botonMapa]}
          onPress={() => {
            router.replace('/(tabs)/mapa');
          }}
        >
          <Text style={styles.botonTexto}>🗺 VER MAPA DE EVACUACIÓN</Text>
        </TouchableOpacity>

        {/* Botón 2: Llamar 123 — 56dp */}
        <TouchableOpacity
          style={[styles.boton, styles.botonLlamar]}
          onPress={() => Linking.openURL('tel:123')}
        >
          <Text style={styles.botonTexto}>📞 LLAMAR EMERGENCIAS 123</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C0505',
  },
  scroll: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  titulo: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FCA5A5',
    letterSpacing: 4,
    textAlign: 'center',
    lineHeight: 58,
  },
  subtitulo: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FCA5A5',
    letterSpacing: 2,
    opacity: 0.85,
    marginTop: 8,
    marginBottom: 32,
  },
  instruccionesBox: {
    backgroundColor: '#7F1D1D',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    gap: 12,
  },
  instruccionesHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FCA5A5',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  instruccionTexto: {
    fontSize: 17,
    color: '#FEE2E2',
    lineHeight: 26,
    fontWeight: '500',
  },
  espaciador: { height: 20 },

  botonesContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#1C0505',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#7F1D1D',
  },
  boton: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonMapa: {
    backgroundColor: '#991B1B',
  },
  botonLlamar: {
    backgroundColor: '#EF4444',
  },
  botonTexto: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
