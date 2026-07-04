import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, StyleSheet, Platform,
  Alert, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
}

interface Resumen {
  total_socorro: number;
  total_ciudadanos: number;
  total_comites: number;
  total_usuarios: number;
}

type Tab = 'Socorro' | 'Ciudadanos' | 'Comités';
const TABS: Tab[] = ['Socorro', 'Ciudadanos', 'Comités'];

const TAB_ROL: Record<Tab, string> = {
  Socorro: 'SOCORRO',
  Ciudadanos: 'CIUDADANO',
  Comités: 'CDGRD',
};

const ROL_COLORS: Record<string, string> = {
  ADMIN: '#A78BFA', CDGRD: '#F59E0B', SOCORRO: '#22C55E', CIUDADANO: '#374151',
};

async function getHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('satam_access_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function RolBadge({ rol }: { rol: string }) {
  const color = ROL_COLORS[rol] ?? '#374151';
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{rol}</Text>
    </View>
  );
}

const EMPTY_FORM = { email: '', nombre: '', apellido: '', password: '', documento: '', celular: '' };

export default function GruposScreen() {
  const { session } = useAuth();
  const rol = session?.user?.rol;
  const canManage = rol === 'ADMIN' || rol === 'CDGRD';

  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Socorro');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchResumen = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/grupos/resumen`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Resumen = await res.json();
      setResumen(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar resumen');
    } finally {
      setLoadingResumen(false);
    }
  }, []);

  const fetchTab = useCallback(async (tab: Tab) => {
    setLoadingList(true);
    try {
      const headers = await getHeaders();
      const url =
        tab === 'Socorro' ? `${API_BASE}/grupos/socorro` :
        tab === 'Ciudadanos' ? `${API_BASE}/grupos/ciudadanos?limit=20&offset=0` :
        `${API_BASE}/grupos/comites`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : data.data ?? []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar usuarios');
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchResumen(); }, [fetchResumen]);
  useEffect(() => { fetchTab(activeTab); }, [activeTab, fetchTab]);

  const handleRefresh = () => { setRefreshing(true); fetchTab(activeTab); };

  const handleAddUser = async () => {
    if (!form.email.trim() || !form.nombre.trim() || !form.apellido.trim() || !form.password.trim()) {
      Alert.alert('Requerido', 'Email, nombre, apellido y contraseña son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/usuarios`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: form.email.trim(),
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          password: form.password,
          rol: TAB_ROL[activeTab],
          ...(form.documento.trim() ? { documento: form.documento.trim() } : {}),
          ...(form.celular.trim() ? { celular: form.celular.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.detail ?? `HTTP ${res.status}`);
      }
      setModalVisible(false);
      setForm(EMPTY_FORM);
      fetchTab(activeTab);
      fetchResumen();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo agregar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const metricas: { label: string; value: number | undefined; color: string }[] = [
    { label: 'Total Usuarios', value: resumen?.total_usuarios, color: '#4f46e5' },
    { label: 'Socorro', value: resumen?.total_socorro, color: '#22C55E' },
    { label: 'Ciudadanos', value: resumen?.total_ciudadanos, color: '#14532d' },
    { label: 'Comités', value: resumen?.total_comites, color: '#F59E0B' },
  ];

  const renderUser = ({ item }: { item: Usuario }) => (
    <View style={styles.userItem}>
      <View style={styles.userLeft}>
        <Text style={styles.userName}>{item.nombre} {item.apellido}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <RolBadge rol={item.rol} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Grupos de Usuarios</Text>
      </View>

      {loadingResumen ? (
        <View style={styles.metricsRow}>
          <ActivityIndicator size="small" color="#4f46e5" />
        </View>
      ) : (
        <View style={styles.metricsRow}>
          {metricas.map((m) => (
            <View key={m.label} style={[styles.metricCard, { borderTopColor: m.color }]}>
              <Text style={[styles.metricValue, { color: m.color }]}>{m.value ?? '—'}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabBtnText, activeTab === t && styles.tabBtnTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loadingList ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#4f46e5" /></View>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyBox}><Text style={styles.emptyText}>Sin usuarios en este grupo</Text></View>
          }
        />
      )}

      {canManage && (
        <TouchableOpacity style={styles.fab} onPress={() => { setForm(EMPTY_FORM); setModalVisible(true); }} activeOpacity={0.85}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Agregar a {activeTab}</Text>

              <Text style={styles.label}>Email *</Text>
              <TextInput style={styles.input} placeholder="correo@ejemplo.com" placeholderTextColor="#14532d" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} keyboardType="email-address" autoCapitalize="none" />

              <Text style={styles.label}>Nombre *</Text>
              <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor="#14532d" value={form.nombre} onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))} />

              <Text style={styles.label}>Apellido *</Text>
              <TextInput style={styles.input} placeholder="Apellido" placeholderTextColor="#14532d" value={form.apellido} onChangeText={(v) => setForm((f) => ({ ...f, apellido: v }))} />

              <Text style={styles.label}>Documento</Text>
              <TextInput style={styles.input} placeholder="Cédula" placeholderTextColor="#14532d" value={form.documento} onChangeText={(v) => setForm((f) => ({ ...f, documento: v }))} keyboardType="numeric" />

              <Text style={styles.label}>Celular</Text>
              <TextInput style={styles.input} placeholder="Celular" placeholderTextColor="#14532d" value={form.celular} onChangeText={(v) => setForm((f) => ({ ...f, celular: v }))} keyboardType="phone-pad" />

              <Text style={styles.label}>Contraseña *</Text>
              <TextInput style={styles.input} placeholder="Contraseña temporal" placeholderTextColor="#14532d" value={form.password} onChangeText={(v) => setForm((f) => ({ ...f, password: v }))} secureTextEntry />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleAddUser} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Agregar</Text>}
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
  metricsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  metricCard: {
    flex: 1, backgroundColor: '#dcfce7', borderRadius: 12, padding: 10,
    alignItems: 'center', borderTopWidth: 3,
  },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricLabel: { color: '#14532d', fontSize: 10, marginTop: 2, textAlign: 'center' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#dcfce7', alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#4f46e5' },
  tabBtnText: { color: '#14532d', fontSize: 13, fontWeight: '600' },
  tabBtnTextActive: { color: '#FFF' },
  listContent: { padding: 16, gap: 8, paddingBottom: 100 },
  userItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#dcfce7', borderRadius: 12, padding: 12, gap: 10,
  },
  userLeft: { flex: 1 },
  userName: { color: '#0f0a2e', fontSize: 14, fontWeight: '600' },
  userEmail: { color: '#14532d', fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },
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
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#dcfce7', alignItems: 'center' },
  cancelBtnText: { color: '#14532d', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#4f46e5', alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700' },
});
