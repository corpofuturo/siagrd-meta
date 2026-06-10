import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, type Database } from '../../lib/supabase';
import {
  getAlertasCachedOrFetch,
  getNivelMaximo,
} from '../../services/alertas.service';
import { MUNICIPIOS_META, NIVEL_COLORES, type NivelAlerta } from '../../constants';

type Alerta = Database['public']['Tables']['alertas']['Row'];

const MUNICIPIO_KEY = '@siagrd:municipio';
const DIAS_HISTORIAL = 30;

export default function AlertasScreen() {
  const [alertaActiva, setAlertaActiva] = useState<Alerta | null>(null);
  const [historial, setHistorial] = useState<Alerta[]>([]);
  const [municipioNombre, setMunicipioNombre] = useState('Villavicencio');
  const [municipioCodigo, setMunicipioCodigo] = useState('50001');
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const codigo =
        (await AsyncStorage.getItem(MUNICIPIO_KEY)) ?? '50001';
      setMunicipioCodigo(codigo);
      const mun = MUNICIPIOS_META.find((m) => m.codigo_dane === codigo);
      setMunicipioNombre(mun?.nombre ?? 'Villavicencio');

      // Alerta activa del municipio (cache)
      const activas = await getAlertasCachedOrFetch();
      const activa =
        activas.find((a) => a.municipio_codigo === codigo && a.activa) ?? null;
      setAlertaActiva(activa);
      setOffline(false);

      // Historial 30 días (requiere conexión, falla silenciosa en offline)
      const hace30dias = new Date(
        Date.now() - DIAS_HISTORIAL * 24 * 60 * 60 * 1000
      ).toISOString();

      if (supabase) {
        const { data } = await supabase
          .from('alertas')
          .select('*')
          .eq('municipio_codigo', codigo)
          .gte('created_at', hace30dias)
          .order('created_at', { ascending: false });

        if (data) setHistorial(data as Alerta[]);
      }
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Alertas</Text>
        <Text style={styles.headerMunicipio}>{municipioNombre}</Text>
      </View>

      {offline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineTexto}>
            Sin conexión — mostrando datos guardados
          </Text>
        </View>
      )}

      <FlatList
        data={historial}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            {/* Alerta activa destacada */}
            {alertaActiva ? (
              <AlertaCard alerta={alertaActiva} destacada />
            ) : (
              <View style={styles.sinAlertaCard}>
                <Text style={styles.sinAlertaEmoji}>✅</Text>
                <Text style={styles.sinAlertaTexto}>
                  Sin alerta activa en {municipioNombre}
                </Text>
              </View>
            )}

            <Text style={styles.seccionTitulo}>
              Historial últimos {DIAS_HISTORIAL} días
            </Text>
          </>
        }
        renderItem={({ item }) => <AlertaCard alerta={item} />}
        ListEmptyComponent={
          <Text style={styles.vacio}>Sin alertas en el período</Text>
        }
        contentContainerStyle={styles.lista}
      />
    </View>
  );
}

function AlertaCard({
  alerta,
  destacada = false,
}: {
  alerta: Alerta;
  destacada?: boolean;
}) {
  const nivel = alerta.nivel as NivelAlerta;
  const colores = NIVEL_COLORES[nivel];
  const fecha = new Date(alerta.created_at).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colores.bg, borderColor: colores.bgLight },
        destacada && styles.cardDestacada,
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[styles.nivelBadge, { backgroundColor: colores.bgLight }]}
        >
          <Text style={[styles.nivelBadgeTexto, { color: colores.text }]}>
            {nivel}
          </Text>
        </View>
        <Text style={[styles.cardFecha, { color: colores.text }]}>{fecha}</Text>
      </View>
      <Text style={[styles.cardTitulo, { color: colores.text }]}>
        {alerta.titulo}
      </Text>
      <Text style={[styles.cardDescripcion, { color: colores.text }]}>
        {alerta.descripcion}
      </Text>
      {alerta.activa && (
        <View style={styles.activaBadge}>
          <Text style={styles.activaBadgeTexto}>ACTIVA</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1117' },
  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#111827',
  },
  headerTitulo: { fontSize: 28, fontWeight: '700', color: '#F9FAFB' },
  headerMunicipio: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  offlineBanner: {
    backgroundColor: '#374151',
    padding: 10,
    alignItems: 'center',
  },
  offlineTexto: { color: '#D1D5DB', fontSize: 13 },
  lista: { padding: 16, gap: 12 },
  seccionTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 20,
    marginBottom: 8,
  },
  sinAlertaCard: {
    backgroundColor: '#052E16',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#166534',
  },
  sinAlertaEmoji: { fontSize: 36 },
  sinAlertaTexto: { fontSize: 16, color: '#86EFAC', fontWeight: '600' },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  cardDestacada: { borderWidth: 2 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nivelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  nivelBadgeTexto: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  cardFecha: { fontSize: 12, opacity: 0.7 },
  cardTitulo: { fontSize: 16, fontWeight: '700' },
  cardDescripcion: { fontSize: 14, opacity: 0.85, lineHeight: 20 },
  activaBadge: {
    backgroundColor: '#EF4444',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  activaBadgeTexto: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  vacio: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 15,
  },
});
