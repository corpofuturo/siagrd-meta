import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, StyleSheet, ScrollView, Alert, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../../constants';

interface JAL {
  id: string;
  nombre: string;
  barrio_vereda?: string;
  municipio?: string;
  municipio_id?: string;
  presidente?: string;
  correo?: string;
  telefono?: string;
}

async function getHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('satam_access_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const EMPTY_FORM = { nombre: '', barrio_vereda: '', municipio_id: '', presidente: '', correo: '', telefono: '' };

export default function JALScreen() {
  const [jals, setJals] = useState<JAL[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<JAL | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchJals = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/jal`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setJals(Array.isArray(data) ? data : data.data ?? []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar JAL');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchJals(); }, [fetchJals]);

  const handleRefresh = () => { setRefreshing(true); fetchJals(); };

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalVisible(true); };

  const openEdit = (j: JAL) => {
    setEditTarget(j);
    setForm({
      nombre: j.nombre, barrio_vereda: j.barrio_vereda ?? '',
      municipio_id: j.municipio_id ?? j.municipio ?? '',
      presidente: j.presidente ?? '', correo: j.correo ?? '', telefono: j.telefono ?? '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) { Alert.alert('Requerido', 'El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const headers = await getHeaders();
      const url = editTarget ? `${API_BASE}/jal/${editTarget.id}` : `${API_BASE}/jal`;
      const method = editTarget ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ?? `HTTP ${res.status}`);
      }
      setModalVisible(false);
      fetchJals();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar la JAL');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: JAL }) => (
    <View style={styles.item}>
      <View style={styles.itemTop}>
        <Text style={styles.itemNombre} numberOfLines={1}>{item.nombre}</Text>
      </View>
      {item.barrio_vereda && <Text style={styles.itemSub}>🏘️ {item.barrio_vereda}</Text>}
      {(item.municipio || item.municipio_id) && <Text style={styles.itemSub}>📍 {item.municipio ?? item.municipio_id}</Text>}
      {item.presidente && <Text style={styles.itemSub}>Presidente: {item.presidente}</Text>}
      {item.correo && <Text style={styles.itemSub}>✉️ {item.correo}</Text>}
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
        <Text style={styles.headerTitle}>Juntas de Acción Comunal</Text>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#2563EB" /></View>
      ) : (
        <FlatList
          data={jals}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyBox}><Text style={styles.emptyText}>No hay JAL registradas</Text></View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editTarget ? 'Editar JAL' : 'Nueva JAL'}</Text>

              <Text style={styles.label}>Nombre *</Text>
              <TextInput style={styles.input} placeholder="Nombre de la JAL" placeholderTextColor="#6B7280" value={form.nombre} onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))} />

              <Text style={styles.label}>Barrio / Vereda</Text>
              <TextInput style={styles.input} placeholder="Barrio o vereda" placeholderTextColor="#6B7280" value={form.barrio_vereda} onChangeText={(v) => setForm((f) => ({ ...f, barrio_vereda: v }))} />

              <Text style={styles.label}>Municipio</Text>
              <TextInput style={styles.input} placeholder="Municipio o ID" placeholderTextColor="#6B7280" value={form.municipio_id} onChangeText={(v) => setForm((f) => ({ ...f, municipio_id: v }))} />

              <Text style={styles.label}>Presidente</Text>
              <TextInput style={styles.input} placeholder="Nombre del presidente" placeholderTextColor="#6B7280" value={form.presidente} onChangeText={(v) => setForm((f) => ({ ...f, presidente: v }))} />

              <Text style={styles.label}>Correo</Text>
              <TextInput style={styles.input} placeholder="correo@ejemplo.com" placeholderTextColor="#6B7280" value={form.correo} onChangeText={(v) => setForm((f) => ({ ...f, correo: v }))} keyboardType="email-address" autoCapitalize="none" />

              <Text style={styles.label}>Teléfono</Text>
              <TextInput style={styles.input} placeholder="Teléfono" placeholderTextColor="#6B7280" value={form.telefono} onChangeText={(v) => setForm((f) => ({ ...f, telefono: v }))} keyboardType="phone-pad" />

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
  listContent: { padding: 16, gap: 10, paddingBottom: 100 },
  item: { backgroundColor: '#1F2937', borderRadius: 14, padding: 14, gap: 6 },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemNombre: { flex: 1, color: '#F9FAFB', fontSize: 15, fontWeight: '700' },
  itemSub: { color: '#9CA3AF', fontSize: 12 },
  editBtn: { alignSelf: 'flex-end', marginTop: 4 },
  editBtnText: { color: '#2563EB', fontSize: 12, fontWeight: '600' },
  emptyBox: { paddingTop: 60, alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  fabIcon: { color: '#FFF', fontSize: 28, fontWeight: '300', marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#111827', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: '#1F2937', borderRadius: 10, padding: 12, color: '#F9FAFB', fontSize: 14, borderWidth: 1, borderColor: '#374151' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#1F2937', alignItems: 'center' },
  cancelBtnText: { color: '#9CA3AF', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#2563EB', alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700' },
});
