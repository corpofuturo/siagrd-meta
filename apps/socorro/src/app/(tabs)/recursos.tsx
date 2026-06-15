import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Switch,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ─── Tipos ───────────────────────────────────────────────────────────────────
type TipoRecurso = 'VEHICULO' | 'PERSONAL' | 'EQUIPO' | 'TODOS';

interface Recurso {
  id: string;
  nombre: string;
  tipo: TipoRecurso;
  placa?: string;
  disponible: boolean;
  descripcion: string;
  municipio_id?: string;
  organismo_id?: string;
}

const API_BASE = 'https://api.satam.corpofuturo.org/api/v1';

// ─── API ──────────────────────────────────────────────────────────────────────
async function fetchRecursos(filtros: { tipo?: TipoRecurso }): Promise<Recurso[]> {
  const token = await SecureStore.getItemAsync('auth_token');
  const params = new URLSearchParams();
  if (filtros.tipo && filtros.tipo !== 'TODOS') {
    params.set('tipo', filtros.tipo);
  }
  const url = `${API_BASE}/recursos${params.toString() ? `?${params}` : ''}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
  return res.json();
}

async function patchRecursoDisponible(id: string, disponible: boolean): Promise<void> {
  const token = await SecureStore.getItemAsync('auth_token');
  const res = await fetch(`${API_BASE}/recursos/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ disponible }),
  });
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
}

const TIPO_ICONOS: Record<TipoRecurso | 'TODOS', string> = {
  TODOS: '📋',
  VEHICULO: '🚒',
  PERSONAL: '👷',
  EQUIPO: '🔧',
};

const TIPO_LABELS: Record<TipoRecurso | 'TODOS', string> = {
  TODOS: 'Todos',
  VEHICULO: 'Vehículos',
  PERSONAL: 'Personal',
  EQUIPO: 'Equipos',
};

// ─── Componente: Filtro de tipo ─────────────────────────────────────────────
function FiltroTipo({
  activo,
  onCambiar,
}: {
  activo: TipoRecurso | 'TODOS';
  onCambiar: (t: TipoRecurso | 'TODOS') => void;
}) {
  const tipos: Array<TipoRecurso | 'TODOS'> = ['TODOS', 'VEHICULO', 'PERSONAL', 'EQUIPO'];
  return (
    <View style={styles.filtros}>
      {tipos.map((t) => (
        <TouchableOpacity
          key={t}
          style={[styles.filtroBtn, activo === t && styles.filtroBtnActivo]}
          onPress={() => onCambiar(t)}
        >
          <Text style={styles.filtroIcon}>{TIPO_ICONOS[t]}</Text>
          <Text style={[styles.filtroLabel, activo === t && styles.filtroLabelActivo]}>
            {TIPO_LABELS[t]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Componente: Item de recurso ─────────────────────────────────────────────
function RecursoItem({
  recurso,
  onToggle,
}: {
  recurso: Recurso;
  onToggle: (id: string, disponible: boolean) => void;
}) {
  return (
    <View style={styles.recursoItem}>
      <View style={styles.recursoIcon}>
        <Text style={{ fontSize: 24 }}>{TIPO_ICONOS[recurso.tipo]}</Text>
      </View>
      <View style={styles.recursoInfo}>
        <Text style={styles.recursoNombre}>{recurso.nombre}</Text>
        {recurso.placa ? (
          <Text style={styles.recursoPlaca}>{recurso.placa}</Text>
        ) : null}
        <Text style={styles.recursoDesc} numberOfLines={1}>
          {recurso.descripcion}
        </Text>
      </View>
      <View style={styles.recursoToggle}>
        <Text style={[styles.estadoLabel, recurso.disponible ? styles.estadoDisp : styles.estadoOcup]}>
          {recurso.disponible ? 'DISPONIBLE' : 'OCUPADO'}
        </Text>
        <Switch
          value={recurso.disponible}
          onValueChange={(val) => onToggle(recurso.id, val)}
          trackColor={{ false: '#374151', true: '#16A34A44' }}
          thumbColor={recurso.disponible ? '#16A34A' : '#6B7280'}
        />
      </View>
    </View>
  );
}

// ─── Pantalla Recursos ─────────────────────────────────────────────────────
/**
 * Lista de recursos del organismo.
 * Toggle disponible/ocupado (PATCH al backend).
 * Filtros por tipo aplicados como query params.
 * Pull-to-refresh.
 */
export default function RecursosScreen() {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [filtro, setFiltro] = useState<TipoRecurso | 'TODOS'>('TODOS');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchRecursos({ tipo: filtro });
      setRecursos(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar recursos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleToggle = async (id: string, disponible: boolean) => {
    // Optimistic update
    setRecursos((prev) =>
      prev.map((r) => (r.id === id ? { ...r, disponible } : r)),
    );
    try {
      await patchRecursoDisponible(id, disponible);
    } catch {
      // Revert on error
      setRecursos((prev) =>
        prev.map((r) => (r.id === id ? { ...r, disponible: !disponible } : r)),
      );
    }
  };

  const disponibles = recursos.filter((r) => r.disponible).length;
  const total = recursos.length;

  return (
    <View style={styles.container}>
      <FiltroTipo activo={filtro} onCambiar={setFiltro} />

      <View style={styles.resumen}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <Text style={styles.resumenText}>
            <Text style={styles.resumenNum}>{disponibles}</Text>
            <Text style={styles.resumenSep}> / {total}</Text>
            {'  '}disponibles
          </Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#3B82F6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={recursos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RecursoItem recurso={item} onToggle={handleToggle} />}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => cargar(true)}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Sin recursos para este filtro.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  filtros: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filtroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E2D45',
  },
  filtroBtnActivo: { borderColor: '#3B82F6', backgroundColor: '#1D4ED822' },
  filtroIcon: { fontSize: 14 },
  filtroLabel: { color: '#718096', fontSize: 12, fontWeight: '600' },
  filtroLabelActivo: { color: '#3B82F6' },
  resumen: { paddingHorizontal: 16, paddingBottom: 8 },
  resumenText: { color: '#718096', fontSize: 13 },
  resumenNum: { color: '#16A34A', fontWeight: '700', fontSize: 16 },
  resumenSep: { color: '#4A5568' },
  errorText: { color: '#EF4444', fontSize: 13 },
  lista: { paddingHorizontal: 16, paddingBottom: 20 },
  recursoItem: {
    backgroundColor: '#111827',
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E2D45',
  },
  recursoIcon: { width: 44, alignItems: 'center' },
  recursoInfo: { flex: 1, marginLeft: 8 },
  recursoNombre: { color: '#F7FAFC', fontSize: 14, fontWeight: '600' },
  recursoPlaca: { color: '#718096', fontSize: 11, marginTop: 1 },
  recursoDesc: { color: '#4A5568', fontSize: 12, marginTop: 2 },
  recursoToggle: { alignItems: 'flex-end', gap: 2 },
  estadoLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  estadoDisp: { color: '#16A34A' },
  estadoOcup: { color: '#6B7280' },
  emptyText: { color: '#4A5568', textAlign: 'center', paddingTop: 40, fontSize: 14 },
});
