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

interface Recurso {
  id: number | string;
  nombre?: string;
  tipo?: string;
  organismo?: string;
  disponible?: boolean;
}

async function apiFetch(path: string) {
  const token = await SecureStore.getItemAsync('satam_access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function RecursoCard({ item }: { item: Recurso }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.nombre}>{item.nombre ?? '—'}</Text>
        <View
          style={[
            styles.dispBadge,
            {
              backgroundColor: item.disponible ? '#22C55E33' : '#EF444433',
              borderColor: item.disponible ? '#22C55E' : '#EF4444',
            },
          ]}
        >
          <Text
            style={[
              styles.dispBadgeText,
              { color: item.disponible ? '#22C55E' : '#EF4444' },
            ]}
          >
            {item.disponible ? 'DISPONIBLE' : 'NO DISPONIBLE'}
          </Text>
        </View>
      </View>
      {!!item.tipo && <Text style={styles.tipo}>{item.tipo}</Text>}
      {!!item.organismo && <Text style={styles.organismo}>{item.organismo}</Text>}
    </View>
  );
}

export default function RecursosScreen() {
  const [data, setData] = useState<Recurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch('/recursos');
      setData(Array.isArray(res) ? res : res.results ?? res.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar recursos.');
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
        <Text style={styles.headerTitle}>Recursos</Text>
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
          renderItem={({ item }) => <RecursoCard item={item} />}
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
              <Text style={styles.emptyText}>Sin recursos registrados.</Text>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  nombre: { color: '#F9FAFB', fontSize: 15, fontWeight: '600', flex: 1 },
  tipo: { color: '#9CA3AF', fontSize: 13 },
  organismo: { color: '#6B7280', fontSize: 12 },
  dispBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dispBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
});
