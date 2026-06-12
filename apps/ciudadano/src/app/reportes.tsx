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

type EstadoReporte = 'PENDIENTE' | 'REVISADO' | 'DESCARTADO';

interface ReporteCiudadano {
  id: number | string;
  descripcion?: string;
  municipio?: string;
  municipio_nombre?: string;
  estado?: EstadoReporte;
  fecha?: string;
  created_at?: string;
}

const ESTADO_COLORS: Record<EstadoReporte, string> = {
  PENDIENTE: '#F59E0B',
  REVISADO: '#22C55E',
  DESCARTADO: '#6B7280',
};

async function apiFetch(path: string, options?: RequestInit) {
  const token = await SecureStore.getItemAsync('satam_access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token ?? ''}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function ReporteCard({
  item,
  onMarcarRevisado,
}: {
  item: ReporteCiudadano;
  onMarcarRevisado: (id: number | string) => void;
}) {
  const estado = (item.estado ?? 'PENDIENTE') as EstadoReporte;
  const estadoColor = ESTADO_COLORS[estado] ?? '#6B7280';
  const municipio = item.municipio_nombre ?? item.municipio ?? '—';
  const fecha = item.fecha ?? item.created_at;
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
        <View
          style={[
            styles.estadoBadge,
            { backgroundColor: estadoColor + '33', borderColor: estadoColor },
          ]}
        >
          <Text style={[styles.estadoBadgeText, { color: estadoColor }]}>
            {estado}
          </Text>
        </View>
        <Text style={styles.fecha}>{fechaStr}</Text>
      </View>
      {!!item.descripcion && (
        <Text style={styles.descripcion} numberOfLines={3}>
          {item.descripcion}
        </Text>
      )}
      <Text style={styles.municipio}>{municipio}</Text>
      {estado === 'PENDIENTE' && (
        <TouchableOpacity
          style={styles.revisarBtn}
          onPress={() => onMarcarRevisado(item.id)}
          activeOpacity={0.75}
        >
          <Text style={styles.revisarBtnText}>Marcar como revisado</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ReportesScreen() {
  const [data, setData] = useState<ReporteCiudadano[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch('/reportes-ciudadanos?estado=PENDIENTE&limit=100');
      setData(Array.isArray(res) ? res : res.results ?? res.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar reportes.');
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

  const marcarRevisado = useCallback(async (id: number | string) => {
    try {
      await apiFetch(`/reportes-ciudadanos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: 'REVISADO' }),
      });
      setData((prev) =>
        prev.map((r) => (r.id === id ? { ...r, estado: 'REVISADO' } : r))
      );
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reportes Ciudadanos</Text>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ReporteCard item={item} onMarcarRevisado={marcarRevisado} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Sin reportes pendientes.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0A0E1A',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    gap: 10,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: '#3B82F6', fontWeight: '700' },
  headerTitle: { flex: 1, color: '#F9FAFB', fontSize: 17, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  emptyText: { color: '#6B7280', fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  estadoBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  estadoBadgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  fecha: { color: '#6B7280', fontSize: 12, marginLeft: 'auto' },
  descripcion: { color: '#D1D5DB', fontSize: 13, lineHeight: 18 },
  municipio: { color: '#9CA3AF', fontSize: 12 },
  revisarBtn: {
    backgroundColor: '#22C55E33',
    borderColor: '#22C55E',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  revisarBtnText: { color: '#22C55E', fontSize: 13, fontWeight: '600' },
});
