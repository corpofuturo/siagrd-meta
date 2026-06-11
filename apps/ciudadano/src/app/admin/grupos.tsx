import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../../constants';

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
}

interface Resumen {
  total_socorro: number;
  total_ciudadanos: number;
  total_comites: number;
  total_usuarios: number;
}

type Tab = 'Socorro' | 'Ciudadanos' | 'Comités';
const TABS: Tab[] = ['Socorro', 'Ciudadanos', 'Comités'];

const ROL_COLORS: Record<string, string> = {
  ADMIN: '#A78BFA', CDGRD: '#F59E0B', SOCORRO: '#22C55E', CIUDADANO: '#9CA3AF',
};

async function getHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('satam_access_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function RolBadge({ rol }: { rol: string }) {
  const color = ROL_COLORS[rol] ?? '#9CA3AF';
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{rol}</Text>
    </View>
  );
}

export default function GruposScreen() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Socorro');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchResumen = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/grupos/resumen`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Resumen = await res.json();
      setResumen(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar resumen');
    } finally {
      setLoadingResumen(false);
    }
  }, []);

  const fetchTab = useCallback(async (tab: Tab) => {
    setLoadingList(true);
    try {
      const headers = await getHeaders();
      const url =
        tab === 'Socorro' ? `${API_BASE}/grupos/socorro` :
        tab === 'Ciudadanos' ? `${API_BASE}/grupos/ciudadanos?limit=20&offset=0` :
        `${API_BASE}/grupos/comites`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : data.data ?? []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar usuarios');
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchResumen(); }, [fetchResumen]);
  useEffect(() => { fetchTab(activeTab); }, [activeTab, fetchTab]);

  const handleRefresh = () => { setRefreshing(true); fetchTab(activeTab); };

  const metricas: { label: string; value: number | undefined; color: string }[] = [
    { label: 'Total Usuarios', value: resumen?.total_usuarios, color: '#2563EB' },
    { label: 'Socorro', value: resumen?.total_socorro, color: '#22C55E' },
    { label: 'Ciudadanos', value: resumen?.total_ciudadanos, color: '#9CA3AF' },
    { label: 'Comités', value: resumen?.total_comites, color: '#F59E0B' },
  ];

  const renderUser = ({ item }: { item: Usuario }) => (
    <View style={styles.userItem}>
      <View style={styles.userLeft}>
        <Text style={styles.userName}>{item.nombre} {item.apellido}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <RolBadge rol={item.rol} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Grupos de Usuarios</Text>
      </View>

      {/* Métricas */}
      {loadingResumen ? (
        <View style={styles.metricsRow}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      ) : (
        <View style={styles.metricsRow}>
          {metricas.map((m) => (
            <View key={m.label} style={[styles.metricCard, { borderTopColor: m.color }]}>
              <Text style={[styles.metricValue, { color: m.color }]}>{m.value ?? '—'}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabBtnText, activeTab === t && styles.tabBtnTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loadingList ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#2563EB" /></View>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyBox}><Text style={styles.emptyText}>Sin usuarios en este grupo</Text></View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: '#0A0E1A', borderBottomWidth: 1, borderBottomColor: '#1F2937', gap: 10,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: '#2563EB', fontWeight: '700' },
  headerTitle: { flex: 1, color: '#F9FAFB', fontSize: 17, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  metricCard: {
    flex: 1, backgroundColor: '#1F2937', borderRadius: 12, padding: 10,
    alignItems: 'center', borderTopWidth: 3,
  },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricLabel: { color: '#9CA3AF', fontSize: 10, marginTop: 2, textAlign: 'center' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#1F2937', alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#2563EB' },
  tabBtnText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  tabBtnTextActive: { color: '#FFF' },
  listContent: { padding: 16, gap: 8, paddingBottom: 40 },
  userItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1F2937', borderRadius: 12, padding: 12, gap: 10,
  },
  userLeft: { flex: 1 },
  userName: { color: '#F9FAFB', fontSize: 14, fontWeight: '600' },
  userEmail: { color: '#9CA3AF', fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  emptyBox: { paddingTop: 60, alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14 },
});
