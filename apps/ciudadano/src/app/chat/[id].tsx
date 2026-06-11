import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from '../../constants';

interface Mensaje {
  id: string;
  contenido: string;
  tipo: string;
  nombre?: string;
  apellido?: string;
  autor_rol?: string;
  created_at: string;
  autor_id?: string;
}

const ROL_COLORS: Record<string, string> = {
  ADMIN: '#A78BFA',
  CDGRD: '#F59E0B',
  CMGRD: '#3B82F6',
  SOCORRO: '#22C55E',
  CIUDADANO: '#9CA3AF',
};

function formatHora(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const flatRef = useRef<FlatList<Mensaje>>(null);

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  const fetchMensajes = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('satam_access_token');
      const res = await fetch(`${API_BASE}/chats/${id}/mensajes?limit=100`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: Mensaje[] = Array.isArray(data) ? data : data.data ?? [];
      setMensajes(list);
    } catch (e: any) {
      setError(e?.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Resolve current user ID from token payload
  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('satam_access_token');
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            setMyId(payload.sub ?? null);
          }
        } catch {}
      }
    })();
  }, []);

  useEffect(() => {
    fetchMensajes();
    // Poll each 10s for new messages (WS not yet active)
    const interval = setInterval(fetchMensajes, 10000);
    return () => clearInterval(interval);
  }, [fetchMensajes]);

  useEffect(() => {
    if (mensajes.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [mensajes.length]);

  const handleEnviar = async () => {
    const msg = texto.trim();
    if (!msg || enviando) return;
    setEnviando(true);
    try {
      const token = await SecureStore.getItemAsync('satam_access_token');
      const res = await fetch(`${API_BASE}/chats/${id}/mensajes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contenido: msg }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTexto('');
      await fetchMensajes();
    } catch {
      // silent — message stays in input if failed
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Canal de comunicación</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={mensajes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Sin mensajes aún. Sé el primero en escribir.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.autor_id === myId;
            const autor = [item.nombre, item.apellido].filter(Boolean).join(' ') || 'Sistema';
            const rolColor = ROL_COLORS[item.autor_rol ?? ''] ?? '#9CA3AF';
            return (
              <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                {item.tipo === 'ALERTA_OFICIAL' && (
                  <View style={styles.alertaHeader}>
                    <Ionicons name="alert-circle" size={14} color="#F59E0B" />
                    <Text style={styles.alertaLabel}>ALERTA OFICIAL</Text>
                  </View>
                )}
                <View style={[
                  styles.bubble,
                  isMe ? styles.bubbleMe : styles.bubbleOther,
                  item.tipo === 'ALERTA_OFICIAL' && styles.bubbleAlerta,
                ]}>
                  {!isMe && (
                    <Text style={[styles.bubbleAutor, { color: rolColor }]}>{autor}</Text>
                  )}
                  <Text style={styles.bubbleTexto}>{item.contenido}</Text>
                  <Text style={styles.bubbleHora}>{formatHora(item.created_at)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#6B7280"
          value={texto}
          onChangeText={setTexto}
          multiline
          editable={!enviando}
          returnKeyType="send"
          onSubmitEditing={handleEnviar}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!texto.trim() || enviando) && styles.sendBtnDisabled]}
          onPress={handleEnviar}
          disabled={!texto.trim() || enviando}
          activeOpacity={0.8}
        >
          {enviando ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  headerTitle: { flex: 1, color: '#F9FAFB', fontSize: 16, fontWeight: '700' },
  errorText: { color: '#EF4444', fontSize: 14 },
  listContent: { padding: 12, gap: 6 },
  emptyBox: { paddingTop: 40, alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14 },
  msgRow: { flexDirection: 'row' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 12,
    padding: 10,
    gap: 3,
  },
  bubbleMe: { backgroundColor: '#1D4ED8', borderBottomRightRadius: 2 },
  bubbleOther: { backgroundColor: '#1F2937', borderBottomLeftRadius: 2 },
  bubbleAlerta: { backgroundColor: '#78350F', borderWidth: 1, borderColor: '#F59E0B' },
  bubbleAutor: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  bubbleTexto: { color: '#F9FAFB', fontSize: 14, lineHeight: 20 },
  bubbleHora: { color: 'rgba(255,255,255,0.4)', fontSize: 10, textAlign: 'right' },
  alertaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  alertaLabel: { color: '#F59E0B', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0A0E1A',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F9FAFB',
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#1E3A5F' },
});
