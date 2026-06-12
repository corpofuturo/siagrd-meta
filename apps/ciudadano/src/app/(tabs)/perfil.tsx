import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const ROL_LABELS: Record<string, string> = {
  CIUDADANO: 'Ciudadano',
  SOCORRO: 'Organismo de Socorro',
  CDGRD: 'Coord. Departamental',
  ADMIN: 'Administrador',
  ciudadano: 'Ciudadano',
  coordinador_municipal: 'Coord. Municipal',
  coordinador_departamental: 'Coord. Departamental',
  operador: 'Operador',
  admin: 'Administrador',
};

const ROL_COLORS: Record<string, string> = {
  CIUDADANO: '#34C759',
  SOCORRO: '#FF9500',
  CDGRD: '#FF3B30',
  ADMIN: '#A78BFA',
  ciudadano: '#34C759',
  coordinador_municipal: '#FF9500',
  coordinador_departamental: '#FF3B30',
  operador: '#60A5FA',
  admin: '#A78BFA',
};

const PANEL_URL = 'https://siagrd-panel-web.netlify.app';

interface MenuItemProps {
  icon: string;
  label: string;
  desc?: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, desc, onPress, danger }: MenuItemProps) {
  return (
    <TouchableOpacity style={[styles.menuItem, danger && styles.menuItemDanger]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons name={icon as any} size={20} color={danger ? '#EF4444' : '#60A5FA'} />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
        {desc && <Text style={styles.menuDesc}>{desc}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#374151" />
    </TouchableOpacity>
  );
}

export default function PerfilScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const user = session?.user ?? (session as any);
  const rol: string = user?.rol ?? '';
  const isAdmin = rol === 'ADMIN' || rol === 'admin';
  const isCdgrd = rol === 'CDGRD' || isAdmin;
  const isSocorro = rol === 'SOCORRO' || isAdmin;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const openPanel = (path = '') => Linking.openURL(PANEL_URL + path);

  const rolColor = ROL_COLORS[rol] ?? '#9CA3AF';
  const rolLabel = ROL_LABELS[rol] ?? rol;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <View style={[styles.avatar, { borderColor: rolColor }]}>
          <Ionicons name="person" size={44} color={rolColor} />
        </View>
      </View>

      {/* Info card */}
      <View style={styles.card}>
        {user ? (
          <>
            <Text style={styles.nombre}>{user.nombre} {user.apellido}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: rolColor + '22', borderColor: rolColor }]}>
                <Text style={[styles.badgeText, { color: rolColor }]}>{rolLabel}</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.sinSesion}>No hay sesión activa</Text>
        )}
      </View>

      {/* Menú Admin / CDGRD */}
      {(isAdmin || isCdgrd) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ADMINISTRACIÓN</Text>
          {isAdmin && (
            <MenuItem icon="settings-outline" label="Configuración del Sistema" desc="Departamento, DANE, UNGRD" onPress={() => router.push('/admin/configuracion' as any)} />
          )}
          <MenuItem icon="business-outline" label="Organismos de Socorro" desc="Cruz Roja, Bomberos, Defensa Civil..." onPress={() => router.push('/admin/organismos' as any)} />
          <MenuItem icon="people-outline" label="Comités GRD" desc="CONGRD, CDGRD, SDGRD, CMGRD" onPress={() => router.push('/admin/comites' as any)} />
          <MenuItem icon="home-outline" label="Juntas de Acción Comunal" desc="Gestión de JAC / JAL" onPress={() => router.push('/admin/jal' as any)} />
          {isAdmin && (
            <MenuItem icon="business-outline" label="Alcaldías" desc="Gestión de alcaldías municipales" onPress={() => router.push('/admin/alcaldias' as any)} />
          )}
          <MenuItem icon="person-add-outline" label="Grupos de Usuarios" desc="Socorro, Ciudadanos, Comités" onPress={() => router.push('/admin/grupos' as any)} />
          {isAdmin && (
            <MenuItem icon="bar-chart-outline" label="Estadísticas" desc="Reportes y análisis" onPress={() => openPanel('/estadisticas')} />
          )}
          {isAdmin && (
            <MenuItem icon="grid-outline" label="Panel Completo" desc="siagrd-panel-web.netlify.app" onPress={() => Linking.openURL(PANEL_URL)} />
          )}
        </View>
      )}

      {/* Menú Socorro */}
      {isSocorro && !isAdmin && !isCdgrd && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MI ORGANISMO</Text>
          <MenuItem icon="business-outline" label="Organismos de Socorro" desc="Ver mi organismo" onPress={() => router.push('/admin/organismos' as any)} />
        </View>
      )}

      {/* Menú general */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PANEL WEB</Text>
        <MenuItem icon="globe-outline" label="Abrir Panel Completo" desc="siagrd-panel-web.netlify.app" onPress={() => openPanel('/')} />
      </View>

      {/* Cerrar sesión */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color="#FFF" />
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  content: { paddingBottom: 48, paddingTop: 48, alignItems: 'center' },

  avatarWrapper: { marginBottom: 20 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },

  card: {
    width: '90%', backgroundColor: '#1F2937', borderRadius: 16,
    padding: 20, gap: 6, marginBottom: 24, alignItems: 'center',
  },
  nombre: { fontSize: 20, fontWeight: '700', color: '#F9FAFB' },
  email: { fontSize: 13, color: '#9CA3AF' },
  badgeRow: { flexDirection: 'row', marginTop: 4 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  sinSesion: { fontSize: 15, color: '#6B7280' },

  section: { width: '90%', marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#4B5563', letterSpacing: 1.2, marginBottom: 8, marginLeft: 4 },

  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2937',
    borderRadius: 12, padding: 14, marginBottom: 6, gap: 12,
  },
  menuItemDanger: { backgroundColor: '#1F1010' },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1D4ED822', alignItems: 'center', justifyContent: 'center' },
  menuIconDanger: { backgroundColor: '#EF444422' },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#F9FAFB' },
  menuLabelDanger: { color: '#EF4444' },
  menuDesc: { fontSize: 12, color: '#6B7280', marginTop: 1 },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#DC2626', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32, gap: 8, width: '90%', marginTop: 8,
  },
  signOutText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
