import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { withObservables } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { database, Incidente, Actualizacion, ArchivoPendiente } from '../../database';
import { obtenerUbicacionSinBloquear } from '../../services/location.service';
import { procesarFoto } from '../../services/camera.service';
import { sincronizar } from '../../services/sync.service';
import { CameraView, useCameraPermissions } from 'expo-camera';

const NIVEL_COLORES: Record<string, string> = {
  ROJO: '#FF3B30',
  NARANJA: '#FF9500',
  AMARILLO: '#FFCC00',
  VERDE: '#34C759',
};

// ─── Badge de nivel de alerta ───────────────────────────────────────────────
function AlertaBadge({ nivel }: { nivel: string }) {
  const color = NIVEL_COLORES[nivel] ?? '#4A5568';
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{nivel}</Text>
    </View>
  );
}

// ─── Badge de estado de sincronización ──────────────────────────────────────
function SyncBadge({ synced, error }: { synced: boolean; error: string | null }) {
  if (synced) {
    return (
      <View style={[styles.badge, { backgroundColor: '#16A34A22', borderColor: '#16A34A' }]}>
        <Text style={[styles.badgeText, { color: '#16A34A' }]}>Sincronizado</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.badge, { backgroundColor: '#FF3B3022', borderColor: '#FF3B30' }]}>
        <Text style={[styles.badgeText, { color: '#FF3B30' }]}>Error sync</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: '#F59E0B22', borderColor: '#F59E0B' }]}>
      <Text style={[styles.badgeText, { color: '#F59E0B' }]}>Pendiente</Text>
    </View>
  );
}

// ─── Item de timeline ───────────────────────────────────────────────────────
function ActualizacionItem({ actualizacion }: { actualizacion: Actualizacion }) {
  const fecha = new Date(actualizacion.createdAtLocal);
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineDot} />
      <View style={styles.timelineContent}>
        <Text style={styles.timelineTime}>
          {fecha.toLocaleDateString('es-CO')} {fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.timelineTexto}>{actualizacion.texto}</Text>
        {!actualizacion.synced && (
          <Text style={styles.timelinePendiente}>Pendiente de sync</Text>
        )}
      </View>
    </View>
  );
}

// ─── Modal agregar actualización ────────────────────────────────────────────
function ModalActualizacion({
  visible,
  incidenteId,
  onClose,
}: {
  visible: boolean;
  incidenteId: string;
  onClose: () => void;
}) {
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const cameraRef = React.useRef<CameraView>(null);

  const handleTomarFoto = async () => {
    if (!cameraPermission?.granted) {
      await requestCameraPermission();
    }
    setMostrarCamara(true);
  };

  const handleCaptura = async () => {
    if (!cameraRef.current) return;
    try {
      const foto = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (foto?.uri) {
        const resultado = await procesarFoto(foto.uri);
        setFotoUri(resultado.miniatura_uri);
        setMostrarCamara(false);
      }
    } catch {
      Alert.alert('Error', 'No se pudo tomar la foto.');
    }
  };

  const handleGuardar = async () => {
    if (!texto.trim()) {
      Alert.alert('Texto requerido', 'Escribe una actualización.');
      return;
    }
    setGuardando(true);
    try {
      const coord = await obtenerUbicacionSinBloquear();

      await database.write(async () => {
        await database.get<Actualizacion>('actualizaciones').create((a) => {
          a.incidenteId = incidenteId;
          a.texto = texto.trim();
          a.lat = coord?.lat ?? null;
          a.lng = coord?.lng ?? null;
          a.synced = false;
        });

        if (fotoUri) {
          await database.get<ArchivoPendiente>('archivos_pendientes').create((arch) => {
            arch.incidenteId = incidenteId;
            arch.uriLocal = fotoUri;
            arch.miniaturaUri = fotoUri;
            arch.lat = coord?.lat ?? null;
            arch.lng = coord?.lng ?? null;
            arch.subido = false;
            arch.error = null;
          });
        }
      });

      sincronizar().catch(() => {});
      setTexto('');
      setFotoUri(null);
      onClose();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la actualización.');
    } finally {
      setGuardando(false);
    }
  };

  if (mostrarCamara) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={{ flex: 1 }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
            <View style={styles.camControls}>
              <TouchableOpacity onPress={() => setMostrarCamara(false)} style={styles.camCancel}>
                <Text style={{ color: '#FFF', fontSize: 16 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCaptura} style={styles.camShutter}>
                <View style={styles.camShutterInner} />
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Nueva Actualización</Text>

          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            value={texto}
            onChangeText={setTexto}
            placeholder="Describe el estado actual..."
            placeholderTextColor="#4A5568"
            multiline
            editable={!guardando}
          />

          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.fotoPreview} />
          ) : (
            <TouchableOpacity style={styles.fotoBtn} onPress={handleTomarFoto}>
              <Text style={{ color: '#A0AEC0' }}>📷  Adjuntar foto (opcional)</Text>
            </TouchableOpacity>
          )}

          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={guardando}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleGuardar} disabled={guardando}>
              {guardando ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Pantalla detalle de incidente ──────────────────────────────────────────
interface IncidenteScreenProps {
  incidente: Incidente | null;
  actualizaciones: Actualizacion[];
}

function IncidenteScreenBase({ incidente, actualizaciones }: IncidenteScreenProps) {
  const [modalVisible, setModalVisible] = useState(false);

  if (!incidente) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#3B82F6" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.codigo}>{incidente.codigo}</Text>
          <View style={styles.badges}>
            <AlertaBadge nivel={incidente.nivelAlerta} />
            <SyncBadge synced={incidente.synced} error={incidente.syncError} />
          </View>
        </View>

        <Text style={styles.titulo}>{incidente.titulo}</Text>
        {incidente.descripcion ? (
          <Text style={styles.descripcion}>{incidente.descripcion}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>{incidente.tipoAmenaza}</Text>
          <Text style={styles.metaSep}>·</Text>
          <Text style={styles.metaItem}>{incidente.estado}</Text>
          {incidente.afectadosEstimado ? (
            <>
              <Text style={styles.metaSep}>·</Text>
              <Text style={styles.metaItem}>{incidente.afectadosEstimado} afectados</Text>
            </>
          ) : null}
        </View>

        {/* Mapa 200dp */}
        {incidente.lat !== 0 && incidente.lng !== 0 ? (
          <View style={styles.mapaContainer}>
            <MapView
              style={styles.mapa}
              initialRegion={{
                latitude: incidente.lat,
                longitude: incidente.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker
                coordinate={{ latitude: incidente.lat, longitude: incidente.lng }}
                pinColor={NIVEL_COLORES[incidente.nivelAlerta] ?? '#FF3B30'}
              />
            </MapView>
          </View>
        ) : null}

        {/* Timeline actualizaciones */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <Text style={styles.sectionTitle}>Actualizaciones</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addBtnText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>

          {actualizaciones.length === 0 ? (
            <Text style={styles.emptyText}>Sin actualizaciones registradas.</Text>
          ) : (
            <View style={styles.timeline}>
              {actualizaciones.map((act) => (
                <ActualizacionItem key={act.id} actualizacion={act} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <ModalActualizacion
        visible={modalVisible}
        incidenteId={incidente.id}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

// ─── HOC reactivo WatermelonDB ──────────────────────────────────────────────
const enhance = withObservables(['incidenteId'], ({ incidenteId }: { incidenteId: string }) => ({
  incidente: database.get<Incidente>('incidentes').findAndObserve(incidenteId),
  actualizaciones: database
    .get<Actualizacion>('actualizaciones')
    .query(Q.where('incidente_id', incidenteId), Q.sortBy('created_at_local', Q.desc))
    .observe(),
}));

const EnhancedIncidenteScreen = enhance(IncidenteScreenBase);

export default function IncidenteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EnhancedIncidenteScreen incidenteId={id ?? ''} />;
}

// ─── Estilos ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1A' },
  scroll: { padding: 16, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  codigo: { color: '#718096', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  badges: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  titulo: { color: '#F7FAFC', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  descripcion: { color: '#A0AEC0', fontSize: 14, marginBottom: 12, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  metaItem: { color: '#718096', fontSize: 13 },
  metaSep: { color: '#374151', fontSize: 13 },

  mapaContainer: { height: 200, borderRadius: 10, overflow: 'hidden', marginBottom: 20 },
  mapa: { flex: 1 },

  timelineSection: { marginTop: 4 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#F7FAFC', fontSize: 16, fontWeight: '700' },
  addBtn: { backgroundColor: '#1D4ED8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  emptyText: { color: '#4A5568', fontSize: 14, textAlign: 'center', paddingVertical: 20 },

  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', gap: 12, paddingBottom: 16 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6', marginTop: 4, flexShrink: 0 },
  timelineContent: { flex: 1, borderLeftWidth: 1, borderColor: '#1E2D45', paddingLeft: 12 },
  timelineTime: { color: '#4A5568', fontSize: 11, marginBottom: 4 },
  timelineTexto: { color: '#E2E8F0', fontSize: 14, lineHeight: 20 },
  timelinePendiente: { color: '#F59E0B', fontSize: 11, marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0D1320', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 40 },
  modalTitle: { color: '#F7FAFC', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#1E2D45', borderRadius: 8, padding: 12, color: '#F7FAFC', fontSize: 15, marginBottom: 12 },
  fotoBtn: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#1E2D45', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 16 },
  fotoPreview: { width: 80, height: 80, borderRadius: 8, marginBottom: 12 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#1E2D45', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: '#A0AEC0', fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, backgroundColor: '#16A34A', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Camara inline
  camControls: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  camCancel: { backgroundColor: '#00000088', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 },
  camShutter: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  camShutterInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF' },
});
