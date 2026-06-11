import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, StyleSheet, ScrollView, Alert, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../../constants';

interface Config {
  nombre_sistema?: string;
  nombre_departamento?: string;
  codigo_dane?: string;
  ungrd_correo?: string;
  ungrd_url?: string;
}

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

  const fields: { key: keyof Config; label: string; placeholder: string; keyboardType?: 'default' | 'email-address' | 'url' }[] = [
    { key: 'nombre_sistema', label: 'Nombre del Sistema', placeholder: 'SIAGRD Meta' },
    { key: 'nombre_departamento', label: 'Nombre del Departamento', placeholder: 'Meta' },
    { key: 'codigo_dane', label: 'Código DANE', placeholder: '50000' },
    { key: 'ungrd_correo', label: 'Correo UNGRD', placeholder: 'contacto@ungrd.gov.co', keyboardType: 'email-address' },
    { key: 'ungrd_url', label: 'URL UNGRD', placeholder: 'https://ungrd.gov.co', keyboardType: 'url' },
  ];

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
          {fields.map((f) => (
            <View key={f.key}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={f.placeholder}
                placeholderTextColor="#6B7280"
                value={form[f.key] ?? ''}
                onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
                keyboardType={f.keyboardType ?? 'default'}
                autoCapitalize="none"
              />
            </View>
          ))}

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.informeBtn} onPress={handleGenerarInforme} disabled={generando}>
            {generando ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.informeBtnText}>Generar Informe UNGRD</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Modal resultado informe */}
      <Modal visible={informeModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalCard: {
    backgroundColor: '#111827', borderRadius: 16, padding: 20,
    maxHeight: '80%',
  },
  modalTitle: { color: '#F9FAFB', fontSize: 17, fontWeight: '700', marginBottom: 12 },
  jsonScroll: { maxHeight: 400 },
  jsonContent: { paddingBottom: 8 },
  jsonText: { color: '#6EE7B7', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  closeBtn: { marginTop: 16, padding: 14, borderRadius: 10, backgroundColor: '#1F2937', alignItems: 'center' },
  closeBtnText: { color: '#9CA3AF', fontWeight: '600' },
});
