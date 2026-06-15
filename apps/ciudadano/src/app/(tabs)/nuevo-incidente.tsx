import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';
import { MunicipioPicker } from '@/ui/components/MunicipioPicker';
import { API_BASE } from '@/constants';

const BACKEND = API_BASE;

type TipoAmenaza = 'INUNDACION' | 'DESLIZAMIENTO' | 'SISMO' | 'INCENDIO_FORESTAL' | 'VENDAVAL' | 'OTRO';

interface TipoOption {
  key: TipoAmenaza;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const TIPOS: TipoOption[] = [
  { key: 'INUNDACION', label: 'Inundación', icon: 'water', color: '#3B82F6' },
  { key: 'DESLIZAMIENTO', label: 'Deslizamiento', icon: 'alert-circle', color: '#92400E' },
  { key: 'SISMO', label: 'Sismo', icon: 'pulse', color: '#DC2626' },
  { key: 'INCENDIO_FORESTAL', label: 'Incendio Forestal', icon: 'flame', color: '#EA580C' },
  { key: 'VENDAVAL', label: 'Vendaval', icon: 'thunderstorm', color: '#7C3AED' },
  { key: 'OTRO', label: 'Otro', icon: 'ellipsis-horizontal-circle', color: '#6B7280' },
];

type StepResult = 'ok' | 'local';

const ROLES_EVENTO = ['ADMIN', 'CDGRD', 'CMGRD', 'SOCORRO', 'ALCALDIA', 'GOBERNACION'] as const;

export default function NuevoIncidente() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userRol: string = (session?.user as any)?.rol ?? 'CIUDADANO';
  const esCiudadano = !ROLES_EVENTO.includes(userRol as any);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoAmenaza | null>(null);
  const [descripcion, setDescripcion] = useState('');
  // municipio guarda el codigo DANE para el picker (value/highlight)
  const [municipio, setMunicipio] = useState('');
  const [municipioNombre, setMunicipioNombre] = useState('');
  // municipioId guarda el UUID que requiere el backend
  const [municipioId, setMunicipioId] = useState('');
  const [vereda, setVereda] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [fotoAutorizada, setFotoAutorizada] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingGps, setLoadingGps] = useState(false);
  const [loadingEnvio, setLoadingEnvio] = useState(false);
  const [stepResult, setStepResult] = useState<StepResult | null>(null);

  // Bloquear acceso anónimo
  if (!session) {
    return (
      <View style={styles.blockedContainer}>
        <Ionicons name="lock-closed" size={48} color="#6B7280" />
        <Text style={styles.blockedTitle}>Inicia sesión</Text>
        <Text style={styles.blockedBody}>
          Solo usuarios registrados pueden reportar incidentes.
        </Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login' as any)}>
          <Text style={styles.loginBtnText}>Ir al login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function tomarFotoCamara() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara para tomar fotos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets.length > 0) {
      setFoto(result.assets[0].uri);
      setFotoAutorizada(false);
    }
  }

  async function seleccionarDeGaleria() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para agregar fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setFoto(result.assets[0].uri);
      setFotoAutorizada(false);
    }
  }

  async function getLocation() {
    setLoadingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la ubicación para obtener coordenadas.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch {
      Alert.alert('Error', 'No se pudo obtener la ubicación.');
    } finally {
      setLoadingGps(false);
    }
  }

  async function handleRegistrar() {
    if (!municipioId || !tipoSeleccionado) return;
    if (foto && !fotoAutorizada) {
      Alert.alert('Autorización requerida', 'Marque el chulo de autorización para incluir la foto en el reporte.');
      return;
    }
    setLoadingEnvio(true);

    const tipoLabel = TIPOS.find((t) => t.key === tipoSeleccionado)?.label ?? tipoSeleccionado;

    const body = {
      tipo_amenaza: tipoSeleccionado,
      titulo: `${tipoLabel} en ${municipioNombre}`,
      descripcion: descripcion.trim() || `${tipoLabel} reportado en ${municipioNombre}`,
      municipio_id: municipioId,
      lat: coords?.lat ?? 0,
      lng: coords?.lng ?? 0,
      nivel_alerta: 'VERDE' as const,
      ...(vereda.trim() ? { vereda: vereda.trim() } : {}),
    };

    try {
      const response = await fetch(`${BACKEND}/incidentes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setStepResult('ok');
        setStep(3);
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any)?.detail ?? `HTTP ${response.status}`);
      }
    } catch (err) {
      const queue = await AsyncStorage.getItem('satam_incidente_queue');
      const items: any[] = queue ? JSON.parse(queue) : [];
      items.push({
        id: `offline-${Date.now()}`,
        timestamp: Date.now(),
        sincronizado: false,
        ...body,
      });
      await AsyncStorage.setItem('satam_incidente_queue', JSON.stringify(items));
      setStepResult('local');
      setStep(3);
    } finally {
      setLoadingEnvio(false);
    }
  }

  if (step === 1) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{esCiudadano ? 'Enviar Reporte' : 'Nuevo Incidente'}</Text>
        <Text style={styles.subtitle}>Selecciona el tipo de amenaza</Text>
        <View style={styles.grid}>
          {TIPOS.map((tipo) => (
            <TouchableOpacity
              key={tipo.key}
              style={[styles.tipoCard, { borderColor: tipo.color }]}
              onPress={() => {
                setTipoSeleccionado(tipo.key);
                setStep(2);
              }}
            >
              <Ionicons name={tipo.icon} size={36} color={tipo.color} />
              <Text style={[styles.tipoLabel, { color: tipo.color }]}>{tipo.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  if (step === 2) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backRow} onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={20} color="#374151" />
          <Text style={styles.backText}>{tipoSeleccionado}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          numberOfLines={4}
          placeholder="Describe el incidente..."
          value={descripcion}
          onChangeText={setDescripcion}
          textAlignVertical="top"
        />

        <Text style={styles.label}>
          Municipio <Text style={styles.required}>*</Text>
        </Text>
        <MunicipioPicker
          value={municipio}
          onChange={(codigo, nombre, id) => {
            setMunicipio(codigo);
            setMunicipioNombre(nombre);
            setMunicipioId(id);
          }}
          placeholder="Seleccionar municipio (requerido)"
        />

        <Text style={styles.label}>Vereda / Sector</Text>
        <TextInput
          style={styles.input}
          placeholder="Vereda o sector (opcional)"
          value={vereda}
          onChangeText={setVereda}
        />

        <Text style={styles.label}>Foto (opcional)</Text>
        {foto ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: foto }} style={styles.preview} />
            <TouchableOpacity
              style={[styles.checkRow]}
              onPress={() => setFotoAutorizada(!fotoAutorizada)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, fotoAutorizada && styles.checkboxActivo]}>
                {fotoAutorizada && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkLabel}>
                Autorizo incluir esta foto en el reporte
              </Text>
            </TouchableOpacity>
            <View style={styles.fotoAcciones}>
              <TouchableOpacity style={styles.fotoBtnSecundario} onPress={tomarFotoCamara}>
                <Ionicons name="camera" size={15} color="#3B82F6" />
                <Text style={styles.fotoBtnSecundarioTexto}>Nueva foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fotoBtnSecundario} onPress={seleccionarDeGaleria}>
                <Ionicons name="images" size={15} color="#3B82F6" />
                <Text style={styles.fotoBtnSecundarioTexto}>Galería</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fotoBtnSecundario, styles.fotoBtnEliminar]}
                onPress={() => { setFoto(null); setFotoAutorizada(false); }}
              >
                <Ionicons name="trash" size={15} color="#DC2626" />
                <Text style={[styles.fotoBtnSecundarioTexto, { color: '#DC2626' }]}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.fotoBotonesVacio}>
            <TouchableOpacity style={styles.actionBtn} onPress={tomarFotoCamara}>
              <Ionicons name="camera" size={20} color="#3B82F6" />
              <Text style={styles.actionBtnText}>Tomar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={seleccionarDeGaleria}>
              <Ionicons name="images" size={20} color="#3B82F6" />
              <Text style={styles.actionBtnText}>Desde galería</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Ubicación GPS</Text>
        {coords ? (
          <View style={styles.coordsContainer}>
            <Text style={styles.coordsText}>
              Lat: {coords.lat.toFixed(6)} · Lng: {coords.lng.toFixed(6)}
            </Text>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => setCoords(null)}>
              <Ionicons name="trash" size={16} color="#fff" />
              <Text style={styles.deleteBtnText}>Eliminar coordenadas</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.actionBtn} onPress={getLocation} disabled={loadingGps}>
            {loadingGps ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Ionicons name="location" size={20} color="#3B82F6" />
            )}
            <Text style={styles.actionBtnText}>
              {loadingGps ? 'Obteniendo ubicación...' : 'Obtener GPS'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (!municipioId || (foto && !fotoAutorizada)) ? styles.submitBtnDisabled : null]}
          onPress={handleRegistrar}
          disabled={!municipioId || loadingEnvio || (!!foto && !fotoAutorizada)}
        >
          {loadingEnvio ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>{esCiudadano ? 'Enviar Reporte' : 'Registrar Incidente'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // step === 3: resultado
  return (
    <View style={styles.container}>
      <View style={styles.resultContainer}>
        <Ionicons
          name={stepResult === 'ok' ? 'checkmark-circle' : 'cloud-offline'}
          size={72}
          color={stepResult === 'ok' ? '#16A34A' : '#EA580C'}
        />
        <Text style={styles.resultTitle}>
          {stepResult === 'ok'
            ? (esCiudadano ? 'Reporte enviado' : 'Incidente registrado')
            : 'Guardado localmente'}
        </Text>
        <Text style={styles.resultBody}>
          {stepResult === 'ok'
            ? (esCiudadano
                ? 'Tu reporte fue enviado exitosamente. Las autoridades lo revisarán.'
                : 'El incidente fue registrado exitosamente en el servidor.')
            : 'Sin conexión. El reporte se sincronizará automáticamente cuando haya red.'}
        </Text>
        <TouchableOpacity style={styles.submitBtn} onPress={() => router.back()}>
          <Text style={styles.submitBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  blockedContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  blockedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  blockedBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  loginBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  loginBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  tipoCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tipoLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    marginTop: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 14,
  },
  required: {
    color: '#DC2626',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  multiline: {
    height: 90,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionBtnText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  previewContainer: {
    gap: 8,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  coordsContainer: {
    gap: 8,
  },
  coordsText: {
    fontSize: 13,
    color: '#374151',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    fontFamily: 'monospace',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  deleteBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  fotoBotonesVacio: {
    flexDirection: 'row',
    gap: 10,
  },
  fotoAcciones: {
    flexDirection: 'row',
    gap: 8,
  },
  fotoBtnSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  fotoBtnEliminar: {
    borderColor: '#DC2626',
  },
  fotoBtnSecundarioTexto: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxActivo: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkLabel: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  resultBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
