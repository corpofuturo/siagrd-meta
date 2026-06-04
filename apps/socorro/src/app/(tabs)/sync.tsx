import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { database, Incidente, Actualizacion, ArchivoPendiente } from '../../database';
import { sincronizar } from '../../services/sync.service';

interface ContadoresPendientes {
  incidentes: number;
  actualizaciones: number;
  archivos: number;
  errores: number;
}

async function obtenerContadores(): Promise<ContadoresPendientes> {
  const incidentes = await database.get<Incidente>('incidentes').query().fetch();
  const actualizaciones = await database.get<Actualizacion>('actualizaciones').query().fetch();
  const archivos = await database.get<ArchivoPendiente>('archivos_pendientes').query().fetch();

  return {
    incidentes: incidentes.filter((i) => !i.synced).length,
    actualizaciones: actualizaciones.filter((a) => !a.synced).length,
    archivos: archivos.filter((a) => !a.subido).length,
    errores:
      incidentes.filter((i) => !!i.syncError).length +
      archivos.filter((a) => !!a.error).length,
  };
}

interface ItemFallido {
  id: string;
  descripcion: string;
  error: string;
  tipo: 'incidente' | 'archivo';
}

async function obtenerItemsFallidos(): Promise<ItemFallido[]> {
  const incidentes = await database.get<Incidente>('incidentes').query().fetch();
  const archivos = await database.get<ArchivoPendiente>('archivos_pendientes').query().fetch();

  const fallidos: ItemFallido[] = [];

  for (const i of incidentes.filter((x) => !!x.syncError)) {
    fallidos.push({
      id: i.id,
      descripcion: i.titulo,
      error: i.syncError ?? 'Error desconocido',
      tipo: 'incidente',
    });
  }

  for (const a of archivos.filter((x) => !!x.error)) {
    fallidos.push({
      id: a.id,
      descripcion: `Foto: ${a.uriLocal.split('/').pop() ?? a.id}`,
      error: a.error ?? 'Error desconocido',
      tipo: 'archivo',
    });
  }

  return fallidos;
}

async function reintentar(item: ItemFallido): Promise<void> {
  if (item.tipo === 'incidente') {
    const incidente = await database.get<Incidente>('incidentes').find(item.id);
    await database.write(async () => {
      await incidente.update((i) => {
        i.syncError = null;
        i.synced = false;
      });
    });
  } else {
    const archivo = await database.get<ArchivoPendiente>('archivos_pendientes').find(item.id);
    await database.write(async () => {
      await archivo.update((a) => {
        a.error = null;
        a.subido = false;
      });
    });
  }
  await sincronizar();
}

/**
 * Pantalla de estado de sincronización.
 * Muestra contadores de elementos pendientes, errores y estado de conectividad.
 */
export default function SyncScreen() {
  const [contadores, setContadores] = useState<ContadoresPendientes>({
    incidentes: 0,
    actualizaciones: 0,
    archivos: 0,
    errores: 0,
  });
  const [fallidos, setFallidos] = useState<ItemFallido[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSync, setUltimaSync] = useState<Date | null>(null);

  const cargarDatos = useCallback(async () => {
    const [cnt, falls] = await Promise.all([obtenerContadores(), obtenerItemsFallidos()]);
    setContadores(cnt);
    setFallidos(falls);
  }, []);

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(cargarDatos, 5000);
    return () => clearInterval(interval);
  }, [cargarDatos]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsConnected(!!state.isConnected);
    });
    return unsub;
  }, []);

  const handleSincronizar = async () => {
    if (!isConnected) {
      Alert.alert('Sin conexión', 'No hay conexión a internet disponible.');
      return;
    }
    setSincronizando(true);
    try {
      await sincronizar();
      setUltimaSync(new Date());
      await cargarDatos();
    } catch {
      Alert.alert('Error', 'No se pudo completar la sincronización.');
    } finally {
      setSincronizando(false);
    }
  };

  const handleReintentar = async (item: ItemFallido) => {
    try {
      await reintentar(item);
      await cargarDatos();
    } catch {
      Alert.alert('Error', 'No se pudo reintentar. Intenta más tarde.');
    }
  };

  const totalPendiente = contadores.incidentes + contadores.actualizaciones + contadores.archivos;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Estado de conexión */}
      <View style={[styles.conexionBanner, isConnected ? styles.conectado : styles.desconectado]}>
        <Text style={styles.conexionIcon}>{isConnected ? '🟢' : '🔴'}</Text>
        <Text style={styles.conexionText}>
          {isConnected ? 'Conectado a internet' : 'Sin conexión — modo offline'}
        </Text>
      </View>

      {/* Contadores */}
      <Text style={styles.seccion}>Cola de Sincronización</Text>
      <View style={styles.contadoresGrid}>
        <View style={styles.contadorCard}>
          <Text style={styles.contadorNum}>{contadores.incidentes}</Text>
          <Text style={styles.contadorLabel}>Incidentes</Text>
        </View>
        <View style={styles.contadorCard}>
          <Text style={styles.contadorNum}>{contadores.actualizaciones}</Text>
          <Text style={styles.contadorLabel}>Actualizaciones</Text>
        </View>
        <View style={styles.contadorCard}>
          <Text style={styles.contadorNum}>{contadores.archivos}</Text>
          <Text style={styles.contadorLabel}>Fotos</Text>
        </View>
        <View style={[styles.contadorCard, contadores.errores > 0 && styles.contadorError]}>
          <Text style={[styles.contadorNum, contadores.errores > 0 && { color: '#FF3B30' }]}>
            {contadores.errores}
          </Text>
          <Text style={styles.contadorLabel}>Errores</Text>
        </View>
      </View>

      {/* Última sincronización */}
      {ultimaSync && (
        <Text style={styles.ultimaSync}>
          Última sync: {ultimaSync.toLocaleTimeString('es-CO')}
        </Text>
      )}

      {/* Botón sincronizar */}
      <TouchableOpacity
        style={[
          styles.syncBtn,
          (!isConnected || sincronizando) && styles.syncBtnDisabled,
          totalPendiente === 0 && styles.syncBtnSinPendiente,
        ]}
        onPress={handleSincronizar}
        disabled={!isConnected || sincronizando}
        activeOpacity={0.8}
      >
        {sincronizando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.syncBtnIcon}>🔄</Text>
            <Text style={styles.syncBtnText}>
              {totalPendiente > 0
                ? `SINCRONIZAR AHORA (${totalPendiente})`
                : 'TODO SINCRONIZADO'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Items fallidos con reintentar */}
      {fallidos.length > 0 && (
        <>
          <Text style={styles.seccion}>Items con Error</Text>
          {fallidos.map((item) => (
            <View key={item.id} style={styles.fallidoItem}>
              <View style={styles.fallidoInfo}>
                <Text style={styles.fallidoTipo}>
                  {item.tipo === 'incidente' ? '📋 Incidente' : '📷 Foto'}
                </Text>
                <Text style={styles.fallidoDesc} numberOfLines={1}>
                  {item.descripcion}
                </Text>
                <Text style={styles.fallidoError} numberOfLines={2}>
                  {item.error}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.reintentarBtn, !isConnected && styles.reintentarBtnDisabled]}
                onPress={() => handleReintentar(item)}
                disabled={!isConnected}
              >
                <Text style={styles.reintentarText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  scroll: { padding: 16, paddingBottom: 40 },

  conexionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  conectado: { backgroundColor: '#16A34A22', borderColor: '#16A34A' },
  desconectado: { backgroundColor: '#7C3AED22', borderColor: '#7C3AED' },
  conexionIcon: { fontSize: 14 },
  conexionText: { color: '#E2E8F0', fontSize: 14, fontWeight: '600' },

  seccion: { color: '#718096', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },

  contadoresGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  contadorCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E2D45',
  },
  contadorError: { borderColor: '#FF3B3044' },
  contadorNum: { color: '#F7FAFC', fontSize: 24, fontWeight: '800' },
  contadorLabel: { color: '#718096', fontSize: 11, fontWeight: '600', marginTop: 2 },

  ultimaSync: { color: '#4A5568', fontSize: 12, textAlign: 'center', marginBottom: 12 },

  syncBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  syncBtnDisabled: { opacity: 0.5 },
  syncBtnSinPendiente: { backgroundColor: '#16A34A' },
  syncBtnIcon: { fontSize: 18 },
  syncBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  fallidoItem: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B3033',
  },
  fallidoInfo: { flex: 1, marginRight: 10 },
  fallidoTipo: { color: '#718096', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  fallidoDesc: { color: '#E2E8F0', fontSize: 13, fontWeight: '600' },
  fallidoError: { color: '#FF3B30', fontSize: 11, marginTop: 2 },
  reintentarBtn: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  reintentarBtnDisabled: { opacity: 0.4 },
  reintentarText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
