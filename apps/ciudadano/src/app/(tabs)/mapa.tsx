/**
 * MapaRiesgosScreen — Sin login requerido.
 * Muestra alertas activas del Meta como marcadores según nivel de riesgo.
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'satam_alertas_cache';

const PIN_COLOR: Record<string, string> = {
  ROJO: '#EF4444',
  NARANJA: '#F97316',
  AMARILLO: '#EAB308',
  VERDE: '#22C55E',
};

const DEFAULT_REGION = {
  latitude: 3.5,
  longitude: -73.0,
  latitudeDelta: 4,
  longitudeDelta: 4,
};

export default function MapaRiesgosScreen() {
  const mapRef = useRef<MapView>(null);
  const [loading, setLoading] = useState(true);
  const [permisoDenegado, setPermisoDenegado] = useState(false);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [alertas, setAlertas] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      // Solicitar permiso de ubicación
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermisoDenegado(true);
      } else {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 1.5,
            longitudeDelta: 1.5,
          });
        } catch {
          // Usar región por defecto si falla obtener ubicación
        }
      }

      // Leer alertas del cache
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          const lista = Array.isArray(data) ? data : data?.alertas ?? [];
          const conCoords = lista.filter(
            (a: any) =>
              a.latitud != null &&
              a.longitud != null &&
              !isNaN(parseFloat(a.latitud)) &&
              !isNaN(parseFloat(a.longitud))
          );
          setAlertas(conCoords);
        }
      } catch {
        // Cache corrupto — ignorar
      }

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  if (permisoDenegado) {
    return (
      <View style={styles.centered}>
        <Text style={styles.denegadoTitle}>Permiso de ubicación denegado</Text>
        <Text style={styles.denegadoMsg}>
          Para ver tu posición en el mapa, ve a Configuración del dispositivo
          › Aplicaciones › SIAGRD › Permisos › Ubicación y actívalo.
        </Text>
        {Platform.OS === 'ios' && (
          <Text style={styles.denegadoMsg}>
            En iOS: Ajustes › Privacidad y seguridad › Localización › SIAGRD.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.mapa}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
      >
        {alertas.map((alerta, idx) => {
          const nivel = (alerta.nivel ?? 'VERDE').toUpperCase();
          return (
            <Marker
              key={alerta.id ?? idx}
              coordinate={{
                latitude: parseFloat(alerta.latitud),
                longitude: parseFloat(alerta.longitud),
              }}
              title={alerta.titulo ?? alerta.municipio_nombre ?? 'Alerta'}
              description={`Nivel: ${nivel}`}
              pinColor={PIN_COLOR[nivel] ?? PIN_COLOR.VERDE}
            />
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapa: { flex: 1 },
  centered: {
    flex: 1,
    backgroundColor: '#0F1117',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 12,
  },
  denegadoTitle: {
    color: '#F87171',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  denegadoMsg: {
    color: '#D1D5DB',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
