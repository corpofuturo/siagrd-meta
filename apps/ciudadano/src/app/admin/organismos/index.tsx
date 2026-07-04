import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, StyleSheet, ScrollView, Alert, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../../../constants';

interface Organismo {
  id: string;
  nombre: string;
  tipo: string;
  municipio_nombre?: string;
  director_nombre?: string;
  director_apellido?: string;
  correo?: string;
  telefono?: string;
}

const TIPOS = ['BOMBEROS', 'CRUZ_ROJA', 'DEFENSA_CIVIL', 'POLICIA', 'EJERCITO', 'SALUD', 'OTRO'] as const;
type TipoOrganismo = typeof TIPOS[number];

async function getHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('satam_access_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: '#4f46e522', borderColor: '#4f46e5' }]}>
      <Text style={[styles.badgeText, { color: '#4f46e5' }]}>{tipo}</Text>
    </View>
  );
}

export default function OrganismosScreen() {
  const [organismos, setOrganismos] = useState<Organismo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoOrganismo>('BOMBEROS');
  const [municipio, setMunicipio] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');

  const fetchOrganismos = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/organismos`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOrganismos(Array.isArray(data) ? data : data.data ?? []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar organismos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrganismos(); }, [fetchOrganismos]);

  const handleRefresh = () => { setRefreshing(true); fetchOrganismos(); };

  const resetForm = () => { setNombre(''); setTipo('BOMBEROS'); setMunicipio(''); setCorreo(''); setTelefono(''); };

  const handleCreate = async () => {
    if (!nombre.trim()) { Alert.alert('Requerido', 'El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/organismos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nombre: nombre.trim(), tipo, municipio, correo, telefono }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ?? `HTTP ${res.status}`);
      }
      setModalVisible(false);
      resetForm();
      fetchOrganismos();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo crear el organismo');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: Organismo }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => router.push(`/admin/organismos/${item.id}` as any)}
      activeOpacity={0.75}
    >
      <View style={styles.itemTop}>
        <Text style={styles.itemNombre} numberOfLines={1}>{item.nombre}</Text>
        <TipoBadge tipo={item.tipo} />
      </View>
      {item.municipio_nombre && (
        <Text style={styles.itemSub}>📍 {item.municipio_nombre}</Text>
      )}
      {(item.director_nombre || item.director_apellido) && (
        <Text style={styles.itemSub}>
          Director: {[item.director_nombre, item.director_apellido].filter(Boolean).join(' ')}
        </Text>
      )}
      <TouchableOpacity
        style={styles.verBtn}
        onPress={() => router.push(`/admin/organismos/${item.id}` as any)}
      >
        <Text style={styles.verBtnText}>Ver usuarios →</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organismos de Socorro</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={organismos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No hay organismos registrados</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Nuevo Organismo</Text>

              <Text style={styles.label}>Nombre *</Text>
              <TextInput style={styles.input} placeholder="Nombre del organismo" placeholderTextColor="#14532d" value={nombre} onChangeText={setNombre} />

              <Text style={styles.label}>Tipo</Text>
              <View style={styles.tiposGrid}>
                {TIPOS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.tipoBtn, tipo === t && styles.tipoBtnActive]}
                    onPress={() => setTipo(t)}
                  >
                    <Text style={[styles.tipoBtnText, tipo === t && styles.tipoBtnTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Municipio</Text>
              <TextInput style={styles.input} placeholder="Municipio" placeholderTextColor="#14532d" value={municipio} onChangeText={setMunicipio} />

              <Text style={styles.label}>Correo</Text>
              <TextInput style={styles.input} placeholder="correo@ejemplo.com" placeholderTextColor="#14532d" value={correo} onChangeText={setCorreo} keyboardType="email-address" autoCapitalize="none" />

              <Text style={styles.label}>Teléfono</Text>
              <TextInput style={styles.input} placeholder="Teléfono" placeholderTextColor="#14532d" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Crear</Text>}
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
  verBtn: { alignSelf: 'flex-end', marginTop: 4 },
  verBtnText: { color: '#4f46e5', fontSize: 12, fontWeight: '600' },
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
  tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipoBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#c7d2fe' },
  tipoBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  tipoBtnText: { color: '#14532d', fontSize: 12 },
  tipoBtnTextActive: { color: '#FFF', fontWeight: '700' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#dcfce7', alignItems: 'center' },
  cancelBtnText: { color: '#14532d', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#4f46e5', alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700' },
});
