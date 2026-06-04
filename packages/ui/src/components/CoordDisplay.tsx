import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../tokens';

interface CoordDisplayProps {
  lat: number;
  lng: number;
  precision?: number;
  fuente?: 'GPS_ALTA' | 'GPS_BAJA' | 'RED' | 'MANUAL';
}

/**
 * Convierte grados decimales a formato Grados°Minutos'Segundos"Hemisferio
 */
function decimalToDMS(decimal: number, isLat: boolean): string {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minDecimal = (abs - deg) * 60;
  const min = Math.floor(minDecimal);
  const sec = ((minDecimal - min) * 60).toFixed(1);

  let hemisphere: string;
  if (isLat) {
    hemisphere = decimal >= 0 ? 'N' : 'S';
  } else {
    hemisphere = decimal >= 0 ? 'E' : 'W';
  }

  return `${deg}°${min}'${sec}"${hemisphere}`;
}

const FUENTE_COLOR: Record<NonNullable<CoordDisplayProps['fuente']>, string> = {
  GPS_ALTA: colors.recurso.disponible,
  GPS_BAJA: colors.action.warning,
  RED:      colors.text.secondary,
  MANUAL:   colors.text.disabled,
};

export function CoordDisplay({ lat, lng, precision, fuente }: CoordDisplayProps) {
  const latStr = decimalToDMS(lat, true);
  const lngStr = decimalToDMS(lng, false);
  const precisionStr = precision !== undefined ? ` ±${precision}m` : '';
  const fuenteColor = fuente ? FUENTE_COLOR[fuente] : colors.text.secondary;

  return (
    <View style={styles.container}>
      <Text style={styles.coords}>
        {latStr}, {lngStr}
        <Text style={[styles.precision, { color: fuenteColor }]}>{precisionStr}</Text>
      </Text>
      {fuente && (
        <Text style={[styles.fuente, { color: fuenteColor }]}>{fuente}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  coords: {
    fontFamily: typography.family.mono,
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
  precision: {
    fontFamily: typography.family.mono,
    fontSize: typography.size.xs,
  },
  fuente: {
    fontFamily: typography.family.mono,
    fontSize: typography.size.xs,
    letterSpacing: 0.5,
  },
});
