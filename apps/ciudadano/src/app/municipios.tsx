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

interface Municipio {
  id: number | string;
  nombre?: string;
  codigo_dane?: string;
  codigo?: string;
}

async function apiFetch(path: string) {
  const token = await SecureStore.getItemAsync('satam_access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function MunicipioCard({ item }: { item: Municipio }) {
  const codigo = item.codigo_dane ?? item.codigo ?? '';
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/municipio/${item.id}` as any)}
      activeOpacity={0.75}
    >
      <Text style={styles.nombre}>{item.nombre ?? '—'}</Text>
      {!!codigo && <Text style={styles.codigo}>DANE: {codigo}</Text>}
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function MunicipiosScreen() {
  const [data, setData] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch('/municipios');
      setData(Array.isArray(res) ? res : res.results ?? res.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar municipios.');
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
        <Text style={styles.headerTitle}>Municipios</Text>
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
          renderItem={({ item }) => <MunicipioCard item={item} />}
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
              <Text style={styles.emptyText}>Sin municipios.</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    gap: 8,
  },
  nombre: { color: '#F9FAFB', fontSize: 15, fontWeight: '600', flex: 1 },
  codigo: { color: '#6B7280', fontSize: 12 },
  arrow: { fontSize: 22, color: '#374151' },
});
