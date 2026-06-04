import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase } from '../../lib/supabase';
import { MUNICIPIOS_META } from '../../constants';

const MUNICIPIO_KEY = '@siagrd:municipio';
const NOTIF_KEY = '@siagrd:notificaciones';
const IDIOMA_KEY = '@siagrd:idioma';

type Idioma = 'es' | 'sik';

export default function PerfilScreen() {
  const [municipio, setMunicipio] = useState('50001');
  const [notificaciones, setNotificaciones] = useState(false);
  const [idioma, setIdioma] = useState<Idioma>('es');
  const [sesionActiva, setSesionActiva] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [mostrarSelectorMunicipio, setMostrarSelectorMunicipio] =
    useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarPreferencias();
    verificarSesion();
  }, []);

  const cargarPreferencias = async () => {
    const [mun, notif, lang] = await AsyncStorage.multiGet([
      MUNICIPIO_KEY,
      NOTIF_KEY,
      IDIOMA_KEY,
    ]);
    if (mun[1]) setMunicipio(mun[1]);
    if (notif[1]) setNotificaciones(notif[1] === 'true');
    if (lang[1]) setIdioma(lang[1] as Idioma);
  };

  const verificarSesion = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setSesionActiva(!!user);
    setUserEmail(user?.email ?? '');
  };

  const guardarMunicipio = async (codigo: string) => {
    setMunicipio(codigo);
    await AsyncStorage.setItem(MUNICIPIO_KEY, codigo);
    setMostrarSelectorMunicipio(false);
    mostrarGuardado();
  };

  const cambiarNotificaciones = async (valor: boolean) => {
    if (valor) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permisos requeridos',
          'Activa las notificaciones en ajustes del dispositivo.'
        );
        return;
      }
    }
    setNotificaciones(valor);
    await AsyncStorage.setItem(NOTIF_KEY, String(valor));
    mostrarGuardado();
  };

  const cambiarIdioma = async (lang: Idioma) => {
    setIdioma(lang);
    await AsyncStorage.setItem(IDIOMA_KEY, lang);
    mostrarGuardado();
  };

  const mostrarGuardado = () => {
    setGuardando(true);
    setTimeout(() => setGuardando(false), 1500);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setSesionActiva(false);
    setUserEmail('');
  };

  const municipioNombre =
    MUNICIPIOS_META.find((m) => m.codigo_dane === municipio)?.nombre ??
    'Villavicencio';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Perfil</Text>
        {guardando && (
          <View style={styles.guardadoBadge}>
            <Text style={styles.guardadoTexto}>✓ Guardado</Text>
          </View>
        )}
      </View>

      {/* Municipio */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Mi municipio</Text>
        <TouchableOpacity
          style={styles.selectorBtn}
          onPress={() => setMostrarSelectorMunicipio((v) => !v)}
        >
          <Text style={styles.selectorTexto}>{municipioNombre}</Text>
          <Text style={styles.selectorChevron}>
            {mostrarSelectorMunicipio ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {mostrarSelectorMunicipio && (
          <ScrollView
            style={styles.municipioLista}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {MUNICIPIOS_META.map((m) => (
              <TouchableOpacity
                key={m.codigo_dane}
                style={[
                  styles.municipioItem,
                  m.codigo_dane === municipio && styles.municipioItemActivo,
                ]}
                onPress={() => guardarMunicipio(m.codigo_dane)}
              >
                <Text
                  style={[
                    styles.municipioItemTexto,
                    m.codigo_dane === municipio &&
                      styles.municipioItemTextoActivo,
                  ]}
                >
                  {m.nombre}
                </Text>
                {m.codigo_dane === municipio && (
                  <Text style={styles.municipioCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Notificaciones */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Alertas push</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>
            {notificaciones
              ? 'Activadas — recibirás alertas de tu municipio'
              : 'Desactivadas'}
          </Text>
          <Switch
            value={notificaciones}
            onValueChange={cambiarNotificaciones}
            trackColor={{ false: '#374151', true: '#166534' }}
            thumbColor={notificaciones ? '#22C55E' : '#9CA3AF'}
          />
        </View>
      </View>

      {/* Idioma */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Idioma</Text>
        <View style={styles.idiomaRow}>
          <TouchableOpacity
            style={[
              styles.idiomaBtn,
              idioma === 'es' && styles.idiomaBtnActivo,
            ]}
            onPress={() => cambiarIdioma('es')}
          >
            <Text
              style={[
                styles.idiomaBtnTexto,
                idioma === 'es' && styles.idiomaBtnTextoActivo,
              ]}
            >
              Español
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.idiomaBtn,
              idioma === 'sik' && styles.idiomaBtnActivo,
            ]}
            onPress={() => cambiarIdioma('sik')}
          >
            <Text
              style={[
                styles.idiomaBtnTexto,
                idioma === 'sik' && styles.idiomaBtnTextoActivo,
              ]}
            >
              Sikuani
            </Text>
          </TouchableOpacity>
        </View>
        {idioma === 'sik' && (
          <Text style={styles.sikuaniNota}>
            Traducción Sikuani en proceso — DT-003
          </Text>
        )}
      </View>

      {/* Login opcional */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Cuenta (opcional)</Text>
        {sesionActiva ? (
          <View style={styles.sesionActivaCard}>
            <Text style={styles.sesionEmail}>{userEmail}</Text>
            <Text style={styles.sesionSubtexto}>
              Tus reportes quedan registrados con tu cuenta.
            </Text>
            <TouchableOpacity
              style={styles.cerrarSesionBtn}
              onPress={cerrarSesion}
            >
              <Text style={styles.cerrarSesionTexto}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.loginCard}>
            <Text style={styles.loginDesc}>
              Con cuenta puedes rastrear tus reportes y recibir alertas
              personalizadas. No es obligatorio para usar la app.
            </Text>
            <TouchableOpacity style={styles.loginBtn} onPress={() => {}}>
              <Text style={styles.loginBtnTexto}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTexto}>SIAGRD Meta · Corpofuturo</Text>
        <Text style={styles.footerVersion}>v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1117' },
  content: { paddingBottom: 40 },
  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titulo: { fontSize: 28, fontWeight: '700', color: '#F9FAFB' },
  guardadoBadge: {
    backgroundColor: '#052E16',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  guardadoTexto: { color: '#86EFAC', fontSize: 13, fontWeight: '600' },

  seccion: {
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  seccionTitulo: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },

  selectorBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectorTexto: { fontSize: 16, color: '#F9FAFB', fontWeight: '600' },
  selectorChevron: { color: '#9CA3AF', fontSize: 14 },
  municipioLista: {
    maxHeight: 240,
    backgroundColor: '#111827',
    borderRadius: 10,
  },
  municipioItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  municipioItemActivo: { backgroundColor: '#052E16' },
  municipioItemTexto: { fontSize: 15, color: '#D1D5DB' },
  municipioItemTextoActivo: { color: '#86EFAC', fontWeight: '600' },
  municipioCheck: { color: '#22C55E', fontSize: 16 },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontSize: 14, color: '#D1D5DB', flex: 1, lineHeight: 20 },

  idiomaRow: { flexDirection: 'row', gap: 10 },
  idiomaBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  idiomaBtnActivo: { backgroundColor: '#1D4ED8' },
  idiomaBtnTexto: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  idiomaBtnTextoActivo: { color: '#FFF' },
  sikuaniNota: { fontSize: 11, color: '#F59E0B', textAlign: 'center' },

  loginCard: { gap: 12 },
  loginDesc: { fontSize: 14, color: '#9CA3AF', lineHeight: 20 },
  loginBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  loginBtnTexto: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  sesionActivaCard: { gap: 8 },
  sesionEmail: { fontSize: 16, fontWeight: '600', color: '#60A5FA' },
  sesionSubtexto: { fontSize: 13, color: '#9CA3AF' },
  cerrarSesionBtn: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  cerrarSesionTexto: { color: '#EF4444', fontWeight: '600', fontSize: 14 },

  footer: { alignItems: 'center', marginTop: 32, gap: 4 },
  footerTexto: { color: '#6B7280', fontSize: 13 },
  footerVersion: { color: '#4B5563', fontSize: 11 },
});
