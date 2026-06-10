import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from '../../services/auth.service';

const BACKEND = 'https://backend-production-60016.up.railway.app/api/v1';
const CACHE_KEY = 'satam_alertas_cache';

const NIVEL_COLORES: Record<string, string> = {
  ROJO: '#FF3B30',
  NARANJA: '#FF9500',
  AMARILLO: '#FFCC00',
  VERDE: '#34C759',
};

interface Alerta {
  id: number;
  tipo: string;
  descripcion: string;
  municipio: string;
  nivel: string;
  activa: boolean;
}

export default function HomeScreen() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  const cargarAlertas = useCallback(async () => {
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${BACKEND}/alertas?activa=true`, { headers });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data: Alerta[] = await response.json();
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      setAlertas(data);
      setOffline(false);
    } catch {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        setAlertas(JSON.parse(cached));
      }
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    cargarAlertas();
  }, [cargarAlertas]);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarAlertas();
    setRefreshing(false);
  };

  const renderAlerta = ({ item }: { item: Alerta }) => {
    const dotColor = NIVEL_COLORES[item.nivel] ?? '#9CA3AF';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={styles.tipo}>{item.tipo}</Text>
          <View style={[styles.badge, { borderColor: dotColor }]}>
            <Text style={[styles.badgeText, { color: dotColor }]}>{item.nivel}</Text>
          </View>
        </View>
        <Text style={styles.descripcion} numberOfLines={2}>
          {item.descripcion}
        </Text>
        <Text style={styles.municipio}>{item.municipio}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F1117" />

      {offline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Sin conexion — datos en cache</Text>
        </View>
      )}

      <FlatList
        data={alertas}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderAlerta}
        contentContainerStyle={alertas.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6B7280"
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Sin alertas activas</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1117',
  },
  offlineBanner: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#D1D5DB',
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tipo: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  descripcion: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  municipio: {
    color: '#6B7280',
    fontSize: 12,
  },
});
