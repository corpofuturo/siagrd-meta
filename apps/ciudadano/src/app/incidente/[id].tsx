import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LeafletMap from '../../components/LeafletMap';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../../constants';

const BACKEND = API_BASE;

type EstadoIncidente =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'EN_CURSO'
  | 'CONTROLADO'
  | 'CERRADO'
  | 'FALSO_POSITIVO'
  | 'CANCELADO';

type NivelIncidente = 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO';

interface Incidente {
  id: number | string;
  codigo: string;
  titulo: string;
  tipo_amenaza: string;
  estado: EstadoIncidente;
  nivel_alerta: NivelIncidente;
  descripcion?: string;
  fecha_inicio?: string;
  municipio_nombre?: string;
  lat?: number | string;
  lng?: number | string;
  municipio_lat?: number | string;
  municipio_lon?: number | string;
}

interface Actualizacion {
  id: number | string;
  texto: string;
  nombre?: string;
  apellido?: string;
  created_at: string;
}

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: '#6B7280',
  CONFIRMADO: '#3B82F6',
  EN_CURSO: '#F59E0B',
  CONTROLADO: '#22C55E',
  CERRADO: '#4B5563',
  FALSO_POSITIVO: '#9CA3AF',
  CANCELADO: '#9CA3AF',
};

const NIVEL_COLORS: Record<string, string> = {
  VERDE: '#22C55E',
  AMARILLO: '#EAB308',
  NARANJA: '#F97316',
  ROJO: '#EF4444',
};

function formatFecha(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '33', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export default function IncidenteDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [incidente, setIncidente] = useState<Incidente | null>(null);
  const [actualizaciones, setActualizaciones] = useState<Actualizacion[]>([]);
  const [loadingIncidente, setLoadingIncidente] = useState(true);
  const [loadingActualizaciones, setLoadingActualizaciones] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [novedad, setNovedad] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviadoOk, setEnviadoOk] = useState(false);

  const fetchIncidente = useCallback(async () => {
    setLoadingIncidente(true);
    setError(null);
    try {
      const token = await SecureStore.getItemAsync('satam_access_token');
      const res = await fetch(`${BACKEND}/incidentes/${id}`, {
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIncidente(data);
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando incidente');
    } finally {
      setLoadingIncidente(false);
    }
  }, [id]);

  const fetchActualizaciones = useCallback(async () => {
    setLoadingActualizaciones(true);
    try {
      const token = await SecureStore.getItemAsync('satam_access_token');
      const res = await fetch(`${BACKEND}/incidentes/${id}/actualizaciones`, {
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: Actualizacion[] = Array.isArray(data)
        ? data
        : data.results ?? data.data ?? [];
      setActualizaciones(list);
    } catch {
      // no-op: actualizaciones son opcionales
    } finally {
      setLoadingActualizaciones(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIncidente();
    fetchActualizaciones();
  }, [fetchIncidente, fetchActualizaciones]);

  const handleAgregarNovedad = async () => {
    const texto = novedad.trim();
    if (!texto || enviando) return;
    setEnviando(true);
    setEnviadoOk(false);
    try {
      const token = await SecureStore.getItemAsync('satam_access_token');
      const res = await fetch(`${BACKEND}/incidentes/${id}/actualizaciones`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ texto }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNovedad('');
      setEnviadoOk(true);
      await fetchActualizaciones();
    } catch {
      // silencioso — el usuario verá que no se limpió el input
    } finally {
      setEnviando(false);
    }
  };

  const loading = loadingIncidente;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>{'← Volver'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (error || !incidente) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>{'← Volver'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'Incidente no encontrado'}</Text>
        </View>
      </View>
    );
  }

  const estadoColor = ESTADO_COLORS[incidente.estado] ?? '#9CA3AF';
  const nivelColor = NIVEL_COLORS[incidente.nivel_alerta] ?? '#6B7280';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>{'← Volver'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {incidente.codigo}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info principal */}
        <View style={styles.section}>
          <Text style={styles.titulo}>{incidente.titulo}</Text>

          {incidente.municipio_nombre ? (
            <Text style={styles.municipio}>{incidente.municipio_nombre}</Text>
          ) : null}

          <View style={styles.badgeRow}>
            <Badge
              label={(incidente.nivel_alerta ?? '').replace('_', ' ')}
              color={nivelColor}
            />
            <Badge
              label={(incidente.estado ?? '').replace('_', ' ')}
              color={estadoColor}
            />
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo de amenaza</Text>
              <Text style={styles.infoValue}>{incidente.tipo_amenaza ?? '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha inicio</Text>
              <Text style={styles.infoValue}>{formatFecha(incidente.fecha_inicio)}</Text>
            </View>
          </View>

          {incidente.descripcion ? (
            <View style={styles.descBox}>
              <Text style={styles.descLabel}>Descripción</Text>
              <Text style={styles.descText}>{incidente.descripcion}</Text>
            </View>
          ) : null}
        </View>

        {/* Mini-mapa */}
        {(() => {
          const lat = parseFloat(String(incidente.lat ?? incidente.municipio_lat ?? ''));
          const lon = parseFloat(String(incidente.lng ?? incidente.municipio_lon ?? ''));
          if (isNaN(lat) || isNaN(lon)) return null;
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ubicación</Text>
              <View style={styles.miniMapContainer}>
                <LeafletMap
                  lat={lat}
                  lon={lon}
                  zoom={13}
                  eventos={[{
                    id: incidente.id,
                    lat,
                    lon,
                    titulo: incidente.titulo,
                    estado: incidente.estado,
                    nivel: incidente.nivel_alerta,
                  }]}
                  style={styles.miniMap}
                  scrollEnabled={false}
                  zoomEnabled={false}
                />
              </View>
            </View>
          );
        })()}

        {/* Actualizaciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actualizaciones</Text>

          {loadingActualizaciones ? (
            <ActivityIndicator color="#3B82F6" style={{ marginVertical: 12 }} />
          ) : actualizaciones.length === 0 ? (
            <Text style={styles.emptyText}>Sin actualizaciones aún.</Text>
          ) : (
            actualizaciones.map((act) => (
              <View key={String(act.id)} style={styles.actCard}>
                <Text style={styles.actTexto}>{act.texto}</Text>
                <View style={styles.actMeta}>
                  <Text style={styles.actAutor}>
                    {[act.nombre, act.apellido].filter(Boolean).join(' ') || 'Sistema'}
                  </Text>
                  <Text style={styles.actFecha}>{formatFecha(act.created_at)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Formulario nueva novedad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agregar novedad</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Escribe la novedad..."
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={4}
            value={novedad}
            onChangeText={(t) => {
              setNovedad(t);
              if (enviadoOk) setEnviadoOk(false);
            }}
            editable={!enviando}
          />
          {enviadoOk && (
            <Text style={styles.okText}>Novedad registrada correctamente.</Text>
          )}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (enviando || !novedad.trim()) && styles.submitBtnDisabled,
            ]}
            onPress={handleAgregarNovedad}
            disabled={enviando || !novedad.trim()}
            activeOpacity={0.8}
          >
            {enviando ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Agregar novedad</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0A0E1A',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backBtn: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  backText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  titulo: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  municipio: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  infoGrid: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    flex: 1,
  },
  infoValue: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  descBox: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
  },
  descLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  descText: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 20,
  },
  actCard: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  actTexto: {
    color: '#F9FAFB',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  actMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actAutor: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  actFecha: {
    color: '#6B7280',
    fontSize: 11,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
  },
  textInput: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    color: '#F9FAFB',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 96,
    textAlignVertical: 'top',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  okText: {
    color: '#22C55E',
    fontSize: 12,
    marginBottom: 8,
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#1E3A5F',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  miniMapContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#374151',
  },
  miniMap: {
    width: '100%',
    height: 180,
  },
});
