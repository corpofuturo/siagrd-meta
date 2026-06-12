import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../../constants';

type NivelAlerta = 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO';

interface Alerta {
  id: number | string;
  tipo: string;
  municipio: string;
  municipio_nombre?: string;
  nivel: NivelAlerta;
  nivel_alerta?: string;
  fecha_inicio?: string;
  created_at?: string;
  activa?: boolean;
  titulo?: string;
  descripcion?: string;
  estado?: string;
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

function NivelBadge({ nivel }: { nivel: NivelAlerta }) {
  const color = NIVEL_COLORS[nivel] ?? '#6B7280';
  return (
    <View style={[styles.badge, { backgroundColor: color + '33', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{nivel}</Text>
    </View>
  );
}

function AlertaCard({ item }: { item: Alerta }) {
  const nivel = (item.nivel ?? item.nivel_alerta ?? 'AMARILLO') as NivelAlerta;
  const municipio = item.municipio_nombre ?? item.municipio ?? '';
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
        <NivelBadge nivel={nivel} />
        {item.activa && (
          <View style={styles.activaBadge}>
            <Text style={styles.activaBadgeText}>ACTIVA</Text>
          </View>
        )}
        <Text style={styles.cardFecha}>{fechaStr}</Text>
      </View>
      <Text style={styles.cardTipo}>{item.titulo ?? item.tipo ?? ''}</Text>
      {!!municipio && <Text style={styles.cardMunicipio}>{municipio}</Text>}
      {!!item.descripcion && (
        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.descripcion}
        </Text>
      )}
    </View>
  );
}

export default function AlertasScreen() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [nivelMaximo, setNivelMaximo] = useState<NivelAlerta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch('/alertas');
      const list: Alerta[] = Array.isArray(data)
        ? data
        : data.results ?? data.data ?? [];

      setAlertas(list);

      const ORDEN: NivelAlerta[] = ['ROJO', 'NARANJA', 'AMARILLO', 'VERDE'];
      const activas = list.filter((a) => a.activa);
      const maximo = ORDEN.find((n) =>
        activas.some((a) => (a.nivel ?? a.nivel_alerta) === n)
      );
      setNivelMaximo(maximo ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar alertas.');
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

  const nivelColor = nivelMaximo ? NIVEL_COLORS[nivelMaximo] : '#22C55E';
  const nivelLabel = nivelMaximo ?? 'VERDE';

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
          data={alertas}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <AlertaCard item={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
          ListHeaderComponent={
            <View
              style={[
                styles.nivelMaxCard,
                { backgroundColor: nivelColor + '22', borderColor: nivelColor },
              ]}
            >
              <Text style={styles.nivelMaxLabel}>Nivel de alerta actual</Text>
              <Text style={[styles.nivelMaxValue, { color: nivelColor }]}>
                {nivelLabel}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Sin alertas activas.</Text>
            </View>
          }
        />
      )}
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
    padding: 16,
    paddingBottom: 80,
  },
  nivelMaxCard: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  nivelMaxLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 6,
  },
  nivelMaxValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardFecha: {
    color: '#6B7280',
    fontSize: 12,
    marginLeft: 'auto',
  },
  cardTipo: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
  },
  cardMunicipio: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  cardDesc: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
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
  activaBadge: {
    backgroundColor: '#EF444433',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activaBadgeText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
