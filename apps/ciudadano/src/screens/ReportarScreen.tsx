/**
 * ReportarScreen — Flujo en 3 pasos
 *
 * Paso 1: Seleccionar tipo de amenaza (grid 2x3)
 * Paso 2: Formulario enriquecido:
 *           - Descripción con ícono de micrófono (speech-to-text nativo del teclado)
 *           - Foto: tomar / cambiar / eliminar (con preview)
 *           - GPS: obtener / actualizar / eliminar
 *           - Indicador offline con cola local
 * Paso 3: Confirmación de envío
 *
 * Patrones UX: secciones tipo card, campo + mic, foto con preview, badge offline.
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { AmenazaIcon } from '../ui';
import { TIPOS_AMENAZA } from '../constants';
import { obtenerUbicacionSinBloquear } from '../services/location.service';
import { enviarReporte } from '../services/reporte.service';
import { encolarReporte } from '../services/offline-queue.service';
import type { Coordenada } from '../services/location.service';

type Paso = 'tipo' | 'detalle' | 'enviado';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function BadgeOffline() {
  return (
    <View style={styles.badgeOffline}>
      <Ionicons name="cloud-offline-outline" size={14} color="#DC2626" />
      <Text style={styles.badgeOfflineTexto}>Sin conexión — se guardará localmente</Text>
    </View>
  );
}

interface CampoTextoProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  requerido?: boolean;
}

function CampoTexto({ label, placeholder, value, onChange, multiline, requerido }: CampoTextoProps) {
  return (
    <View style={styles.campoWrapper}>
      <Text style={styles.campoLabel}>
        {label}
        {requerido ? ' *' : ''}
      </Text>
      <View style={styles.campoRow}>
        <TextInput
          style={[styles.campoInput, multiline && styles.campoInputMulti]}
          placeholder={placeholder ?? label}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChange}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
          // En Android/iOS el usuario puede pulsar el mic del teclado nativo
          keyboardType="default"
        />
        <TouchableOpacity
          style={styles.micBtn}
          accessibilityLabel="Dictar texto"
          activeOpacity={0.7}
          // El mic del teclado nativo se activa al dar foco al TextInput;
          // este botón sirve de acceso directo visual (estándar en apps de campo).
          onPress={() => {/* foco ya activo — el usuario usa el mic del teclado */}}
        >
          <Ionicons name="mic-outline" size={22} color="#6D28D9" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Sección Foto
// ─────────────────────────────────────────────

interface SeccionFotoProps {
  fotoUri: string | null;
  fotoAutorizada: boolean;
  onTomarFoto: () => void;
  onGaleria: () => void;
  onEliminar: () => void;
  onToggleAutorizacion: () => void;
}

function SeccionFoto({ fotoUri, fotoAutorizada, onTomarFoto, onGaleria, onEliminar, onToggleAutorizacion }: SeccionFotoProps) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>Foto (opcional)</Text>
      {fotoUri ? (
        <>
          <Image source={{ uri: fotoUri }} style={styles.fotoPreview} resizeMode="cover" />
          <View style={styles.fotoBotones}>
            <TouchableOpacity style={styles.fotoBtn} onPress={onTomarFoto} activeOpacity={0.8}>
              <Ionicons name="camera-outline" size={18} color="#6D28D9" />
              <Text style={styles.fotoBtnTexto}>Cambiar Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.fotoBtn, styles.fotoBtnEliminar]} onPress={onEliminar} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={[styles.fotoBtnTexto, styles.fotoBtnEliminarTexto]}>Eliminar</Text>
            </TouchableOpacity>
          </View>
          {/* Checkbox de autorización */}
          <TouchableOpacity style={styles.checkboxRow} onPress={onToggleAutorizacion} activeOpacity={0.7}>
            <View style={[styles.checkbox, fotoAutorizada && styles.checkboxActivo]}>
              {fotoAutorizada && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
            <Text style={styles.checkboxLabel}>Autorizo incluir esta foto en el reporte</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.fotoBotones}>
          <TouchableOpacity style={[styles.fotoVacioBtn, { flex: 1 }]} onPress={onTomarFoto} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={24} color="#6D28D9" />
            <Text style={styles.fotoVacioBtnTexto}>Tomar Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fotoVacioBtn, { flex: 1 }]} onPress={onGaleria} activeOpacity={0.8}>
            <Ionicons name="images-outline" size={24} color="#6D28D9" />
            <Text style={styles.fotoVacioBtnTexto}>Desde galería</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// Sección GPS
// ─────────────────────────────────────────────

interface SeccionGPSProps {
  coordenada: Coordenada | null;
  obteniendo: boolean;
  onObtener: () => void;
  onEliminar: () => void;
}

function SeccionGPS({ coordenada, obteniendo, onObtener, onEliminar }: SeccionGPSProps) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>Ubicación GPS (opcional)</Text>
      {coordenada ? (
        <>
          <View style={styles.gpsInfo}>
            <Ionicons name="location" size={16} color="#DC2626" />
            <Text style={styles.gpsCoordenada}>Lat: {coordenada.latitud.toFixed(6)}</Text>
          </View>
          <View style={[styles.gpsInfo, { marginTop: 2 }]}>
            <Ionicons name="location" size={16} color="#DC2626" />
            <Text style={styles.gpsCoordenada}>Lng: {coordenada.longitud.toFixed(6)}</Text>
          </View>
          <View style={styles.fotoBotones}>
            <TouchableOpacity style={styles.fotoBtn} onPress={onObtener} disabled={obteniendo} activeOpacity={0.8}>
              {obteniendo ? (
                <ActivityIndicator size="small" color="#6D28D9" />
              ) : (
                <Ionicons name="locate-outline" size={18} color="#6D28D9" />
              )}
              <Text style={styles.fotoBtnTexto}>Actualizar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.fotoBtn, styles.fotoBtnEliminar]} onPress={onEliminar} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={[styles.fotoBtnTexto, styles.fotoBtnEliminarTexto]}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <TouchableOpacity style={styles.fotoVacioBtn} onPress={onObtener} disabled={obteniendo} activeOpacity={0.8}>
          {obteniendo ? (
            <ActivityIndicator size="small" color="#6D28D9" />
          ) : (
            <Ionicons name="locate-outline" size={24} color="#6D28D9" />
          )}
          <Text style={styles.fotoVacioBtnTexto}>
            {obteniendo ? 'Obteniendo...' : 'Obtener Ubicación'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// Pantalla principal
// ─────────────────────────────────────────────

export default function ReportarScreen() {
  const netInfo = useNetInfo();
  const online = netInfo.isConnected !== false;

  const [paso, setPaso] = useState<Paso>('tipo');
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoAutorizada, setFotoAutorizada] = useState(false);
  const [coordenada, setCoordenada] = useState<Coordenada | null>(null);
  const [obteniendo, setObteniendo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Paso 1 → Paso 2: seleccionar tipo
  const seleccionarTipo = useCallback((tipo: string) => {
    setTipoSeleccionado(tipo);
    setPaso('detalle');
    // GPS arranca automáticamente en segundo plano
    setObteniendo(true);
    obtenerUbicacionSinBloquear().then((coord) => {
      setCoordenada(coord);
      setObteniendo(false);
    });
  }, []);

  // Foto — cámara
  const tomarFoto = async () => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para tomar la foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setFotoUri(result.assets[0].uri);
      setFotoAutorizada(false);
    }
  };

  // Foto — galería
  const seleccionarDeGaleria = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería para seleccionar la foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setFotoUri(result.assets[0].uri);
      setFotoAutorizada(false);
    }
  };

  // GPS
  const obtenerGPS = async () => {
    setObteniendo(true);
    const coord = await obtenerUbicacionSinBloquear();
    setCoordenada(coord);
    setObteniendo(false);
  };

  // Volver al inicio del flujo (resetea estado local; no depende de historial de navegación)
  const volverAlInicio = useCallback(() => {
    setPaso('tipo');
    setTipoSeleccionado('');
    setDescripcion('');
    setFotoUri(null);
    setFotoAutorizada(false);
    setCoordenada(null);
  }, []);

  // Enviar
  const enviar = async () => {
    if (enviando) return;
    if (fotoUri && !fotoAutorizada) {
      Alert.alert('Autorización requerida', 'Debes autorizar el uso de la foto antes de enviar el reporte.');
      return;
    }
    setEnviando(true);
    try {
      if (online) {
        await enviarReporte(
          tipoSeleccionado,
          coordenada ?? { latitud: 0, longitud: 0 },
          descripcion || undefined,
          fotoUri ?? undefined,
        );
      } else {
        await encolarReporte({
          tipo_amenaza: tipoSeleccionado,
          latitud: coordenada?.latitud ?? 0,
          longitud: coordenada?.longitud ?? 0,
          descripcion: descripcion || undefined,
          foto_uri: fotoUri ?? undefined,
        });
      }
      setPaso('enviado');
    } catch {
      Alert.alert('Error', 'No se pudo enviar el reporte. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  // ── PASO 1: seleccionar tipo ──
  if (paso === 'tipo') {
    return (
      <View style={styles.container}>
        <Text style={styles.titulo}>¿Qué tipo de amenaza?</Text>
        <Text style={styles.subtitulo}>Toca para seleccionar</Text>
        {!online && <BadgeOffline />}
        <View style={styles.grid}>
          {TIPOS_AMENAZA.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.tipoCard}
              onPress={() => seleccionarTipo(t.id)}
              activeOpacity={0.75}
            >
              <AmenazaIcon tipo={t.icon as Parameters<typeof AmenazaIcon>[0]['tipo']} size={40} />
              <Text style={styles.tipoLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // ── PASO 2: formulario de detalle ──
  if (paso === 'detalle') {
    const tipoInfo = TIPOS_AMENAZA.find((t) => t.id === tipoSeleccionado);

    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Banner tipo seleccionado */}
        <View style={styles.bannerTipo}>
          <AmenazaIcon
            tipo={tipoInfo?.icon as Parameters<typeof AmenazaIcon>[0]['tipo']}
            size={32}
          />
          <Text style={styles.bannerTipoTexto}>{tipoInfo?.label}</Text>
          <TouchableOpacity onPress={() => setPaso('tipo')} style={styles.bannerCambiar}>
            <Text style={styles.bannerCambiarTexto}>Cambiar</Text>
          </TouchableOpacity>
        </View>

        {/* Badge offline */}
        {!online && (
          <View style={styles.seccion}>
            <BadgeOffline />
          </View>
        )}

        {/* Descripción */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Descripción</Text>
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={16} color="#4f46e5" />
            <Text style={styles.infoBannerTexto}>
              Describe brevemente lo que está ocurriendo. Usa el mic del teclado para dictar.
            </Text>
          </View>
          <CampoTexto
            label="Descripción"
            placeholder="Ej: Se observa humo en la zona norte de la vereda..."
            value={descripcion}
            onChange={setDescripcion}
            multiline
          />
        </View>

        {/* Foto */}
        <SeccionFoto
          fotoUri={fotoUri}
          fotoAutorizada={fotoAutorizada}
          onTomarFoto={tomarFoto}
          onGaleria={seleccionarDeGaleria}
          onEliminar={() => { setFotoUri(null); setFotoAutorizada(false); }}
          onToggleAutorizacion={() => setFotoAutorizada((v) => !v)}
        />

        {/* GPS */}
        <SeccionGPS
          coordenada={coordenada}
          obteniendo={obteniendo}
          onObtener={obtenerGPS}
          onEliminar={() => setCoordenada(null)}
        />

        {/* Nota anonimato */}
        <Text style={styles.anonimoNota}>
          Este reporte se enviará de forma anónima si no tienes sesión activa.
        </Text>

        {/* Botón enviar */}
        <TouchableOpacity
          style={[styles.enviarBtn, (enviando || (!!fotoUri && !fotoAutorizada)) && styles.enviarBtnDisabled]}
          onPress={enviar}
          disabled={enviando || (!!fotoUri && !fotoAutorizada)}
          activeOpacity={0.85}
        >
          {enviando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name={online ? 'send' : 'save-outline'} size={20} color="#FFF" />
              <Text style={styles.enviarBtnTexto}>
                {online ? 'ENVIAR REPORTE' : 'GUARDAR LOCALMENTE'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── PASO 3: enviado ──
  return (
    <View style={styles.container}>
      <Text style={styles.enviadoEmoji}>{online ? '✅' : '💾'}</Text>
      <Text style={styles.enviadoTitulo}>
        {online ? 'Reporte enviado' : 'Guardado localmente'}
      </Text>
      <Text style={styles.enviadoSubtitulo}>
        {online
          ? 'Gracias por avisar. Las autoridades han sido notificadas.'
          : 'Sin conexión. El reporte se enviará automáticamente cuando recuperes señal.'}
      </Text>
      <TouchableOpacity style={styles.volverBtn} onPress={volverAlInicio}>
        <Text style={styles.volverBtnTexto}>Volver al inicio</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  // Paso 1 / enviado
  container: {
    flex: 1,
    backgroundColor: '#eef2ff',
    padding: 20,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f0a2e',
    marginTop: 12,
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  tipoCard: {
    width: '47%',
    backgroundColor: '#dcfce7',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  tipoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F3F4F6',
  },

  // Paso 2 — scroll
  scroll: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },

  // Banner tipo
  bannerTipo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 4,
  },
  bannerTipoTexto: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#0f0a2e',
  },
  bannerCambiar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#c7d2fe',
    borderRadius: 8,
  },
  bannerCambiarTexto: {
    fontSize: 13,
    color: '#D1D5DB',
    fontWeight: '600',
  },

  // Badge offline
  badgeOffline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  badgeOfflineTexto: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },

  // Sección card
  seccion: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  seccionTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
  },
  infoBannerTexto: {
    flex: 1,
    fontSize: 12,
    color: '#1D4ED8',
    lineHeight: 17,
  },

  // Campo de texto con mic
  campoWrapper: { gap: 4 },
  campoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c7d2fe',
  },
  campoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#0f0a2e',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  campoInput: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
    padding: 0,
  },
  campoInputMulti: {
    minHeight: 70,
  },
  micBtn: {
    padding: 4,
    marginTop: 2,
  },

  // Foto
  fotoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  fotoBotones: {
    flexDirection: 'row',
    gap: 10,
  },
  fotoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#6D28D9',
  },
  fotoBtnEliminar: {
    borderColor: '#DC2626',
  },
  fotoBtnTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D28D9',
  },
  fotoBtnEliminarTexto: {
    color: '#DC2626',
  },
  fotoVacioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#6D28D9',
    borderStyle: 'dashed',
  },
  fotoVacioBtnTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6D28D9',
  },

  // Checkbox autorización
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  checkboxActivo: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: '#c7d2fe',
    lineHeight: 18,
  },

  // GPS
  gpsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gpsCoordenada: {
    fontSize: 13,
    color: '#c7d2fe',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Notas y envío
  anonimoNota: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  enviarBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  enviarBtnDisabled: { opacity: 0.6 },
  enviarBtnTexto: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Paso enviado
  enviadoEmoji: {
    fontSize: 72,
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  enviadoTitulo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#86EFAC',
    textAlign: 'center',
    marginBottom: 12,
  },
  enviadoSubtitulo: {
    fontSize: 16,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  volverBtn: {
    backgroundColor: '#dcfce7',
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  volverBtnTexto: {
    color: '#0f0a2e',
    fontSize: 16,
    fontWeight: '600',
  },
});
