import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../../constants';

const BACKEND = API_BASE;
const OFFLINE_QUEUE_KEY = 'satam_incidente_queue';

type EstadoIncidente = 'PENDIENTE' | 'CONFIRMADO' | 'EN_CURSO' | 'CONTROLADO' | 'CERRADO' | 'FALSO_POSITIVO' | 'CANCELADO';
type NivelIncidente = 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO';

interface Incidente {
  id: number | string;
  codigo: string;
  tipo: string;
  tipo_amenaza?: string;
  municipio: string;
  municipio_nombre?: string;
  nivel: NivelIncidente;
  nivel_alerta?: string;
  estado: EstadoIncidente;
  titulo?: string;
  _offline?: boolean;
}

const ESTADO_COLORS: Record<EstadoIncidente, string> = {
  PENDIENTE: '#6B7280',
  CONFIRMADO: '#3B82F6',
  EN_CURSO: '#F59E0B',
  CONTROLADO: '#22C55E',
  CERRADO: '#4B5563',
  FALSO_POSITIVO: '#9CA3AF',
  CANCELADO: '#9CA3AF',
};

const NIVEL_COLORS: Record<NivelIncidente, string> = {
  VERDE: '#22C55E',
  AMARILLO: '#EAB308',
  NARANJA: '#F97316',
  ROJO: '#EF4444',
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '33', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function IncidenteCard({ item }: { item: Incidente }) {
  const estadoColor = ESTADO_COLORS[item.estado] ?? '#6B7280';
  const nivelColor = NIVEL_COLORS[item.nivel] ?? '#6B7280';

  const handlePress = () => {
    if (!item._offline) {
      router.push(`/incidente/${item.id}`);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={item._offline ? 1 : 0.75}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardCodigo}>{item.codigo}</Text>
        {item._offline && (
          <View style={styles.offlinePill}>
            <Text style={styles.offlinePillText}>PENDIENTE SYNC</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardTipo}>{item.tipo}</Text>
      <Text style={styles.cardMunicipio}>{item.municipio}</Text>
      <View style={styles.badgeRow}>
        <Badge label={item.nivel} color={nivelColor} />
        <Badge label={item.estado.replace('_', ' ')} color={estadoColor} />
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOfflineQueue = useCallback(async (): Promise<Incidente[]> => {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!raw) return [];
      const queue: Incidente[] = JSON.parse(raw);
      return queue.map((item) => ({ ...item, estado: 'PENDIENTE' as const, _offline: true }));
    } catch {
      return [];
    }
  }, []);

  const fetchIncidentes = useCallback(async () => {
    setError(null);
    try {
      const token = await SecureStore.getItemAsync('satam_access_token');
      const response = await fetch(`${BACKEND}/incidentes?limit=50`, {
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawList: any[] = Array.isArray(data)
        ? data
        : data.results ?? data.data ?? [];
      const remoteList: Incidente[] = rawList.map((i) => ({
        ...i,
        tipo: i.tipo ?? i.tipo_amenaza ?? '',
        nivel: (i.nivel_alerta ?? i.nivel ?? 'AMARILLO') as NivelIncidente,
        estado: (i.estado ?? 'CERRADO') as EstadoIncidente,
        municipio: i.titulo ?? i.municipio ?? '',
      }));

      const offlineList = await loadOfflineQueue();

      // merge: offline items not yet in remote list
      const remoteCodes = new Set(remoteList.map((i) => i.codigo));
      const pendientes = offlineList.filter((i) => !remoteCodes.has(i.codigo));

      setIncidentes([...pendientes, ...remoteList]);
    } catch {
      // network error — fall back to offline queue only
      const offlineList = await loadOfflineQueue();
      setIncidentes(offlineList);
      if (offlineList.length === 0) {
        setError('Sin conexión y sin datos locales.');
      }
    }
  }, [loadOfflineQueue]);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchIncidentes();
    setLoading(false);
  }, [fetchIncidentes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchIncidentes();
    setRefreshing(false);
  }, [fetchIncidentes]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFab = () => {
    router.push('/(tabs)/nuevo-incidente');
  };

  return (
    <View style={styles.container}>
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
          data={incidentes}
          keyExtractor={(item) => String(item.id ?? item.codigo)}
          renderItem={({ item }) => <IncidenteCard item={item} />}
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
              <Text style={styles.emptyText}>Sin incidentes registrados.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleFab} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 96,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardCodigo: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardTipo: {
    color: '#D1D5DB',
    fontSize: 13,
    marginBottom: 2,
  },
  cardMunicipio: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  offlinePill: {
    backgroundColor: '#78350F33',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  offlinePillText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '400',
  },
});
