import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../constants';

type NivelAlerta = 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO';

const TIPOS_AMENAZA = [
  'INUNDACION', 'DESLIZAMIENTO', 'SISMO', 'INCENDIO_FORESTAL',
  'VENDAVAL', 'GRANIZADA', 'SEQUIA', 'REMOCION', 'OTRO',
];

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

async function apiFetch(path: string, opts?: RequestInit) {
  const token = await SecureStore.getItemAsync('satam_access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token ?? ''}`,
      'Content-Type': 'application/json',
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((body?.message as string) ?? `HTTP ${res.status}`);
  }
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

function AlertaCard({
  item,
  canEmitir,
  onEmitir,
}: {
  item: Alerta;
  canEmitir: boolean;
  onEmitir: (id: string | number) => void;
}) {
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
      {canEmitir && !item.activa && (
        <TouchableOpacity
          style={styles.btnEmitir}
          onPress={() => onEmitir(item.id)}
        >
          <Text style={styles.btnEmitirText}>Emitir alerta</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function CrearAlertaModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState(TIPOS_AMENAZA[0]);
  const [nivel, setNivel] = useState<NivelAlerta>('AMARILLO');
  const [descripcion, setDescripcion] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setTitulo(''); setTipo(TIPOS_AMENAZA[0]); setNivel('AMARILLO');
    setDescripcion(''); setInstrucciones(''); setErr(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleGuardar = async () => {
    if (!titulo.trim()) { setErr('El título es obligatorio'); return; }
    setSaving(true); setErr(null);
    try {
      await apiFetch('/alertas', {
        method: 'POST',
        body: JSON.stringify({
          titulo: titulo.trim(),
          tipo,
          nivel,
          descripcion: descripcion.trim() || undefined,
          instrucciones_ciudadano: instrucciones.trim() || undefined,
        }),
      });
      reset();
      onCreated();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al crear alerta');
    } finally {
      setSaving(false);
    }
  };

  const NIVELES: NivelAlerta[] = ['VERDE', 'AMARILLO', 'NARANJA', 'ROJO'];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nueva Alerta</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {/* Título */}
            <Text style={styles.fieldLabel}>Título *</Text>
            <TextInput
              style={styles.input}
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Ej: Alerta por inundación río Guatiquía"
              placeholderTextColor="#4B5563"
            />

            {/* Tipo */}
            <Text style={styles.fieldLabel}>Tipo de amenaza</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {TIPOS_AMENAZA.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, tipo === t && styles.chipSelected]}
                  onPress={() => setTipo(t)}
                >
                  <Text style={[styles.chipText, tipo === t && styles.chipTextSelected]}>
                    {t.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Nivel */}
            <Text style={styles.fieldLabel}>Nivel de alerta</Text>
            <View style={styles.nivelRow}>
              {NIVELES.map((n) => {
                const color = NIVEL_COLORS[n];
                const selected = nivel === n;
                return (
                  <TouchableOpacity
                    key={n}
                    style={[styles.nivelChip, { borderColor: color }, selected && { backgroundColor: color + '33' }]}
                    onPress={() => setNivel(n)}
                  >
                    <Text style={[styles.nivelChipText, { color }]}>{n}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Descripción */}
            <Text style={styles.fieldLabel}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Descripción de la situación..."
              placeholderTextColor="#4B5563"
              multiline
              numberOfLines={3}
            />

            {/* Instrucciones ciudadano */}
            <Text style={styles.fieldLabel}>Instrucciones al ciudadano</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={instrucciones}
              onChangeText={setInstrucciones}
              placeholder="¿Qué debe hacer la comunidad?..."
              placeholderTextColor="#4B5563"
              multiline
              numberOfLines={3}
            />

            {!!err && <Text style={styles.errText}>{err}</Text>}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.btnGuardar, saving && { opacity: 0.6 }]}
              onPress={handleGuardar}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={styles.btnGuardarText}>Crear alerta</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AlertasScreen() {
  const { session } = useAuth();
  const rol: string = ((session?.user as any)?.rol ?? '').toLowerCase();
  const canCreate = rol === 'admin' || rol === 'cdgrd';

  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [nivelMaximo, setNivelMaximo] = useState<NivelAlerta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [emitiendo, setEmitiendo] = useState<string | number | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch('/alertas?activa=true');
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

  const emitirAlerta = useCallback((id: string | number) => {
    Alert.alert(
      'Emitir alerta',
      'La alerta se activará y se notificará a todos los ciudadanos en los municipios afectados. ¿Confirmar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Emitir',
          style: 'destructive',
          onPress: async () => {
            setEmitiendo(id);
            try {
              await apiFetch(`/alertas/${id}/emitir`, { method: 'POST' });
              await fetchData();
            } catch (e: unknown) {
              Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo emitir la alerta');
            } finally {
              setEmitiendo(null);
            }
          },
        },
      ],
    );
  }, [fetchData]);

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

  useEffect(() => { load(); }, [load]);

  const nivelColor = nivelMaximo ? NIVEL_COLORS[nivelMaximo] : '#22C55E';
  const nivelLabel = nivelMaximo ?? 'VERDE';

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={alertas}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <AlertaCard
              item={item}
              canEmitir={canCreate}
              onEmitir={emitirAlerta}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4f46e5"
              colors={['#4f46e5']}
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

      {canCreate && (
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      <CrearAlertaModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreated={() => { setModalVisible(false); load(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  emptyText: { color: '#6B7280', fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 100 },
  nivelMaxCard: {
    borderRadius: 14, borderWidth: 2, padding: 20,
    alignItems: 'center', marginBottom: 20,
  },
  nivelMaxLabel: { color: '#374151', fontSize: 13, marginBottom: 6 },
  nivelMaxValue: { fontSize: 32, fontWeight: '800', letterSpacing: 2 },
  card: { backgroundColor: '#e0e7ff', borderRadius: 12, padding: 14, marginBottom: 12, gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardFecha: { color: '#312e81', fontSize: 12, marginLeft: 'auto' },
  cardTipo: { color: '#0f0a2e', fontSize: 14, fontWeight: '600' },
  cardMunicipio: { color: '#312e81', fontSize: 12 },
  cardDesc: { color: '#312e81', fontSize: 13, lineHeight: 18 },
  badge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  activaBadge: {
    backgroundColor: '#EF444433', borderColor: '#EF4444',
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  activaBadgeText: { color: '#EF4444', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%', flex: 0,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#e0e7ff',
  },
  modalTitle: { color: '#0f0a2e', fontSize: 18, fontWeight: '700' },
  modalBody: { paddingHorizontal: 20, paddingTop: 16, flexShrink: 1 },
  modalFooter: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  fieldLabel: { color: '#374151', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#e0e7ff', borderRadius: 10, color: '#0f0a2e',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', marginBottom: 4 },
  chip: {
    borderRadius: 20, borderWidth: 1, borderColor: '#c7d2fe',
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 4,
  },
  chipSelected: { backgroundColor: '#4f46e533', borderColor: '#4f46e5' },
  chipText: { color: '#374151', fontSize: 12 },
  chipTextSelected: { color: '#4f46e5', fontWeight: '600' },
  nivelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  nivelChip: {
    borderWidth: 2, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, flex: 1,
    alignItems: 'center',
  },
  nivelChipText: { fontSize: 12, fontWeight: '700' },
  errText: { color: '#EF4444', fontSize: 13, marginTop: 12, textAlign: 'center' },
  btnGuardar: {
    backgroundColor: '#4f46e5',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  btnGuardarText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  btnEmitir: {
    marginTop: 8, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: '#DC262633', borderColor: '#DC2626', borderWidth: 1,
    alignSelf: 'flex-start',
  },
  btnEmitirText: { color: '#EF4444', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
});
