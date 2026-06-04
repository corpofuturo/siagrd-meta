import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';

// ─── Tipos ───────────────────────────────────────────────────────────────────
type TipoRecurso = 'VEHICULO' | 'PERSONAL' | 'EQUIPO' | 'TODOS';

interface Recurso {
  id: string;
  nombre: string;
  tipo: TipoRecurso;
  placa?: string;
  disponible: boolean;
  descripcion: string;
}

// Datos mock — en producción vendrían de WatermelonDB / API
const RECURSOS_MOCK: Recurso[] = [
  { id: '1', nombre: 'Camión Cisterna 01', tipo: 'VEHICULO', placa: 'ABC-123', disponible: true, descripcion: 'Capacidad 5000L' },
  { id: '2', nombre: 'Ambulancia 02', tipo: 'VEHICULO', placa: 'DEF-456', disponible: false, descripcion: 'BASIC + paramédico' },
  { id: '3', nombre: 'Brigada Alpha', tipo: 'PERSONAL', disponible: true, descripcion: '6 personas certificadas búsqueda y rescate' },
  { id: '4', nombre: 'Brigada Beta', tipo: 'PERSONAL', disponible: false, descripcion: '4 personas en turno descanso' },
  { id: '5', nombre: 'Motosierra Industrial', tipo: 'EQUIPO', disponible: true, descripcion: 'Stihl MS 661' },
  { id: '6', nombre: 'Generador 15kVA', tipo: 'EQUIPO', disponible: true, descripcion: 'Honda, 72h autonomía' },
  { id: '7', nombre: 'Bote de rescate', tipo: 'EQUIPO', disponible: false, descripcion: 'En mantenimiento' },
];

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
 * Toggle disponible/ocupado.
 * Filtros por tipo.
 * En producción los datos provienen de WatermelonDB / API.
 */
export default function RecursosScreen() {
  const [recursos, setRecursos] = useState<Recurso[]>(RECURSOS_MOCK);
  const [filtro, setFiltro] = useState<TipoRecurso | 'TODOS'>('TODOS');

  const handleToggle = (id: string, disponible: boolean) => {
    setRecursos((prev) =>
      prev.map((r) => (r.id === id ? { ...r, disponible } : r)),
    );
  };

  const recursosFiltrados =
    filtro === 'TODOS' ? recursos : recursos.filter((r) => r.tipo === filtro);

  const disponibles = recursosFiltrados.filter((r) => r.disponible).length;
  const total = recursosFiltrados.length;

  return (
    <View style={styles.container}>
      <FiltroTipo activo={filtro} onCambiar={setFiltro} />

      <View style={styles.resumen}>
        <Text style={styles.resumenText}>
          <Text style={styles.resumenNum}>{disponibles}</Text>
          <Text style={styles.resumenSep}> / {total}</Text>
          {'  '}disponibles
        </Text>
      </View>

      <FlatList
        data={recursosFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RecursoItem recurso={item} onToggle={handleToggle} />}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Sin recursos para este filtro.</Text>
        }
      />
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
