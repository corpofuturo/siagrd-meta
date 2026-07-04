import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, StyleSheet, ScrollView, Alert, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

interface Comite {
  id: string;
  nombre: string;
  tipo: string;
  municipio?: string;
  presidente?: string;
  secretario?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
}

const TIPOS = ['CONGRD', 'CDGRD', 'SDGRD', 'CMGRD'] as const;
type TipoComite = typeof TIPOS[number];

const TIPO_COLORS: Record<TipoComite, string> = {
  CONGRD: '#7C3AED',
  CDGRD: '#4f46e5',
  SDGRD: '#4F46E5',
  CMGRD: '#0D9488',
};

async function getHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('satam_access_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function TipoBadge({ tipo }: { tipo: string }) {
  const color = TIPO_COLORS[tipo as TipoComite] ?? '#6B7280';
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{tipo}</Text>
    </View>
  );
}

const EMPTY_FORM = { nombre: '', tipo: 'CDGRD' as TipoComite, municipio: '', presidente: '', secretario: '', correo: '', telefono: '', direccion: '' };

export default function ComitesScreen() {
  const { session } = useAuth();
  const canManage = session?.user?.rol === 'ADMIN' || session?.user?.rol === 'CDGRD';

  const [comites, setComites] = useState<Comite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Comite | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchComites = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/comites`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setComites(Array.isArray(data) ? data : data.data ?? []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar comités');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchComites(); }, [fetchComites]);

  const handleRefresh = () => { setRefreshing(true); fetchComites(); };

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalVisible(true); };

  const openEdit = (c: Comite) => {
    setEditTarget(c);
    setForm({
      nombre: c.nombre, tipo: (c.tipo as TipoComite) || 'CDGRD',
      municipio: c.municipio ?? '', presidente: c.presidente ?? '',
      secretario: c.secretario ?? '', correo: c.correo ?? '',
      telefono: c.telefono ?? '', direccion: c.direccion ?? '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) { Alert.alert('Requerido', 'El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const headers = await getHeaders();
      const url = editTarget ? `${API_BASE}/comites/${editTarget.id}` : `${API_BASE}/comites`;
      const method = editTarget ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ?? `HTTP ${res.status}`);
      }
      setModalVisible(false);
      fetchComites();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar el comité');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: Comite }) => (
    <View style={styles.item}>
      <View style={styles.itemTop}>
        <Text style={styles.itemNombre} numberOfLines={1}>{item.nombre}</Text>
        <TipoBadge tipo={item.tipo} />
      </View>
      {item.municipio && <Text style={styles.itemSub}>📍 {item.municipio}</Text>}
      {item.presidente && <Text style={styles.itemSub}>Presidente: {item.presidente}</Text>}
      <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
        <Text style={styles.editBtnText}>Editar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comités GRD</Text>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#4f46e5" /></View>
      ) : (
        <FlatList
          data={comites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyBox}><Text style={styles.emptyText}>No hay comités registrados</Text></View>
          }
        />
      )}

      {canManage && (
        <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editTarget ? 'Editar Comité' : 'Nuevo Comité'}</Text>

              <Text style={styles.label}>Tipo</Text>
              <View style={styles.tiposRow}>
                {TIPOS.map((t) => {
                  const color = TIPO_COLORS[t];
                  const active = form.tipo === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.tipoBtn, active && { backgroundColor: color, borderColor: color }]}
                      onPress={() => setForm((f) => ({ ...f, tipo: t }))}
                    >
                      <Text style={[styles.tipoBtnText, active && styles.tipoBtnTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Nombre *</Text>
              <TextInput style={styles.input} placeholder="Nombre del comité" placeholderTextColor="#14532d" value={form.nombre} onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))} />

              <Text style={styles.label}>Municipio</Text>
              <TextInput style={styles.input} placeholder="Municipio" placeholderTextColor="#14532d" value={form.municipio} onChangeText={(v) => setForm((f) => ({ ...f, municipio: v }))} />

              <Text style={styles.label}>Presidente</Text>
              <TextInput style={styles.input} placeholder="Nombre del presidente" placeholderTextColor="#14532d" value={form.presidente} onChangeText={(v) => setForm((f) => ({ ...f, presidente: v }))} />

              <Text style={styles.label}>Secretario</Text>
              <TextInput style={styles.input} placeholder="Nombre del secretario" placeholderTextColor="#14532d" value={form.secretario} onChangeText={(v) => setForm((f) => ({ ...f, secretario: v }))} />

              <Text style={styles.label}>Correo</Text>
              <TextInput style={styles.input} placeholder="correo@ejemplo.com" placeholderTextColor="#14532d" value={form.correo} onChangeText={(v) => setForm((f) => ({ ...f, correo: v }))} keyboardType="email-address" autoCapitalize="none" />

              <Text style={styles.label}>Teléfono</Text>
              <TextInput style={styles.input} placeholder="Teléfono" placeholderTextColor="#14532d" value={form.telefono} onChangeText={(v) => setForm((f) => ({ ...f, telefono: v }))} keyboardType="phone-pad" />

              <Text style={styles.label}>Dirección</Text>
              <TextInput style={styles.input} placeholder="Dirección" placeholderTextColor="#14532d" value={form.direccion} onChangeText={(v) => setForm((f) => ({ ...f, direccion: v }))} />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>{editTarget ? 'Guardar' : 'Crear'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2ff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: '#eef2ff', borderBottomWidth: 1, borderBottomColor: '#dcfce7', gap: 10,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: '#4f46e5', fontWeight: '700' },
  headerTitle: { flex: 1, color: '#0f0a2e', fontSize: 17, fontWeight: '700' },
  listContent: { padding: 16, gap: 10, paddingBottom: 100 },
  item: { backgroundColor: '#dcfce7', borderRadius: 14, padding: 14, gap: 6 },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemNombre: { flex: 1, color: '#0f0a2e', fontSize: 15, fontWeight: '700' },
  itemSub: { color: '#14532d', fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  editBtn: { alignSelf: 'flex-end', marginTop: 4 },
  editBtnText: { color: '#4f46e5', fontSize: 12, fontWeight: '600' },
  emptyBox: { paddingTop: 60, alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#4f46e5', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  fabIcon: { color: '#FFF', fontSize: 28, fontWeight: '300', marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { color: '#0f0a2e', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { color: '#374151', fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: '#dcfce7', borderRadius: 10, padding: 12, color: '#0f0a2e', fontSize: 14, borderWidth: 1, borderColor: '#c7d2fe' },
  tiposRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tipoBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#c7d2fe' },
  tipoBtnText: { color: '#14532d', fontSize: 12, fontWeight: '600' },
  tipoBtnTextActive: { color: '#FFF' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#dcfce7', alignItems: 'center' },
  cancelBtnText: { color: '#14532d', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#4f46e5', alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700' },
});
