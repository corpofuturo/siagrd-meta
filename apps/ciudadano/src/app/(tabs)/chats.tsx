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
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from '../../constants';

type TipoChat = 'PUBLICO_EVENTO' | 'OPERATIVO_EVENTO' | 'GENERAL';

interface Chat {
  id: string;
  tipo: TipoChat;
  nombre: string | null;
  incidente_id: string | null;
  municipio_id: string | null;
  created_at: string;
}

const TIPO_CONFIG: Record<TipoChat, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  GENERAL: { label: 'General', color: '#3B82F6', icon: 'chatbubbles-outline' },
  OPERATIVO_EVENTO: { label: 'Operativo', color: '#F97316', icon: 'shield-outline' },
  PUBLICO_EVENTO: { label: 'Público', color: '#22C55E', icon: 'people-outline' },
};

export default function ChatsScreen() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    setError(null);
    try {
      const token = await SecureStore.getItemAsync('satam_access_token');
      const res = await fetch(`${API_BASE}/chats`, {
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: Chat[] = Array.isArray(data) ? data : data.data ?? [];
      setChats(list);
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando canales');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChats();
  }, [fetchChats]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
        contentContainerStyle={chats.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="chatbubbles-outline" size={48} color="#374151" />
            <Text style={styles.emptyText}>Sin canales disponibles</Text>
          </View>
        }
        renderItem={({ item }) => {
          const config = TIPO_CONFIG[item.tipo] ?? TIPO_CONFIG.GENERAL;
          return (
            <TouchableOpacity
              style={styles.chatCard}
              onPress={() => router.push(`/chat/${item.id}`)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconBox, { backgroundColor: config.color + '22' }]}>
                <Ionicons name={config.icon} size={22} color={config.color} />
              </View>
              <View style={styles.chatInfo}>
                <Text style={styles.chatNombre} numberOfLines={1}>
                  {item.nombre ?? `Canal ${item.tipo}`}
                </Text>
                <View style={[styles.tipoBadge, { borderColor: config.color }]}>
                  <Text style={[styles.tipoText, { color: config.color }]}>{config.label}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#374151" />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyContainer: { flexGrow: 1 },
  listContent: { padding: 16, gap: 10 },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderBottomWidth: 1,
    borderColor: '#EF4444',
    padding: 10,
  },
  errorText: { color: '#FCA5A5', fontSize: 13, textAlign: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14, marginTop: 12 },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInfo: { flex: 1, gap: 4 },
  chatNombre: { color: '#F9FAFB', fontSize: 14, fontWeight: '600' },
  tipoBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tipoText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
});
