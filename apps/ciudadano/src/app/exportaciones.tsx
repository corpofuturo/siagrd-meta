import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../constants';

// expo-file-system and expo-sharing are optional — we degrade gracefully
let FileSystem: typeof import('expo-file-system') | null = null;
let Sharing: typeof import('expo-sharing') | null = null;

try {
  FileSystem = require('expo-file-system');
} catch {
  FileSystem = null;
}
try {
  Sharing = require('expo-sharing');
} catch {
  Sharing = null;
}

interface ExportButton {
  label: string;
  path: string;
  filename: string;
}

const EXPORTS: ExportButton[] = [
  {
    label: 'Exportar incidentes CSV',
    path: '/exportaciones/incidentes?formato=csv',
    filename: 'incidentes.csv',
  },
  {
    label: 'Exportar damnificados CSV',
    path: '/exportaciones/damnificados?formato=csv',
    filename: 'damnificados.csv',
  },
];

async function downloadAndShare(path: string, filename: string) {
  const token = await SecureStore.getItemAsync('satam_access_token');
  const url = `${API_BASE}${path}`;

  if (!FileSystem || !Sharing) {
    Alert.alert(
      'Módulos no instalados',
      `Instala expo-file-system y expo-sharing, o copia la URL manualmente:\n\n${url}`,
      [{ text: 'OK' }]
    );
    return;
  }

  const dest = `${FileSystem.cacheDirectory}${filename}`;
  const result = await FileSystem.downloadAsync(url, dest, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
  });

  if (result.status !== 200) {
    throw new Error(`HTTP ${result.status}`);
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    Alert.alert('Compartir no disponible', `Archivo guardado en:\n${dest}`);
    return;
  }

  await Sharing.shareAsync(dest, {
    mimeType: 'text/csv',
    dialogTitle: filename,
  });
}

export default function ExportacionesScreen() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (item: ExportButton) => {
    setLoading(item.path);
    try {
      await downloadAndShare(item.path, item.filename);
    } catch (e: unknown) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Error al exportar.'
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exportaciones</Text>
      </View>

      <View style={styles.content}>
        {!FileSystem || !Sharing ? (
          <View style={styles.warnCard}>
            <Text style={styles.warnTitle}>Módulos opcionales no instalados</Text>
            <Text style={styles.warnText}>
              Para descargar archivos instala:{'\n'}
              {'  '}npx expo install expo-file-system expo-sharing{'\n\n'}
              Al tocar los botones se mostrará la URL para copiar.
            </Text>
          </View>
        ) : null}

        {EXPORTS.map((item) => (
          <TouchableOpacity
            key={item.path}
            style={[styles.exportBtn, loading === item.path && styles.exportBtnDisabled]}
            onPress={() => handleExport(item)}
            disabled={loading !== null}
            activeOpacity={0.75}
          >
            {loading === item.path ? (
              <ActivityIndicator size="small" color="#0f0a2e" />
            ) : (
              <Text style={styles.exportIcon}>📥</Text>
            )}
            <Text style={styles.exportLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2ff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#eef2ff',
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
    gap: 10,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: '#4f46e5', fontWeight: '700' },
  headerTitle: { flex: 1, color: '#0f0a2e', fontSize: 17, fontWeight: '700' },
  content: { padding: 16, gap: 12 },
  warnCard: {
    backgroundColor: '#F59E0B22',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 6,
  },
  warnTitle: { color: '#F59E0B', fontSize: 14, fontWeight: '700' },
  warnText: { color: '#D1D5DB', fontSize: 13, lineHeight: 20 },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 14,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportIcon: { fontSize: 26 },
  exportLabel: { color: '#0f0a2e', fontSize: 15, fontWeight: '600', flex: 1 },
});
