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

interface Damnificado {
  id: number | string;
  nombre_completo?: string;
  nombre?: string;
  apellido?: string;
  municipio?: string;
  municipio_nombre?: string;
  tipo_afectacion?: string;
  fecha?: string;
  created_at?: string;
}

async function apiFetch(path: string) {
  const token = await SecureStore.getItemAsync('satam_access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function DamnificadoCard({ item }: { item: Damnificado }) {
  const nombre =
    item.nombre_completo ??
    [item.nombre, item.apellido].filter(Boolean).join(' ') ??
    '—';
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
      <Text style={styles.nombre}>{nombre}</Text>
      <View style={styles.row}>
        <Text style={styles.muted}>{municipio}</Text>
        {!!fechaStr && <Text style={styles.fecha}>{fechaStr}</Text>}
      </View>
      {!!item.tipo_afectacion && (
        <View style={styles.tipoBadge}>
          <Text style={styles.tipoBadgeText}>{item.tipo_afectacion}</Text>
        </View>
      )}
    </View>
  );
}

export default function DamnificadosScreen() {
  const [data, setData] = useState<Damnificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch('/damnificados');
      setData(Array.isArray(res) ? res : res.results ?? res.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar damnificados.');
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
        <Text style={styles.headerTitle}>Damnificados</Text>
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
          renderItem={({ item }) => <DamnificadoCard item={item} />}
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
              <Text style={styles.emptyText}>Sin damnificados registrados.</Text>
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
    gap: 6,
  },
  nombre: { color: '#F9FAFB', fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { color: '#9CA3AF', fontSize: 13 },
  fecha: { color: '#6B7280', fontSize: 12 },
  tipoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#3B82F633',
    borderColor: '#3B82F6',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tipoBadgeText: { color: '#3B82F6', fontSize: 11, fontWeight: '600' },
});
