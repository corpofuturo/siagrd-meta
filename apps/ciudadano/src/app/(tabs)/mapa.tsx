/**
 * MapaRiesgosScreen — Sin login requerido.
 * Muestra municipios del Meta coloreados por nivel de riesgo.
 * Botón flotante ESTOY EN ZONA DE RIESGO navega a /reportar.
 */
import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { getAlertasCachedOrFetch } from '../../services/alertas.service';
import { obtenerUbicacionSinBloquear } from '../../services/location.service';
import { MUNICIPIOS_META, NIVEL_COLORES, type NivelAlerta } from '../../constants';
import type { Database } from '../../lib/supabase';

type Alerta = Database['public']['Tables']['alertas']['Row'];

// Coordenadas aproximadas de los municipios del Meta para visualización
const COORDS_MUNICIPIOS: Record<string, { lat: number; lng: number }> = {
  '50001': { lat: 4.142, lng: -73.626 },   // Villavicencio
  '50006': { lat: 3.988, lng: -73.762 },   // Acacías
  '50110': { lat: 4.573, lng: -72.967 },   // Barranca de Upía
  '50124': { lat: 4.318, lng: -72.784 },   // Cabuyaro
  '50150': { lat: 3.877, lng: -73.685 },   // Castilla la Nueva
  '50223': { lat: 3.797, lng: -74.108 },   // Cubarral
  '50226': { lat: 4.274, lng: -73.490 },   // Cumaral
  '50245': { lat: 4.368, lng: -73.685 },   // El Calvario
  '50251': { lat: 3.552, lng: -74.178 },   // El Castillo
  '50270': { lat: 3.609, lng: -73.920 },   // El Dorado
  '50287': { lat: 3.468, lng: -73.620 },   // Fuente de Oro
  '50313': { lat: 3.536, lng: -73.721 },   // Granada
  '50318': { lat: 3.890, lng: -73.765 },   // Guamal
  '50350': { lat: 2.476, lng: -73.784 },   // La Macarena
  '50400': { lat: 3.523, lng: -74.155 },   // Lejanías
  '50325': { lat: 2.894, lng: -72.148 },   // Mapiripán
  '50330': { lat: 3.377, lng: -74.454 },   // Mesetas
  '50450': { lat: 2.598, lng: -73.344 },   // Puerto Concordia
  '50568': { lat: 4.312, lng: -72.079 },   // Puerto Gaitán
  '50577': { lat: 2.987, lng: -73.134 },   // Puerto Lleras
  '50573': { lat: 4.086, lng: -72.952 },   // Puerto López
  '50590': { lat: 1.900, lng: -72.377 },   // Puerto Rico
  '50606': { lat: 4.253, lng: -73.571 },   // Restrepo
  '50680': { lat: 3.726, lng: -73.265 },   // San Carlos de Guaroa
  '50683': { lat: 3.428, lng: -74.001 },   // San Juan de Arama
  '50686': { lat: 4.467, lng: -73.680 },   // San Juanito
  '50689': { lat: 3.694, lng: -73.702 },   // San Martín
};

const NIVEL_FILL: Record<NivelAlerta, string> = {
  VERDE: 'rgba(5,46,22,0.5)',
  AMARILLO: 'rgba(28,23,0,0.55)',
  NARANJA: 'rgba(28,10,0,0.6)',
  ROJO: 'rgba(28,5,5,0.75)',
};

const NIVEL_STROKE: Record<NivelAlerta, string> = {
  VERDE: '#166534',
  AMARILLO: '#854D0E',
  NARANJA: '#9A3412',
  ROJO: '#991B1B',
};

export default function MapaRiesgosScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAlertasCachedOrFetch()
      .then(setAlertas)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const nivelPorMunicipio = (codigo: string): NivelAlerta => {
    const alerta = alertas.find(
      (a) => a.municipio_codigo === codigo && a.activa
    );
    return (alerta?.nivel as NivelAlerta) ?? 'VERDE';
  };

  const centrarEnMiUbicacion = async () => {
    const coord = await obtenerUbicacionSinBloquear();
    if (!coord) {
      Alert.alert('Sin GPS', 'No se pudo obtener tu ubicación.');
      return;
    }
    mapRef.current?.animateToRegion({
      latitude: coord.latitud,
      longitude: coord.longitud,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    });
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.cargandoBanner}>
          <Text style={styles.cargandoTexto}>Cargando mapa...</Text>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.mapa}
        initialRegion={{
          latitude: 3.5,
          longitude: -73.2,
          latitudeDelta: 4.5,
          longitudeDelta: 4.5,
        }}
        mapType="satellite"
        showsUserLocation
        showsMyLocationButton={false}
      >
        {MUNICIPIOS_META.map((municipio) => {
          const coords = COORDS_MUNICIPIOS[municipio.codigo_dane];
          if (!coords) return null;
          const nivel = nivelPorMunicipio(municipio.codigo_dane);

          return (
            <React.Fragment key={municipio.codigo_dane}>
              <Circle
                center={{ latitude: coords.lat, longitude: coords.lng }}
                radius={15000}
                fillColor={NIVEL_FILL[nivel]}
                strokeColor={NIVEL_STROKE[nivel]}
                strokeWidth={nivel === 'ROJO' ? 3 : 1.5}
              />
              <Marker
                coordinate={{ latitude: coords.lat, longitude: coords.lng }}
                title={municipio.nombre}
                description={`Nivel: ${nivel}`}
                pinColor={nivel === 'ROJO' ? '#EF4444' : nivel === 'NARANJA' ? '#F97316' : nivel === 'AMARILLO' ? '#EAB308' : '#22C55E'}
              />
            </React.Fragment>
          );
        })}
      </MapView>

      {/* Leyenda */}
      <View style={styles.leyenda}>
        {(['VERDE', 'AMARILLO', 'NARANJA', 'ROJO'] as NivelAlerta[]).map(
          (n) => (
            <View key={n} style={styles.leyendaItem}>
              <View
                style={[
                  styles.leyendaDot,
                  { backgroundColor: NIVEL_STROKE[n] },
                ]}
              />
              <Text style={styles.leyendaTexto}>{n}</Text>
            </View>
          )
        )}
      </View>

      {/* Botón flotante centrar */}
      <TouchableOpacity
        style={styles.miUbicacionBtn}
        onPress={centrarEnMiUbicacion}
      >
        <Text style={styles.miUbicacionEmoji}>📍</Text>
      </TouchableOpacity>

      {/* Botón ESTOY EN ZONA DE RIESGO */}
      <TouchableOpacity
        style={styles.zonaRiesgoBtn}
        onPress={() => router.push('/reportar')}
      >
        <Text style={styles.zonaRiesgoBtnTexto}>⚠ ESTOY EN ZONA DE RIESGO</Text>
      </TouchableOpacity>

      {/* Nota sin login */}
      <View style={styles.sinLoginBadge}>
        <Text style={styles.sinLoginTexto}>Sin registro requerido</Text>
      </View>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const React = require('react');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1117' },
  mapa: { flex: 1 },
  cargandoBanner: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  cargandoTexto: { color: '#9CA3AF', fontSize: 13 },
  leyenda: {
    position: 'absolute',
    top: 54,
    right: 12,
    backgroundColor: 'rgba(17,24,39,0.9)',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaDot: { width: 10, height: 10, borderRadius: 5 },
  leyendaTexto: { fontSize: 11, color: '#D1D5DB', fontWeight: '600' },
  miUbicacionBtn: {
    position: 'absolute',
    bottom: 140,
    right: 16,
    backgroundColor: '#1F2937',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  miUbicacionEmoji: { fontSize: 22 },
  zonaRiesgoBtn: {
    position: 'absolute',
    bottom: 76,
    left: 16,
    right: 16,
    backgroundColor: '#B45309',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zonaRiesgoBtnTexto: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sinLoginBadge: {
    position: 'absolute',
    top: 54,
    left: 12,
    backgroundColor: 'rgba(17,24,39,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  sinLoginTexto: { color: '#86EFAC', fontSize: 11, fontWeight: '600' },
});
