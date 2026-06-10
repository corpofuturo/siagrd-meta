import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const BACKEND = 'https://backend-production-60016.up.railway.app/api/v1';
const QUEUE_KEY = 'satam_incidente_queue';

interface QueueItem {
  id: string;
  tipo_amenaza: string;
  municipio?: string;
  sincronizado: boolean;
  [key: string]: unknown;
}

export default function SyncScreen() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (raw) {
        const parsed: QueueItem[] = JSON.parse(raw);
        setQueue(parsed);
      } else {
        setQueue([]);
      }
    } catch {
      setQueue([]);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 5000);
    return () => clearInterval(interval);
  }, [loadQueue]);

  const pending = queue.filter((item) => !item.sincronizado);

  const handleSync = async () => {
    if (pending.length === 0) return;
    setSyncing(true);

    const updatedQueue = [...queue];
    const failed: string[] = [];

    for (const item of pending) {
      try {
        const response = await fetch(`${BACKEND}/incidentes/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (response.ok) {
          const idx = updatedQueue.findIndex((q) => q.id === item.id);
          if (idx !== -1) updatedQueue[idx] = { ...updatedQueue[idx], sincronizado: true };
        } else {
          failed.push(item.id);
        }
      } catch {
        failed.push(item.id);
      }
    }

    const remaining = updatedQueue.filter(
      (item) => !item.sincronizado || failed.includes(item.id)
    );

    try {
      if (remaining.length > 0) {
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
      } else {
        await AsyncStorage.removeItem(QUEUE_KEY);
      }
    } catch {
      // persist best-effort
    }

    setQueue(updatedQueue);
    setSyncing(false);

    if (failed.length > 0) {
      Alert.alert('Sincronización parcial', `${failed.length} incidente(s) no pudieron sincronizarse.`);
    }
  };

  const renderItem = ({ item }: { item: QueueItem }) => (
    <View style={styles.card}>
      <Ionicons name="cloud-upload-outline" size={24} color="#F97316" style={styles.cardIcon} />
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{item.tipo_amenaza}</Text>
        {item.municipio ? (
          <Text style={styles.cardSub}>{item.municipio}</Text>
        ) : null}
      </View>
    </View>
  );

  if (pending.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={72} color="#34C759" />
          <Text style={styles.emptyText}>Todo sincronizado</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {pending.length} pendiente{pending.length !== 1 ? 's' : ''} por sincronizar
        </Text>
        <TouchableOpacity
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          onPress={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.syncButtonText}>Sincronizar ahora</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    color: '#34C759',
    fontSize: 20,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#1F2937',
    padding: 16,
    gap: 12,
  },
  headerTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  syncButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIcon: {
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '600',
  },
  cardSub: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
});
