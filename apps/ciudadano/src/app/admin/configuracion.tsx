import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, StyleSheet, ScrollView, Alert, Platform, FlatList,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from '../../constants';

interface Config {
  nombre_sistema?: string;
  nombre_departamento?: string;
  codigo_dane?: string;
  ungrd_correo?: string;
  ungrd_url?: string;
}

interface Departamento {
  codigo: string;
  nombre: string;
}

const DEPARTAMENTOS: Departamento[] = [
  { codigo: '05', nombre: 'Antioquia' },
  { codigo: '08', nombre: 'Atlántico' },
  { codigo: '11', nombre: 'Bogotá D.C.' },
  { codigo: '13', nombre: 'Bolívar' },
  { codigo: '15', nombre: 'Boyacá' },
  { codigo: '17', nombre: 'Caldas' },
  { codigo: '18', nombre: 'Caquetá' },
  { codigo: '19', nombre: 'Cauca' },
  { codigo: '20', nombre: 'Cesar' },
  { codigo: '27', nombre: 'Chocó' },
  { codigo: '23', nombre: 'Córdoba' },
  { codigo: '25', nombre: 'Cundinamarca' },
  { codigo: '94', nombre: 'Guainía' },
  { codigo: '95', nombre: 'Guaviare' },
  { codigo: '41', nombre: 'Huila' },
  { codigo: '44', nombre: 'La Guajira' },
  { codigo: '47', nombre: 'Magdalena' },
  { codigo: '50', nombre: 'Meta' },
  { codigo: '52', nombre: 'Nariño' },
  { codigo: '54', nombre: 'Norte de Santander' },
  { codigo: '86', nombre: 'Putumayo' },
  { codigo: '63', nombre: 'Quindío' },
  { codigo: '66', nombre: 'Risaralda' },
  { codigo: '88', nombre: 'San Andrés y Providencia' },
  { codigo: '68', nombre: 'Santander' },
  { codigo: '70', nombre: 'Sucre' },
  { codigo: '73', nombre: 'Tolima' },
  { codigo: '76', nombre: 'Valle del Cauca' },
  { codigo: '81', nombre: 'Arauca' },
  { codigo: '85', nombre: 'Casanare' },
  { codigo: '97', nombre: 'Vaupés' },
  { codigo: '99', nombre: 'Vichada' },
  { codigo: '91', nombre: 'Amazonas' },
];

async function getHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('satam_access_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export default function ConfiguracionScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [form, setForm] = useState<Config>({});
  const [informeModal, setInformeModal] = useState(false);
  const [informeData, setInformeData] = useState<string>('');
  const [deptModal, setDeptModal] = useState(false);
  const [deptFiltro, setDeptFiltro] = useState('');

  const fetchConfig = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/configuracion`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Config = await res.json();
      setForm(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/configuracion`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ?? `HTTP ${res.status}`);
      }
      Alert.alert('Guardado', 'Configuración actualizada correctamente');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerarInforme = async () => {
    setGenerando(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/configuracion/informe-ungrd`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setInformeData(JSON.stringify(data, null, 2));
      setInformeModal(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo generar el informe');
    } finally {
      setGenerando(false);
    }
  };

  const deptosFiltrados = deptFiltro.trim()
    ? DEPARTAMENTOS.filter((d) => d.nombre.toLowerCase().includes(deptFiltro.toLowerCase()))
    : DEPARTAMENTOS;

  const seleccionarDepartamento = (dept: Departamento) => {
    setForm((f) => ({ ...f, nombre_departamento: dept.nombre, codigo_dane: dept.codigo + '000' }));
    setDeptModal(false);
    setDeptFiltro('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración del Sistema</Text>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#2563EB" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>

          <Text style={styles.label}>Nombre del Sistema</Text>
          <TextInput
            style={styles.input}
            placeholder="SIAGRD Meta"
            placeholderTextColor="#6B7280"
            value={form.nombre_sistema ?? ''}
            onChangeText={(v) => setForm((f) => ({ ...f, nombre_sistema: v }))}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Departamento</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => { setDeptFiltro(''); setDeptModal(true); }}>
            <Ionicons name="map-outline" size={16} color={form.nombre_departamento ? '#F9FAFB' : '#6B7280'} />
            <Text style={[styles.pickerBtnText, !form.nombre_departamento && styles.pickerBtnPlaceholder]}>
              {form.nombre_departamento ?? 'Seleccionar departamento'}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#6B7280" />
          </TouchableOpacity>

          <Text style={styles.label}>Código DANE</Text>
          <TextInput
            style={styles.input}
            placeholder="50000"
            placeholderTextColor="#6B7280"
            value={form.codigo_dane ?? ''}
            onChangeText={(v) => setForm((f) => ({ ...f, codigo_dane: v }))}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Correo UNGRD</Text>
          <TextInput
            style={styles.input}
            placeholder="contacto@ungrd.gov.co"
            placeholderTextColor="#6B7280"
            value={form.ungrd_correo ?? ''}
            onChangeText={(v) => setForm((f) => ({ ...f, ungrd_correo: v }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>URL UNGRD</Text>
          <TextInput
            style={styles.input}
            placeholder="https://ungrd.gov.co"
            placeholderTextColor="#6B7280"
            value={form.ungrd_url ?? ''}
            onChangeText={(v) => setForm((f) => ({ ...f, ungrd_url: v }))}
            keyboardType="url"
            autoCapitalize="none"
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.informeBtn} onPress={handleGenerarInforme} disabled={generando}>
            {generando ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.informeBtnText}>Generar Informe UNGRD</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Modal departamentos */}
      <Modal visible={deptModal} animationType="slide" transparent onRequestClose={() => setDeptModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar departamento</Text>
              <TouchableOpacity onPress={() => setDeptModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.buscadorRow}>
              <Ionicons name="search-outline" size={16} color="#6B7280" />
              <TextInput
                style={styles.buscadorInput}
                placeholder="Buscar..."
                placeholderTextColor="#6B7280"
                value={deptFiltro}
                onChangeText={setDeptFiltro}
                autoFocus
              />
            </View>

            <FlatList
              data={deptosFiltrados}
              keyExtractor={(item) => item.codigo}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.deptItem, item.nombre === form.nombre_departamento && styles.deptItemActivo]}
                  onPress={() => seleccionarDepartamento(item)}
                >
                  <Text style={[styles.deptItemText, item.nombre === form.nombre_departamento && styles.deptItemTextActivo]}>
                    {item.nombre}
                  </Text>
                  <Text style={styles.deptCodigo}>{item.codigo}</Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.separador} />}
            />
          </View>
        </View>
      </Modal>

      {/* Modal resultado informe */}
      <Modal visible={informeModal} animationType="fade" transparent>
        <View style={styles.informeOverlay}>
          <View style={styles.informeCard}>
            <Text style={styles.modalTitle}>Informe UNGRD</Text>
            <ScrollView style={styles.jsonScroll} contentContainerStyle={styles.jsonContent}>
              <Text style={styles.jsonText}>{informeData}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setInformeModal(false)}>
              <Text style={styles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
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
  content: { padding: 20, gap: 4, paddingBottom: 60 },
  label: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 14 },
  input: {
    backgroundColor: '#1F2937', borderRadius: 10, padding: 12,
    color: '#F9FAFB', fontSize: 14, borderWidth: 1, borderColor: '#374151',
  },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1F2937', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#374151',
  },
  pickerBtnText: { flex: 1, color: '#F9FAFB', fontSize: 14 },
  pickerBtnPlaceholder: { color: '#6B7280' },
  saveBtn: {
    marginTop: 28, padding: 16, borderRadius: 12,
    backgroundColor: '#2563EB', alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  informeBtn: {
    marginTop: 12, padding: 16, borderRadius: 12,
    backgroundColor: '#0D9488', alignItems: 'center',
  },
  informeBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  // Modal departamentos
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#111827', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#1F2937',
  },
  modalTitle: { color: '#F9FAFB', fontSize: 17, fontWeight: '700' },
  buscadorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1F2937', borderRadius: 10, borderWidth: 1, borderColor: '#374151',
    marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12,
  },
  buscadorInput: { flex: 1, color: '#F9FAFB', fontSize: 14, paddingVertical: 10 },
  deptItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  deptItemActivo: { backgroundColor: '#1E3A5F' },
  deptItemText: { color: '#F9FAFB', fontSize: 15, flex: 1 },
  deptItemTextActivo: { color: '#60A5FA', fontWeight: '600' },
  deptCodigo: { color: '#6B7280', fontSize: 12, marginLeft: 8 },
  separador: { height: 1, backgroundColor: '#1F2937', marginHorizontal: 16 },

  // Modal informe
  informeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  informeCard: { backgroundColor: '#111827', borderRadius: 16, padding: 20, maxHeight: '80%' },
  jsonScroll: { maxHeight: 400 },
  jsonContent: { paddingBottom: 8 },
  jsonText: { color: '#6EE7B7', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  closeBtn: { marginTop: 16, padding: 14, borderRadius: 10, backgroundColor: '#1F2937', alignItems: 'center' },
  closeBtnText: { color: '#9CA3AF', fontWeight: '600' },
});
