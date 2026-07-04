import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../constants';

type NivelAlerta = 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO';

interface AlertaHistorial {
  id: number | string;
  nivel?: NivelAlerta;
  nivel_alerta?: string;
  municipio?: string;
  municipio_nombre?: string;
  fecha_inicio?: string;
  created_at?: string;
  estado?: string;
  titulo?: string;
}

const NIVEL_COLORS: Record<NivelAlerta, string> = {
  VERDE: '#22C55E',
  AMARILLO: '#EAB308',
  NARANJA: '#F97316',
  ROJO: '#EF4444',
};

async function apiFetch(path: string) {
  const token = await SecureStore.getItemAsync('satam_access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function AlertaHistorialCard({ item }: { item: AlertaHistorial }) {
  const nivel = (item.nivel ?? item.nivel_alerta ?? 'AMARILLO') as NivelAlerta;
  const color = NIVEL_COLORS[nivel] ?? '#6B7280';
  const municipio = item.municipio_nombre ?? item.municipio ?? '—';
  const fecha = item.fecha_inicio ?? item.created_at;
  const fechaStr = fecha
    ? new Date(fecha).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.nivelBadge, { backgroundColor: color + '33', borderColor: color }]}>
          <Text style={[styles.nivelBadgeText, { color }]}>{nivel}</Text>
        </View>
        {!!item.estado && (
          <Text style={styles.estado}>{item.estado}</Text>
        )}
        <Text style={styles.fecha}>{fechaStr}</Text>
      </View>
      <Text style={styles.titulo}>{item.titulo ?? municipio}</Text>
      {item.titulo && <Text style={styles.municipio}>{municipio}</Text>}
    </View>
  );
}

export default function HistorialScreen() {
  const [data, setData] = useState<AlertaHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch('/alertas?ordering=-created_at&limit=100');
      setData(Array.isArray(res) ? res : res.results ?? res.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar historial.');
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Alertas</Text>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <AlertaHistorialCard item={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4f46e5"
              colors={['#4f46e5']}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Sin alertas en el historial.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2ff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#eef2ff',
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
    gap: 10,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: '#4f46e5', fontWeight: '700' },
  headerTitle: { flex: 1, color: '#0f0a2e', fontSize: 17, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  emptyText: { color: '#6B7280', fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nivelBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  nivelBadgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  estado: { color: '#9CA3AF', fontSize: 12 },
  fecha: { color: '#6B7280', fontSize: 12, marginLeft: 'auto' },
  titulo: { color: '#0f0a2e', fontSize: 14, fontWeight: '600' },
  municipio: { color: '#9CA3AF', fontSize: 12 },
});
