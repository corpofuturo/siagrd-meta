import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, StyleSheet, ScrollView, Alert, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../../../constants';
import { useAuth } from '../../../hooks/useAuth';

interface Organismo {
  id: string;
  nombre: string;
  tipo: string;
  municipio_nombre?: string;
  correo?: string;
  telefono?: string;
  director_nombre?: string;
  director_apellido?: string;
  director_id?: string;
}

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  documento?: string;
  celular?: string;
  rol: string;
}

async function getHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('satam_access_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const ROL_COLORS: Record<string, string> = {
  ADMIN: '#A78BFA', CDGRD: '#F59E0B', SOCORRO: '#22C55E', CIUDADANO: '#9CA3AF',
};

function RolBadge({ rol }: { rol: string }) {
  const color = ROL_COLORS[rol] ?? '#9CA3AF';
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{rol}</Text>
    </View>
  );
}

export default function OrganismoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const rol = session?.user?.rol;

  const [organismo, setOrganismo] = useState<Organismo | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [documento, setDocumento] = useState('');
  const [celular, setCelular] = useState('');
  const [password, setPassword] = useState('');

  const isAdmin = rol === 'ADMIN' || rol === 'CDGRD';
  const isDirector = organismo?.director_id != null && organismo.director_id === userId;
  const canAddUsers = isAdmin || isDirector;

  const fetchData = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const [resOrg, resUsers] = await Promise.all([
        fetch(`${API_BASE}/organismos/${id}`, { headers }),
        fetch(`${API_BASE}/organismos/${id}/usuarios`, { headers }),
      ]);
      if (!resOrg.ok) throw new Error(`HTTP ${resOrg.status}`);
      const orgData: Organismo = await resOrg.json();
      setOrganismo(orgData);
      if (resUsers.ok) {
        const usersData = await resUsers.json();
        setUsuarios(Array.isArray(usersData) ? usersData : usersData.data ?? []);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar el organismo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = () => { setRefreshing(true); fetchData(); };

  const resetForm = () => { setEmail(''); setNombre(''); setApellido(''); setDocumento(''); setCelular(''); setPassword(''); };

  const handleAddUser = async () => {
    if (!email.trim() || !nombre.trim() || !apellido.trim() || !password.trim()) {
      Alert.alert('Requerido', 'Email, nombre, apellido y contraseña son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/organismos/${id}/usuarios`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: email.trim(), nombre: nombre.trim(), apellido: apellido.trim(), documento, celular, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ?? `HTTP ${res.status}`);
      }
      setModalVisible(false);
      resetForm();
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo agregar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const renderUser = ({ item }: { item: Usuario }) => (
    <View style={styles.userItem}>
      <View style={styles.userLeft}>
        <Text style={styles.userName}>{item.nombre} {item.apellido}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        {item.documento && <Text style={styles.userMeta}>Doc: {item.documento}</Text>}
        {item.celular && <Text style={styles.userMeta}>Cel: {item.celular}</Text>}
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {organismo?.nombre ?? 'Detalle Organismo'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            organismo ? (
              <View style={styles.orgCard}>
                <Text style={styles.orgNombre}>{organismo.nombre}</Text>
                <View style={styles.badge2Row}>
                  <View style={[styles.badge, { backgroundColor: '#2563EB22', borderColor: '#2563EB' }]}>
                    <Text style={[styles.badgeText, { color: '#60A5FA' }]}>{organismo.tipo}</Text>
                  </View>
                </View>
                {organismo.municipio_nombre && <Text style={styles.orgMeta}>📍 {organismo.municipio_nombre}</Text>}
                {organismo.correo && <Text style={styles.orgMeta}>✉️ {organismo.correo}</Text>}
                {organismo.telefono && <Text style={styles.orgMeta}>📞 {organismo.telefono}</Text>}
                {(organismo.director_nombre || organismo.director_apellido) && (
                  <Text style={styles.orgMeta}>
                    Director: {[organismo.director_nombre, organismo.director_apellido].filter(Boolean).join(' ')}
                  </Text>
                )}
                <Text style={styles.usersTitle}>Usuarios ({usuarios.length})</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No hay usuarios en este organismo</Text>
            </View>
          }
        />
      )}

      {canAddUsers && (
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Agregar Usuario</Text>

              <Text style={styles.label}>Email *</Text>
              <TextInput style={styles.input} placeholder="correo@ejemplo.com" placeholderTextColor="#6B7280" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

              <Text style={styles.label}>Nombre *</Text>
              <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor="#6B7280" value={nombre} onChangeText={setNombre} />

              <Text style={styles.label}>Apellido *</Text>
              <TextInput style={styles.input} placeholder="Apellido" placeholderTextColor="#6B7280" value={apellido} onChangeText={setApellido} />

              <Text style={styles.label}>Documento</Text>
              <TextInput style={styles.input} placeholder="Cédula o NIT" placeholderTextColor="#6B7280" value={documento} onChangeText={setDocumento} keyboardType="numeric" />

              <Text style={styles.label}>Celular</Text>
              <TextInput style={styles.input} placeholder="Celular" placeholderTextColor="#6B7280" value={celular} onChangeText={setCelular} keyboardType="phone-pad" />

              <Text style={styles.label}>Contraseña *</Text>
              <TextInput style={styles.input} placeholder="Contraseña temporal" placeholderTextColor="#6B7280" value={password} onChangeText={setPassword} secureTextEntry />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); resetForm(); }}>
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
  listContent: { padding: 16, gap: 8, paddingBottom: 100 },
  orgCard: { backgroundColor: '#1F2937', borderRadius: 14, padding: 16, marginBottom: 16, gap: 6 },
  orgNombre: { color: '#F9FAFB', fontSize: 18, fontWeight: '700' },
  badge2Row: { flexDirection: 'row', marginVertical: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  orgMeta: { color: '#9CA3AF', fontSize: 13 },
  usersTitle: { color: '#F9FAFB', fontSize: 14, fontWeight: '700', marginTop: 10 },
  userItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1F2937', borderRadius: 12, padding: 12, gap: 10,
  },
  userLeft: { flex: 1 },
  userName: { color: '#F9FAFB', fontSize: 14, fontWeight: '600' },
  userEmail: { color: '#9CA3AF', fontSize: 12 },
  userMeta: { color: '#6B7280', fontSize: 11 },
  emptyBox: { paddingTop: 40, alignItems: 'center' },
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
