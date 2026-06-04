import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { withObservables } from '@nozbe/watermelondb/react';
import { database, Incidente } from '../../database';

const NIVEL_COLORES: Record<string, string> = {
  ROJO: '#FF3B30',
  NARANJA: '#FF9500',
  AMARILLO: '#FFCC00',
  VERDE: '#34C759',
};

// Colombia centro
const INITIAL_REGION: Region = {
  latitude: 4.5709,
  longitude: -74.2973,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

interface MapaScreenProps {
  incidentes: Incidente[];
}

function MapaScreenBase({ incidentes }: MapaScreenProps) {
  const router = useRouter();
  const [seleccionado, setSeleccionado] = useState<Incidente | null>(null);

  const handleMarkerPress = useCallback((incidente: Incidente) => {
    setSeleccionado(incidente);
  }, []);

  const handleVerDetalle = () => {
    if (seleccionado) {
      router.push(`/incidente/${seleccionado.id}`);
      setSeleccionado(null);
    }
  };

  // Filtrar incidentes con coordenadas válidas
  const incidentesConCoords = incidentes.filter((i) => i.lat !== 0 && i.lng !== 0);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.mapa}
        initialRegion={INITIAL_REGION}
        mapType="standard"
        showsUserLocation
        showsMyLocationButton
        onPress={() => setSeleccionado(null)}
      >
        {incidentesConCoords.map((incidente) => (
          <Marker
            key={incidente.id}
            coordinate={{ latitude: incidente.lat, longitude: incidente.lng }}
            pinColor={NIVEL_COLORES[incidente.nivelAlerta] ?? '#4A5568'}
            onPress={() => handleMarkerPress(incidente)}
          />
        ))}
      </MapView>

      {/* Contador de incidentes */}
      <View style={styles.contador}>
        <Text style={styles.contadorText}>{incidentesConCoords.length} incidentes</Text>
      </View>

      {/* Bottom sheet al seleccionar marker */}
      {seleccionado && (
        <View style={styles.bottomSheet}>
          <View
            style={[
              styles.nivelBarra,
              { backgroundColor: NIVEL_COLORES[seleccionado.nivelAlerta] ?? '#4A5568' },
            ]}
          />
          <View style={styles.sheetContent}>
            <Text style={styles.sheetCodigo}>{seleccionado.codigo}</Text>
            <Text style={styles.sheetTitulo} numberOfLines={2}>
              {seleccionado.titulo}
            </Text>
            <Text style={styles.sheetMeta}>
              {seleccionado.tipoAmenaza} · {seleccionado.estado}
            </Text>
            {!seleccionado.synced && (
              <Text style={styles.sheetPendiente}>Pendiente de sincronización</Text>
            )}
            <TouchableOpacity style={styles.verBtn} onPress={handleVerDetalle} activeOpacity={0.8}>
              <Text style={styles.verBtnText}>Ver Detalle</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const enhance = withObservables([], () => ({
  incidentes: database.get<Incidente>('incidentes').query().observe(),
}));

export default enhance(MapaScreenBase);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  mapa: { flex: 1 },
  contador: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#0D1320CC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E2D45',
  },
  contadorText: { color: '#A0AEC0', fontSize: 13, fontWeight: '600' },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0D1320',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: '#1E2D45',
    overflow: 'hidden',
  },
  nivelBarra: { height: 4 },
  sheetContent: { padding: 16, paddingBottom: 32 },
  sheetCodigo: { color: '#718096', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  sheetTitulo: { color: '#F7FAFC', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sheetMeta: { color: '#718096', fontSize: 13, marginBottom: 4 },
  sheetPendiente: { color: '#F59E0B', fontSize: 12, marginBottom: 8 },
  verBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  verBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
