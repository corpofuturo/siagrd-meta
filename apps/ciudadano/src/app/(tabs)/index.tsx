/**
 * HomeScreen — CRITICA
 * REGLA DE ORO: Ver alerta activa = 0 toques (visible al abrir).
 *
 * - ROJO:    Pantalla completa fondo #1C0505, texto grande, 2 botones de acción.
 * - NARANJA/AMARILLO: Banner superior coloreado con instrucciones.
 * - VERDE:   Card estado normal + accesos rápidos.
 * - Siempre: Botón REPORTAR EMERGENCIA en la parte inferior.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAlertasCachedOrFetch,
  getNivelMaximo,
} from '../../services/alertas.service';
import type { Database } from '../../lib/supabase';
import { NIVEL_COLORES, MUNICIPIOS_META, type NivelAlerta } from '../../constants';

type Alerta = Database['public']['Tables']['alertas']['Row'];

const MUNICIPIO_KEY = '@siagrd:municipio';

export default function HomeScreen() {
  const router = useRouter();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [nivel, setNivel] = useState<NivelAlerta>('VERDE');
  const [municipio, setMunicipio] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      const codigoMunicipio =
        (await AsyncStorage.getItem(MUNICIPIO_KEY)) ?? '50001';
      const mun = MUNICIPIOS_META.find((m) => m.codigo_dane === codigoMunicipio);
      setMunicipio(mun?.nombre ?? 'Villavicencio');

      const data = await getAlertasCachedOrFetch();
      setAlertas(data);
      setNivel(getNivelMaximo(data));
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  const colores = NIVEL_COLORES[nivel];
  const alertaActiva = alertas.find((a) => a.activa);

  // ──────────────────────────────────────────────
  // ROJO: pantalla completa de emergencia
  // ──────────────────────────────────────────────
  if (nivel === 'ROJO') {
    return (
      <View style={styles.rojoContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1C0505" />
        <ScrollView
          contentContainerStyle={styles.rojoScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FCA5A5"
            />
          }
        >
          <Text style={styles.rojoEmoji}>🚨</Text>
          <Text style={styles.rojoNivel}>ALERTA ROJA</Text>
          <Text style={styles.rojoMunicipio}>{municipio}</Text>

          {alertaActiva && (
            <>
              <Text style={styles.rojoTitulo}>{alertaActiva.titulo}</Text>
              <Text style={styles.rojoDescripcion}>
                {alertaActiva.descripcion}
              </Text>
              {alertaActiva.instrucciones ? (
                <View style={styles.instruccionesBox}>
                  <Text style={styles.instruccionesLabel}>INSTRUCCIONES</Text>
                  <Text style={styles.instruccionesTexto}>
                    {alertaActiva.instrucciones}
                  </Text>
                </View>
              ) : null}
            </>
          )}

          <View style={styles.rojoBotones}>
            <TouchableOpacity
              style={styles.botonVerMapa}
              onPress={() => router.push('/(tabs)/mapa')}
            >
              <Text style={styles.botonVerMapaTexto}>VER MAPA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonLlamar}
              onPress={() => Linking.openURL('tel:123')}
            >
              <Text style={styles.botonLlamarTexto}>📞 LLAMAR 123</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Botón reportar — siempre visible */}
        <TouchableOpacity
          style={styles.reportarBtn}
          onPress={() => router.push('/reportar')}
        >
          <Text style={styles.reportarBtnTexto}>⚠ REPORTAR EMERGENCIA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ──────────────────────────────────────────────
  // NARANJA / AMARILLO: banner superior + contenido
  // ──────────────────────────────────────────────
  const tieneAlerta = nivel === 'NARANJA' || nivel === 'AMARILLO';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F1117" />

      {/* Banner de alerta naranja/amarilla */}
      {tieneAlerta && (
        <View style={[styles.banner, { backgroundColor: colores.bgLight }]}>
          <Text style={[styles.bannerNivel, { color: colores.text }]}>
            {nivel === 'NARANJA' ? '🟠 Alerta Naranja' : '🟡 Alerta Amarilla'}
          </Text>
          {alertaActiva && (
            <Text style={[styles.bannerDescripcion, { color: colores.text }]}>
              {alertaActiva.titulo}
            </Text>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {offline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineTexto}>
              Sin conexión — datos guardados
            </Text>
          </View>
        )}

        {/* Card estado municipio */}
        {!tieneAlerta && (
          <View style={[styles.card, styles.cardVerde]}>
            <Text style={styles.cardEmoji}>✅</Text>
            <Text style={styles.cardTitulo}>{municipio}</Text>
            <Text style={styles.cardSubtitulo}>Sin alertas activas</Text>
          </View>
        )}

        {/* Accesos rápidos */}
        <Text style={styles.seccionTitulo}>Accesos rápidos</Text>
        <View style={styles.accesosGrid}>
          <TouchableOpacity
            style={styles.accesoBtn}
            onPress={() => router.push('/(tabs)/mapa')}
          >
            <Text style={styles.accesoEmoji}>🗺</Text>
            <Text style={styles.accesoLabel}>Mapa de{'\n'}Riesgos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.accesoBtn}
            onPress={() => router.push('/(tabs)/alertas')}
          >
            <Text style={styles.accesoEmoji}>🔔</Text>
            <Text style={styles.accesoLabel}>Historial{'\n'}Alertas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.accesoBtn}
            onPress={() => router.push('/(tabs)/autoproteccion')}
          >
            <Text style={styles.accesoEmoji}>🛡</Text>
            <Text style={styles.accesoLabel}>Guías de{'\n'}Protección</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.accesoBtn}
            onPress={() => Linking.openURL('tel:123')}
          >
            <Text style={styles.accesoEmoji}>📞</Text>
            <Text style={styles.accesoLabel}>Emergencias{'\n'}123</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Botón REPORTAR EMERGENCIA — siempre en parte inferior */}
      <TouchableOpacity
        style={styles.reportarBtn}
        onPress={() => router.push('/reportar')}
      >
        <Text style={styles.reportarBtnTexto}>⚠ REPORTAR EMERGENCIA</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── ROJO ──
  rojoContainer: {
    flex: 1,
    backgroundColor: '#1C0505',
  },
  rojoScroll: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  rojoEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  rojoNivel: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FCA5A5',
    letterSpacing: 2,
    textAlign: 'center',
  },
  rojoMunicipio: {
    fontSize: 20,
    color: '#FCA5A5',
    opacity: 0.8,
    marginBottom: 24,
  },
  rojoTitulo: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FEF2F2',
    textAlign: 'center',
    marginBottom: 12,
  },
  rojoDescripcion: {
    fontSize: 16,
    color: '#FEE2E2',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  instruccionesBox: {
    backgroundColor: '#7F1D1D',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  instruccionesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FCA5A5',
    letterSpacing: 1,
    marginBottom: 8,
  },
  instruccionesTexto: {
    fontSize: 15,
    color: '#FEE2E2',
    lineHeight: 22,
  },
  rojoBotones: {
    width: '100%',
    gap: 12,
  },
  botonVerMapa: {
    backgroundColor: '#991B1B',
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonVerMapaTexto: {
    color: '#FEF2F2',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  botonLlamar: {
    backgroundColor: '#EF4444',
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonLlamarTexto: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // ── NORMAL ──
  container: {
    flex: 1,
    backgroundColor: '#0F1117',
  },
  banner: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: 54,
  },
  bannerNivel: {
    fontSize: 18,
    fontWeight: '700',
  },
  bannerDescripcion: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  offlineBanner: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  offlineTexto: {
    color: '#D1D5DB',
    fontSize: 13,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    alignItems: 'center',
  },
  cardVerde: {
    backgroundColor: '#052E16',
    borderWidth: 1,
    borderColor: '#166534',
  },
  cardEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  cardTitulo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#86EFAC',
  },
  cardSubtitulo: {
    fontSize: 14,
    color: '#4ADE80',
    marginTop: 4,
  },
  seccionTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 28,
    marginBottom: 12,
  },
  accesosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  accesoBtn: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  accesoEmoji: {
    fontSize: 32,
  },
  accesoLabel: {
    fontSize: 13,
    color: '#D1D5DB',
    textAlign: 'center',
    fontWeight: '600',
  },
  bottomSpacer: { height: 20 },

  // ── BOTON REPORTAR (siempre visible) ──
  reportarBtn: {
    backgroundColor: '#B45309',
    margin: 16,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportarBtnTexto: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
