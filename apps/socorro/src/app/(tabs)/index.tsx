import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { withObservables } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';
import { database, Incidente, AlertaCache } from '../../database';

// ─── Colores por nivel de alerta ───────────────────────────────────────────
const NIVEL_COLORES: Record<string, string> = {
  ROJO: '#FF3B30',
  NARANJA: '#FF9500',
  AMARILLO: '#FFCC00',
  VERDE: '#34C759',
};

const NIVEL_LABELS: Record<string, string> = {
  ROJO: 'ALERTA ROJA',
  NARANJA: 'ALERTA NARANJA',
  AMARILLO: 'ALERTA AMARILLA',
  VERDE: 'ALERTA VERDE',
};

// ─── Componente: Banner de nivel de alerta ─────────────────────────────────
function NivelAlertaHeader({ alertas }: { alertas: AlertaCache[] }) {
  const alertaActiva = alertas.find((a) => a.activa);

  if (!alertaActiva) {
    return (
      <View style={[styles.alertaHeader, { backgroundColor: '#1A2035' }]}>
        <Text style={styles.alertaText}>Sin alertas activas</Text>
      </View>
    );
  }

  const color = NIVEL_COLORES[alertaActiva.nivel] ?? '#2563EB';
  const label = NIVEL_LABELS[alertaActiva.nivel] ?? alertaActiva.nivel;

  return (
    <View style={[styles.alertaHeader, { backgroundColor: color + '22', borderColor: color }]}>
      <View style={[styles.alertaDot, { backgroundColor: color }]} />
      <Text style={[styles.alertaLabel, { color }]}>{label}</Text>
      <Text style={styles.alertaTitulo}>{alertaActiva.titulo}</Text>
    </View>
  );
}

// ─── Componente: Banner offline ────────────────────────────────────────────
function OfflineBanner({ isOffline }: { isOffline: boolean }) {
  if (!isOffline) return null;
  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineText}>SIN CONEXION — Modo Offline</Text>
    </View>
  );
}

// ─── Componente: Item de incidente ─────────────────────────────────────────
function IncidenteItem({ incidente }: { incidente: Incidente }) {
  const router = useRouter();
  const color = NIVEL_COLORES[incidente.nivelAlerta] ?? '#4A5568';

  return (
    <TouchableOpacity
      style={styles.incidenteItem}
      onPress={() => router.push(`/incidente/${incidente.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.incidenteNivel, { backgroundColor: color }]} />
      <View style={styles.incidenteContent}>
        <View style={styles.incidenteRow}>
          <Text style={styles.incidenteCodigo}>{incidente.codigo}</Text>
          {!incidente.synced && (
            <View style={styles.syncPending}>
              <Text style={styles.syncPendingText}>pendiente</Text>
            </View>
          )}
        </View>
        <Text style={styles.incidenteTitulo} numberOfLines={1}>
          {incidente.titulo}
        </Text>
        <Text style={styles.incidenteMeta}>
          {incidente.tipoAmenaza} · {incidente.estado}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── HomeScreen base ────────────────────────────────────────────────────────
interface HomeScreenProps {
  incidentes: Incidente[];
  alertas: AlertaCache[];
}

function HomeScreenBase({ incidentes, alertas }: HomeScreenProps) {
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return unsubscribe;
  }, []);

  const alertaActiva = alertas.find((a) => a.activa);
  const fabColor = alertaActiva
    ? (NIVEL_COLORES[alertaActiva.nivel] ?? '#2563EB')
    : '#2563EB';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />

      <NivelAlertaHeader alertas={alertas} />
      <OfflineBanner isOffline={isOffline} />

      <FlatList
        data={incidentes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <IncidenteItem incidente={item} />}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <Text style={styles.seccionTitulo}>Incidentes Recientes</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Sin incidentes activos en tu zona</Text>
          </View>
        }
      />

      {/* FAB Nuevo Incidente — 72dp, cumple regla de 3 toques */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: fabColor }]}
        onPress={() => router.push('/nuevo-incidente')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabLabel}>NUEVO INCIDENTE</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── HOC reactivo WatermelonDB ──────────────────────────────────────────────
const enhance = withObservables([], () => ({
  incidentes: database
    .get<Incidente>('incidentes')
    .query(Q.sortBy('created_at_local', Q.desc), Q.take(10))
    .observe(),
  alertas: database.get<AlertaCache>('alertas_cache').query(Q.where('activa', true)).observe(),
}));

export default enhance(HomeScreenBase);

// ─── Estilos ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  alertaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#1E2D45',
    gap: 8,
  },
  alertaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  alertaLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  alertaTitulo: {
    color: '#A0AEC0',
    fontSize: 12,
    flex: 1,
  },
  alertaText: {
    color: '#4A5568',
    fontSize: 13,
  },
  offlineBanner: {
    backgroundColor: '#7C3AED',
    paddingVertical: 6,
    alignItems: 'center',
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  lista: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  seccionTitulo: {
    color: '#718096',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  incidenteItem: {
    backgroundColor: '#111827',
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E2D45',
  },
  incidenteNivel: {
    width: 4,
  },
  incidenteContent: {
    flex: 1,
    padding: 12,
  },
  incidenteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  incidenteCodigo: {
    color: '#718096',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  syncPending: {
    backgroundColor: '#F59E0B22',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  syncPendingText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '600',
  },
  incidenteTitulo: {
    color: '#F7FAFC',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  incidenteMeta: {
    color: '#718096',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#4A5568',
    fontSize: 15,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    height: 72,
    paddingHorizontal: 24,
    borderRadius: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
  fabLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
