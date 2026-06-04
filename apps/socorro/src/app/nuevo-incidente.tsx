import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { database } from '../database';
import { Incidente, ArchivoPendiente } from '../database';
import { obtenerUbicacionSinBloquear, Coordenada, GPS_PRECISION_WARNING_M as WARN } from '../services/location.service';
import { procesarFoto } from '../services/camera.service';
import { sincronizar } from '../services/sync.service';
import { GPS_PRECISION_WARNING_M } from '../constants';

// ─── Tipos de amenaza ────────────────────────────────────────────────────────
interface TipoAmenaza {
  id: string;
  label: string;
  icon: string;
  placeholder: string;
  color: string;
}

const TIPOS_AMENAZA: TipoAmenaza[] = [
  { id: 'INUNDACION', label: 'Inundación', icon: '🌊', placeholder: 'Desbordamiento en sector...', color: '#1D4ED8' },
  { id: 'REMOCION', label: 'Remoción', icon: '⛰', placeholder: 'Deslizamiento en vía...', color: '#92400E' },
  { id: 'SISMO', label: 'Sismo', icon: '📳', placeholder: 'Sismo sentido en zona...', color: '#7C2D12' },
  { id: 'INCENDIO', label: 'Incendio', icon: '🔥', placeholder: 'Incendio en estructura...', color: '#DC2626' },
  { id: 'VENDAVAL', label: 'Vendaval', icon: '🌪', placeholder: 'Vendaval con daños en...', color: '#6D28D9' },
  { id: 'OTRO', label: 'Otro', icon: '⚠', placeholder: 'Describe el evento...', color: '#374151' },
];

// ─── Paso 1: Selección de tipo de amenaza ───────────────────────────────────
function PasoTipo({ onSeleccionar }: { onSeleccionar: (tipo: TipoAmenaza) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.pasoContainer}>
      <Text style={styles.pasoTitulo}>Tipo de Amenaza</Text>
      <Text style={styles.pasoSubtitulo}>Selecciona el tipo de evento a reportar</Text>

      <View style={styles.grid}>
        {TIPOS_AMENAZA.map((tipo) => (
          <TouchableOpacity
            key={tipo.id}
            style={[styles.amenazaBtn, { borderColor: tipo.color }]}
            onPress={() => onSeleccionar(tipo)}
            activeOpacity={0.7}
          >
            <Text style={styles.amenazaIcon}>{tipo.icon}</Text>
            <Text style={styles.amenazaLabel}>{tipo.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Componente: Display de coordenadas ────────────────────────────────────
function CoordDisplay({ coord, loading }: { coord: Coordenada | null; loading: boolean }) {
  if (loading) {
    return (
      <View style={styles.coordContainer}>
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text style={styles.coordLoading}>Obteniendo GPS...</Text>
      </View>
    );
  }

  if (!coord) {
    return (
      <View style={[styles.coordContainer, styles.coordError]}>
        <Text style={styles.coordErrorText}>GPS no disponible — se guardará sin coordenadas</Text>
      </View>
    );
  }

  const precisionWarning = coord.precision_metros > GPS_PRECISION_WARNING_M;

  return (
    <View style={styles.coordContainer}>
      <View style={styles.coordRow}>
        <Text style={styles.coordLabel}>Lat:</Text>
        <Text style={styles.coordValue}>{coord.lat.toFixed(6)}</Text>
        <Text style={styles.coordLabel}>Lng:</Text>
        <Text style={styles.coordValue}>{coord.lng.toFixed(6)}</Text>
      </View>
      <View style={styles.coordRow}>
        <Text style={styles.coordLabel}>Precisión:</Text>
        <Text style={[styles.coordValue, precisionWarning && styles.coordWarningText]}>
          ±{coord.precision_metros.toFixed(0)}m — {coord.fuente}
        </Text>
      </View>
      {precisionWarning && (
        <View style={styles.coordWarning}>
          <Text style={styles.coordWarningMsg}>
            Precisión baja ({coord.precision_metros.toFixed(0)}m). Mover al exterior mejora la señal.
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Paso 2: Confirmación y detalle del incidente ──────────────────────────
function PasoConfirmar({
  tipo,
  onGuardar,
  guardando,
}: {
  tipo: TipoAmenaza;
  onGuardar: (titulo: string, descripcion: string, coord: Coordenada | null, foto: string | null) => Promise<void>;
  guardando: boolean;
}) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [coord, setCoord] = useState<Coordenada | null>(null);
  const [loadingGps, setLoadingGps] = useState(true);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    // GPS no bloquea nunca el flujo
    obtenerUbicacionSinBloquear()
      .then(setCoord)
      .finally(() => setLoadingGps(false));
  }, []);

  const handleTomarFoto = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Cámara requerida', 'Activa el permiso de cámara en configuración.');
        return;
      }
    }
    setMostrarCamara(true);
  };

  const handleCaptura = async () => {
    if (!cameraRef.current) return;
    setProcesandoFoto(true);
    try {
      const foto = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (foto?.uri) {
        const resultado = await procesarFoto(foto.uri);
        setFotoUri(resultado.miniatura_uri);
        setMostrarCamara(false);
      }
    } catch {
      Alert.alert('Error', 'No se pudo tomar la foto. Intenta de nuevo.');
    } finally {
      setProcesandoFoto(false);
    }
  };

  const handleGuardar = () => {
    if (!titulo.trim()) {
      Alert.alert('Título requerido', 'Ingresa un título para el incidente.');
      return;
    }
    onGuardar(titulo.trim(), descripcion.trim(), coord, fotoUri);
  };

  if (mostrarCamara) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.cameraCancel}
              onPress={() => setMostrarCamara(false)}
            >
              <Text style={styles.cameraCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cameraShutter}
              onPress={handleCaptura}
              disabled={procesandoFoto}
            >
              {procesandoFoto ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.cameraShutterInner} />
              )}
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pasoContainer} keyboardShouldPersistTaps="handled">
      {/* Header del tipo seleccionado */}
      <View style={[styles.tipoHeader, { borderColor: tipo.color }]}>
        <Text style={styles.tipoHeaderIcon}>{tipo.icon}</Text>
        <Text style={[styles.tipoHeaderLabel, { color: tipo.color }]}>{tipo.label}</Text>
      </View>

      {/* GPS */}
      <Text style={styles.fieldLabel}>Ubicación GPS</Text>
      <CoordDisplay coord={coord} loading={loadingGps} />

      {/* Título */}
      <Text style={styles.fieldLabel}>
        Título <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={styles.input}
        value={titulo}
        onChangeText={setTitulo}
        placeholder={tipo.placeholder}
        placeholderTextColor="#4A5568"
        maxLength={120}
        editable={!guardando}
      />

      {/* Descripción */}
      <Text style={styles.fieldLabel}>Descripción (opcional)</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="Detalles adicionales del evento..."
        placeholderTextColor="#4A5568"
        multiline
        numberOfLines={3}
        maxLength={500}
        editable={!guardando}
      />

      {/* Foto opcional */}
      <Text style={styles.fieldLabel}>Foto (opcional)</Text>
      {fotoUri ? (
        <View style={styles.fotoPreview}>
          <Image source={{ uri: fotoUri }} style={styles.fotoThumb} />
          <TouchableOpacity style={styles.fotoRetomar} onPress={handleTomarFoto}>
            <Text style={styles.fotoRetamarText}>Cambiar foto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.fotoBtn} onPress={handleTomarFoto} activeOpacity={0.7}>
          <Text style={styles.fotoBtnIcon}>📷</Text>
          <Text style={styles.fotoBtnText}>Tomar Foto</Text>
        </TouchableOpacity>
      )}

      {/* Botón guardar — 56dp altura */}
      <TouchableOpacity
        style={[styles.saveBtn, guardando && styles.saveBtnDisabled]}
        onPress={handleGuardar}
        disabled={guardando}
        activeOpacity={0.8}
      >
        {guardando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveBtnText}>GUARDAR INCIDENTE</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Pantalla principal NuevoIncidente ─────────────────────────────────────
/**
 * Pantalla para registrar un nuevo incidente.
 * Regla de oro: máximo 3 toques desde HomeScreen hasta guardar.
 *   Toque 1: FAB "NUEVO INCIDENTE" en HomeScreen
 *   Toque 2: Seleccionar tipo de amenaza (grid 2x3)
 *   Toque 3: "GUARDAR INCIDENTE"
 * GPS y foto son opcionales y no bloquean el guardado.
 */
export default function NuevoIncidenteScreen() {
  const router = useRouter();
  const [paso, setPaso] = useState<'tipo' | 'confirmar'>('tipo');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoAmenaza | null>(null);
  const [guardando, setGuardando] = useState(false);

  const handleSeleccionarTipo = (tipo: TipoAmenaza) => {
    setTipoSeleccionado(tipo);
    setPaso('confirmar');
  };

  const handleGuardar = async (
    titulo: string,
    descripcion: string,
    coord: Coordenada | null,
    fotoUri: string | null,
  ) => {
    if (!tipoSeleccionado) return;
    setGuardando(true);

    try {
      const now = Date.now();
      const codigo = `INC-${now.toString().slice(-8)}`;

      let incidenteId: string | null = null;

      await database.write(async () => {
        const incidente = await database.get<Incidente>('incidentes').create((i) => {
          i.codigo = codigo;
          i.titulo = titulo;
          i.descripcion = descripcion || null;
          i.tipoAmenaza = tipoSeleccionado.id;
          i.estado = 'ACTIVO';
          i.nivelAlerta = 'AMARILLO';
          i.lat = coord?.lat ?? 0;
          i.lng = coord?.lng ?? 0;
          i.altitud = coord?.altitud ?? null;
          i.precisionGps = coord?.precision_metros ?? null;
          i.municipioId = 'pendiente';
          i.synced = false;
          i.syncError = null;
        });

        incidenteId = incidente.id;

        // Encolar foto si se tomó
        if (fotoUri) {
          await database.get<ArchivoPendiente>('archivos_pendientes').create((a) => {
            a.incidenteId = incidente.id;
            a.uriLocal = fotoUri;
            a.miniaturaUri = fotoUri;
            a.lat = coord?.lat ?? null;
            a.lng = coord?.lng ?? null;
            a.subido = false;
            a.error = null;
          });
        }
      });

      // Intento de sincronización (no bloquea si falla)
      sincronizar().catch(() => {});

      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar el incidente. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.container}>
      {paso === 'tipo' && <PasoTipo onSeleccionar={handleSeleccionarTipo} />}
      {paso === 'confirmar' && tipoSeleccionado && (
        <PasoConfirmar
          tipo={tipoSeleccionado}
          onGuardar={handleGuardar}
          guardando={guardando}
        />
      )}
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  pasoContainer: { padding: 20, paddingBottom: 40 },
  pasoTitulo: { color: '#F7FAFC', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  pasoSubtitulo: { color: '#718096', fontSize: 14, marginBottom: 24 },

  // Grid 2x3 para tipos de amenaza
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  amenazaBtn: {
    width: '47%',
    height: 72,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  amenazaIcon: { fontSize: 26 },
  amenazaLabel: { color: '#E2E8F0', fontSize: 13, fontWeight: '600' },

  // Tipo seleccionado header
  tipoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  tipoHeaderIcon: { fontSize: 24 },
  tipoHeaderLabel: { fontSize: 16, fontWeight: '700' },

  // Coordenadas
  coordContainer: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    gap: 4,
  },
  coordError: { borderWidth: 1, borderColor: '#4A5568' },
  coordErrorText: { color: '#718096', fontSize: 12 },
  coordLoading: { color: '#718096', fontSize: 13, marginLeft: 8 },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coordLabel: { color: '#718096', fontSize: 12 },
  coordValue: { color: '#A0AEC0', fontSize: 12, fontWeight: '600' },
  coordWarningText: { color: '#F59E0B' },
  coordWarning: {
    backgroundColor: '#F59E0B22',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  coordWarningMsg: { color: '#F59E0B', fontSize: 12 },

  // Campos de formulario
  fieldLabel: { color: '#A0AEC0', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  required: { color: '#FF3B30' },
  input: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E2D45',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F7FAFC',
    fontSize: 15,
    marginBottom: 16,
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },

  // Foto
  fotoBtn: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E2D45',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  fotoBtnIcon: { fontSize: 20 },
  fotoBtnText: { color: '#A0AEC0', fontSize: 15, fontWeight: '600' },
  fotoPreview: { marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
  fotoThumb: { width: 72, height: 72, borderRadius: 8 },
  fotoRetomar: {
    backgroundColor: '#1E2D45',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  fotoRetamarText: { color: '#A0AEC0', fontSize: 13 },

  // Botón guardar — altura 56dp
  saveBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 1 },

  // Cámara
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  cameraCancel: {
    backgroundColor: '#00000088',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  cameraCancelText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  cameraShutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF88',
  },
  cameraShutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
});
