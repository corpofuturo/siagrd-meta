import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, StyleSheet, ScrollView, Alert, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../../constants';

interface Alcaldia {
  id: string;
  nombre: string;
  municipio_nombre?: string;
  municipio_id?: string;
  lider_nombre?: string;
  lider_apellido?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
}

async function getHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('satam_access_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export default function AlcaldiasScreen() {
  const [alcaldias, setAlcaldias] = useState<Alcaldia[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [nombre, setNombre] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');

  const fetchAlcaldias = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/alcaldias`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAlcaldias(Array.isArray(data) ? data : data.data ?? []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar alcaldías');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAlcaldias(); }, [fetchAlcaldias]);

  const handleRefresh = () => { setRefreshing(true); fetchAlcaldias(); };

  const resetForm = () => { setNombre(''); setMunicipio(''); setCorreo(''); setTelefono(''); setDireccion(''); };

  const handleCreate = async () => {
    if (!nombre.trim()) { Alert.alert('Requerido', 'El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/alcaldias`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nombre: nombre.trim(), correo, telefono, direccion }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ?? `HTTP ${res.status}`);
      }
      setModalVisible(false);
      resetForm();
      fetchAlcaldias();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo crear la alcaldía');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: Alcaldia }) => (
    <View style={styles.item}>
      <View style={styles.itemTop}>
        <Text style={styles.itemNombre} numberOfLines={1}>{item.nombre}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ALCALDÍA</Text>
        </View>
      </View>
      {item.municipio_nombre && (
        <Text style={styles.itemSub}>📍 {item.municipio_nombre}</Text>
      )}
      {(item.lider_nombre || item.lider_apellido) && (
        <Text style={styles.itemSub}>
          Líder: {[item.lider_nombre, item.lider_apellido].filter(Boolean).join(' ')}
        </Text>
      )}
      {item.correo && <Text style={styles.itemSub}>✉️ {item.correo}</Text>}
      {item.telefono && <Text style={styles.itemSub}>📞 {item.telefono}</Text>}
      {item.direccion && <Text style={styles.itemSub}>🏢 {item.direccion}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alcaldías</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={alcaldias}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No hay alcaldías registradas</Text>
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
              <Text style={styles.modalTitle}>Nueva Alcaldía</Text>

              <Text style={styles.label}>Nombre *</Text>
              <TextInput style={styles.input} placeholder="Nombre de la alcaldía" placeholderTextColor="#6B7280" value={nombre} onChangeText={setNombre} />

              <Text style={styles.label}>Municipio</Text>
              <TextInput style={styles.input} placeholder="Municipio" placeholderTextColor="#6B7280" value={municipio} onChangeText={setMunicipio} />

              <Text style={styles.label}>Correo</Text>
              <TextInput style={styles.input} placeholder="correo@alcaldia.gov.co" placeholderTextColor="#6B7280" value={correo} onChangeText={setCorreo} keyboardType="email-address" autoCapitalize="none" />

              <Text style={styles.label}>Teléfono</Text>
              <TextInput style={styles.input} placeholder="Teléfono" placeholderTextColor="#6B7280" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />

              <Text style={styles.label}>Dirección</Text>
              <TextInput style={styles.input} placeholder="Dirección de la alcaldía" placeholderTextColor="#6B7280" value={direccion} onChangeText={setDireccion} />

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
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemNombre: { flex: 1, color: '#F9FAFB', fontSize: 15, fontWeight: '700' },
  itemSub: { color: '#9CA3AF', fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, backgroundColor: '#D9770622', borderColor: '#D97706' },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FBBF24' },
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
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#1F2937', alignItems: 'center' },
  cancelBtnText: { color: '#9CA3AF', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#2563EB', alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700' },
});
