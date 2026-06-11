import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../../constants';
import LeafletMap, { type MapEvento } from '../../components/LeafletMap';

const DEFAULT_LAT = 3.5;
const DEFAULT_LON = -73.0;
const DEFAULT_ZOOM = 7;

const ESTADOS_ACTIVOS = ['EN_CURSO', 'CONFIRMADO', 'PENDIENTE'];
const ESTADOS_CERRADOS = ['CERRADO', 'CONTROLADO', 'FALSO_POSITIVO', 'CANCELADO'];

type Capa = 'TODOS' | 'ACTIVOS' | 'CERRADOS' | 'MES';
const CAPAS: { key: Capa; label: string }[] = [
  { key: 'ACTIVOS', label: 'Activos' },
  { key: 'TODOS', label: 'Todos' },
  { key: 'MES', label: 'Este mes' },
  { key: 'CERRADOS', label: 'Cerrados' },
];

export default function MapaRiesgosScreen() {
  const [loading, setLoading] = useState(true);
  const [userLat, setUserLat] = useState(DEFAULT_LAT);
  const [userLon, setUserLon] = useState(DEFAULT_LON);
  const [eventos, setEventos] = useState<any[]>([]);
  const [capa, setCapa] = useState<Capa>('TODOS');
  const [error, setError] = useState<string | null>(null);

  const fetchEventos = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('satam_access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/incidentes/mapa`, { headers });
      if (res.ok) {
        const data = await res.json();
        const list: any[] = Array.isArray(data) ? data : data.data ?? [];
        setEventos(list.filter((e) => e.latitud != null && e.longitud != null));
        return;
      }

      const [inciRes, muniRes] = await Promise.all([
        fetch(`${API_BASE}/incidentes?limit=200`, { headers }),
        fetch(`${API_BASE}/municipios?departamento=50`, { headers }),
      ]);
      if (!inciRes.ok) throw new Error('Sin datos');

      const inciData = await inciRes.json();
      const incis: any[] = Array.isArray(inciData) ? inciData : inciData.data ?? inciData.results ?? [];

      const muniMap: Record<string, { latitud: number; longitud: number; nombre: string }> = {};
      if (muniRes.ok) {
        const muniData = await muniRes.json();
        const munis: any[] = Array.isArray(muniData) ? muniData : muniData.data ?? [];
        for (const m of munis) {
          if (m.id && m.latitud != null && m.longitud != null) {
            muniMap[m.id] = { latitud: Number(m.latitud), longitud: Number(m.longitud), nombre: m.nombre };
          }
        }
      }

      const merged = incis
        .map((i) => {
          const muni = muniMap[i.municipio_id];
          if (!muni) return null;
          return { ...i, latitud: muni.latitud, longitud: muni.longitud, municipio_nombre: muni.nombre };
        })
        .filter(Boolean);

      setEventos(merged);
    } catch {
      setError('No se pudieron cargar los eventos.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([
        (async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Promise.race<Location.LocationObject | null>([
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
                new Promise<null>((res) => setTimeout(() => res(null), 5000)),
              ]);
              if (loc) {
                setUserLat(loc.coords.latitude);
                setUserLon(loc.coords.longitude);
              }
            }
          } catch { /* ignore */ }
        })(),
        fetchEventos(),
      ]);
      setLoading(false);
    })();
  }, []);

  const eventosFiltrados: MapEvento[] = eventos
    .filter((ev) => {
      const estado: string = ev.estado ?? '';
      if (capa === 'ACTIVOS') return ESTADOS_ACTIVOS.includes(estado);
      if (capa === 'CERRADOS') return ESTADOS_CERRADOS.includes(estado);
      if (capa === 'MES') {
        const ts = ev.created_at ?? ev.fecha_inicio;
        if (!ts) return false;
        const f = new Date(ts);
        const now = new Date();
        return f.getFullYear() === now.getFullYear() && f.getMonth() === now.getMonth();
      }
      return true;
    })
    .map((ev) => ({
      id: ev.id ?? String(Math.random()),
      lat: parseFloat(ev.latitud),
      lon: parseFloat(ev.longitud),
      titulo: ev.titulo ?? ev.tipo_amenaza ?? 'Evento',
      estado: ev.estado ?? '',
      nivel: (ev.nivel_alerta ?? 'AMARILLO').toUpperCase(),
      municipio: ev.municipio_nombre ?? '',
    }))
    .filter((e) => !isNaN(e.lat) && !isNaN(e.lon));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.capaBar}>
        {CAPAS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.capaBtn, capa === key && styles.capaBtnActive]}
            onPress={() => setCapa(key)}
          >
            <Text style={[styles.capaBtnText, capa === key && styles.capaBtnTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <LeafletMap
        lat={userLat}
        lon={userLon}
        zoom={DEFAULT_ZOOM}
        eventos={eventosFiltrados}
        style={styles.mapa}
      />

      <View style={styles.contador}>
        <Text style={styles.contadorText}>
          {eventosFiltrados.length} evento{eventosFiltrados.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
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
  },
  loadingText: { color: '#9CA3AF', fontSize: 14, marginTop: 12 },
  capaBar: {
    flexDirection: 'row',
    backgroundColor: '#0A0E1A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  capaBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  capaBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  capaBtnText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  capaBtnTextActive: { color: '#FFFFFF' },
  contador: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    backgroundColor: 'rgba(10,14,26,0.88)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  contadorText: { color: '#F9FAFB', fontSize: 12, fontWeight: '600' },
  errorBanner: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: { color: '#FCA5A5', fontSize: 12, textAlign: 'center' },
});
