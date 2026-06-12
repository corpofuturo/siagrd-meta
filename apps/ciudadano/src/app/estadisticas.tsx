import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../constants';

interface StatItem {
  tipo?: string;
  municipio?: string;
  municipio_nombre?: string;
  count: number;
  total?: number;
}

async function apiFetch(path: string) {
  const token = await SecureStore.getItemAsync('satam_access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function EstadisticasScreen() {
  const [byTipo, setByTipo] = useState<StatItem[]>([]);
  const [byMunicipio, setByMunicipio] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [dataTipo, dataMun] = await Promise.all([
        apiFetch('/estadisticas/por-tipo'),
        apiFetch('/estadisticas/por-municipio'),
      ]);
      setByTipo(Array.isArray(dataTipo) ? dataTipo : dataTipo.results ?? []);
      setByMunicipio(Array.isArray(dataMun) ? dataMun : dataMun.results ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar estadísticas.');
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

  if (loading) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
      >
        <Text style={styles.sectionTitle}>Por tipo de amenaza</Text>
        {byTipo.length === 0 ? (
          <Text style={styles.emptyText}>Sin datos.</Text>
        ) : (
          byTipo.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.tableLabel}>{item.tipo ?? '—'}</Text>
              <Text style={styles.tableValue}>{item.count ?? item.total ?? 0}</Text>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Por municipio</Text>
        {byMunicipio.length === 0 ? (
          <Text style={styles.emptyText}>Sin datos.</Text>
        ) : (
          byMunicipio.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.tableLabel}>
                {item.municipio_nombre ?? item.municipio ?? '—'}
              </Text>
              <Text style={styles.tableValue}>{item.count ?? item.total ?? 0}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Estadísticas</Text>
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
  listContent: { padding: 16, paddingBottom: 80 },
  sectionTitle: { color: '#9CA3AF', fontSize: 14, fontWeight: '600', marginBottom: 10, letterSpacing: 0.5 },
  emptyText: { color: '#6B7280', fontSize: 14, marginBottom: 8 },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  tableLabel: { color: '#F9FAFB', fontSize: 14, flex: 1 },
  tableValue: { color: '#3B82F6', fontSize: 16, fontWeight: '700' },
});
