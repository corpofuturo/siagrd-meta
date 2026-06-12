import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';

interface MenuItem {
  icon: string;
  title: string;
  desc: string;
  route: string;
  roles?: string[];
}

const ALL_ITEMS: MenuItem[] = [
  { icon: '🚨', title: 'Nuevo Incidente', desc: 'Registrar evento de emergencia', route: '/(tabs)/nuevo-incidente' },
  { icon: '🔄', title: 'Sync', desc: 'Sincronizar datos pendientes', route: '/(tabs)/sync' },
  { icon: '📊', title: 'Estadísticas', desc: 'Incidentes por tipo y municipio', route: '/estadisticas' },
  { icon: '🏥', title: 'Damnificados', desc: 'Registro de personas afectadas', route: '/damnificados' },
  { icon: '📋', title: 'Historial', desc: 'Alertas históricas del sistema', route: '/historial' },
  { icon: '📝', title: 'Reportes Ciudadanos', desc: 'Revisar reportes recibidos', route: '/reportes' },
  { icon: '🏗️', title: 'Recursos', desc: 'Equipos y materiales disponibles', route: '/recursos' },
  { icon: '🗺️', title: 'Municipios', desc: 'Lista de municipios del Meta', route: '/municipios' },
  { icon: '⚙️', title: 'Administración', desc: 'Panel de administración del sistema', route: '/admin', roles: ['admin', 'cdgrd', 'cmgrd'] },
  { icon: '👤', title: 'Usuarios', desc: 'Gestión de usuarios del sistema', route: '/usuarios', roles: ['admin', 'cdgrd', 'cmgrd'] },
  { icon: '📤', title: 'Exportaciones', desc: 'Descargar reportes en CSV', route: '/exportaciones', roles: ['admin', 'cdgrd', 'cmgrd'] },
];

export default function MenuScreen() {
  const { session } = useAuth();
  const rol: string = (session as any)?.user?.rol ?? 'operador';

  const items = ALL_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(rol)
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.route}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.75}
          >
            <Text style={styles.cardIcon}>{item.icon}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardIcon: {
    fontSize: 30,
  },
  cardTitle: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '700',
  },
  cardDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
  },
});
