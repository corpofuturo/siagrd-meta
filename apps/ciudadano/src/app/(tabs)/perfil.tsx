import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const ROL_LABELS: Record<string, string> = {
  ciudadano: 'Ciudadano',
  coordinador_municipal: 'Coord. Municipal',
  coordinador_departamental: 'Coord. Departamental',
  operador: 'Operador',
  admin: 'Admin',
};

const ROL_COLORS: Record<string, string> = {
  ciudadano: '#34C759',
  coordinador_municipal: '#FF9500',
  coordinador_departamental: '#FF3B30',
  operador: '#60A5FA',
  admin: '#A78BFA',
};

export default function PerfilScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();

  const user = session?.user ?? (session as any);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const rolColor = user?.rol ? (ROL_COLORS[user.rol] ?? '#9CA3AF') : '#9CA3AF';
  const rolLabel = user?.rol ? (ROL_LABELS[user.rol] ?? user.rol) : '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color="#60A5FA" />
        </View>
      </View>

      {/* Info card */}
      <View style={styles.card}>
        {user ? (
          <>
            <Text style={styles.nombre}>
              {user.nombre} {user.apellido}
            </Text>
            <Text style={styles.email}>{user.email}</Text>

            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: rolColor + '22', borderColor: rolColor }]}>
                <Text style={[styles.badgeText, { color: rolColor }]}>{rolLabel}</Text>
              </View>
            </View>

            {user.municipio_id != null && (
              <Text style={styles.municipio}>Municipio ID: {user.municipio_id}</Text>
            )}
          </>
        ) : (
          <Text style={styles.sinSesion}>No hay sesión activa</Text>
        )}
      </View>

      {/* Botón cerrar sesión */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color="#FFF" style={styles.signOutIcon} />
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  content: { paddingBottom: 48, paddingTop: 60, alignItems: 'center' },

  avatarWrapper: { marginBottom: 24 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    width: '88%',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    gap: 8,
    marginBottom: 32,
  },
  nombre: { fontSize: 20, fontWeight: '700', color: '#F9FAFB', textAlign: 'center' },
  email: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  badgeRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 13, fontWeight: '600' },
  municipio: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4 },
  sinSesion: { fontSize: 15, color: '#6B7280', textAlign: 'center' },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    gap: 8,
  },
  signOutIcon: { marginRight: 4 },
  signOutText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
