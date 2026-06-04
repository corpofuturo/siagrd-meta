/**
 * ReportarScreen — 3 TOQUES EXACTOS
 *
 * Toque 1: Navegación desde HomeScreen (botón REPORTAR EMERGENCIA).
 * Toque 2: Grid 2x3 — usuario toca el tipo de amenaza.
 * Toque 3: GPS se activa automáticamente + botón ENVIAR (56dp).
 *          Descripción y foto son opcionales y aparecen DESPUÉS del envío.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AmenazaIcon } from '@siagrd/ui';
import { TIPOS_AMENAZA } from '../constants';
import { obtenerUbicacionSinBloquear } from '../services/location.service';
import { enviarReporte } from '../services/reporte.service';
import type { Coordenada } from '../services/location.service';

type Paso = 'tipo' | 'confirmar' | 'enviado';

export default function ReportarScreen() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>('tipo');
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');
  const [coordenada, setCoordenada] = useState<Coordenada | null>(null);
  const [obteniendo, setObteniendo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Toque 2: usuario selecciona tipo → GPS arranca en paralelo
  const seleccionarTipo = useCallback(async (tipo: string) => {
    setTipoSeleccionado(tipo);
    setPaso('confirmar');
    setObteniendo(true);
    const coord = await obtenerUbicacionSinBloquear();
    setCoordenada(coord);
    setObteniendo(false);
  }, []);

  // Toque 3: ENVIAR
  const enviar = async () => {
    if (enviando) return;
    setEnviando(true);
    try {
      await enviarReporte(tipoSeleccionado, coordenada ?? { latitud: 0, longitud: 0 });
      setPaso('enviado');
    } catch {
      Alert.alert('Error', 'No se pudo enviar el reporte. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  // ── PASO: tipo ──
  if (paso === 'tipo') {
    return (
      <View style={styles.container}>
        <Text style={styles.titulo}>¿Qué tipo de amenaza?</Text>
        <Text style={styles.subtitulo}>Toca para seleccionar</Text>
        <View style={styles.grid}>
          {TIPOS_AMENAZA.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.tipoCard}
              onPress={() => seleccionarTipo(t.id)}
              activeOpacity={0.7}
            >
              <AmenazaIcon tipo={t.icon as Parameters<typeof AmenazaIcon>[0]['tipo']} size={40} />
              <Text style={styles.tipoLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // ── PASO: confirmar (toque 3) ──
  if (paso === 'confirmar') {
    const tipoInfo = TIPOS_AMENAZA.find((t) => t.id === tipoSeleccionado);

    return (
      <View style={styles.container}>
        <Text style={styles.titulo}>Confirmar reporte</Text>

        <View style={styles.resumenCard}>
          <AmenazaIcon
            tipo={tipoInfo?.icon as Parameters<typeof AmenazaIcon>[0]['tipo']}
            size={56}
          />
          <Text style={styles.resumenTipo}>{tipoInfo?.label}</Text>

          {obteniendo ? (
            <View style={styles.gpsRow}>
              <ActivityIndicator color="#60A5FA" size="small" />
              <Text style={styles.gpsTexto}>Obteniendo ubicación...</Text>
            </View>
          ) : coordenada ? (
            <View style={styles.gpsRow}>
              <Text style={styles.gpsEmoji}>📍</Text>
              <Text style={styles.gpsTexto}>
                {coordenada.latitud.toFixed(5)},{' '}
                {coordenada.longitud.toFixed(5)}
              </Text>
            </View>
          ) : (
            <View style={styles.gpsRow}>
              <Text style={styles.gpsEmoji}>📍</Text>
              <Text style={styles.gpsSinTexto}>Sin ubicación GPS</Text>
            </View>
          )}
        </View>

        <Text style={styles.anonimoNota}>
          Este reporte se enviará de forma anónima si no tienes sesión activa.
        </Text>

        {/* Toque 3 — botón principal 56dp */}
        <TouchableOpacity
          style={[styles.enviarBtn, enviando && styles.enviarBtnDisabled]}
          onPress={enviar}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.enviarBtnTexto}>ENVIAR REPORTE</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelarBtn}
          onPress={() => setPaso('tipo')}
        >
          <Text style={styles.cancelarBtnTexto}>Cambiar tipo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── PASO: enviado ──
  return (
    <View style={styles.container}>
      <Text style={styles.enviadoEmoji}>✅</Text>
      <Text style={styles.enviadoTitulo}>Reporte enviado</Text>
      <Text style={styles.enviadoSubtitulo}>
        Gracias por avisar. Las autoridades han sido notificadas.
      </Text>

      <TouchableOpacity style={styles.volverBtn} onPress={() => router.back()}>
        <Text style={styles.volverBtnTexto}>Volver al inicio</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1117',
    padding: 20,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F9FAFB',
    marginTop: 12,
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tipoCard: {
    width: '47%',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  tipoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F3F4F6',
  },

  // confirmar
  resumenCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  resumenTipo: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsEmoji: { fontSize: 16 },
  gpsTexto: {
    fontSize: 13,
    color: '#60A5FA',
    fontFamily: 'monospace',
  },
  gpsSinTexto: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  anonimoNota: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  enviarBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  enviarBtnDisabled: {
    opacity: 0.6,
  },
  enviarBtnTexto: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cancelarBtn: {
    alignItems: 'center',
    padding: 12,
  },
  cancelarBtnTexto: {
    color: '#9CA3AF',
    fontSize: 15,
  },

  // enviado
  enviadoEmoji: {
    fontSize: 72,
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  enviadoTitulo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#86EFAC',
    textAlign: 'center',
    marginBottom: 12,
  },
  enviadoSubtitulo: {
    fontSize: 16,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  volverBtn: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  volverBtnTexto: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
});
