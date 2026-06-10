import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius, touch } from '../tokens';
import type { Incidente, NivelAlerta } from '../types';
import { AlertaBadge } from './AlertaBadge';
import { AmenazaIcon } from './AmenazaIcon';

interface IncidentCardProps {
  incidente: Incidente;
  distancia_km?: number;
  onPress: () => void;
}

const NIVEL_BORDER_COLOR: Record<NivelAlerta, string> = {
  VERDE:    colors.alerta.verde.solid,
  AMARILLO: colors.alerta.amarillo.solid,
  NARANJA:  colors.alerta.naranja.solid,
  ROJO:     colors.alerta.rojo.solid,
};

/**
 * Calcula tiempo relativo desde una fecha ISO
 */
function tiempoRelativo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return `hace ${Math.floor(hrs / 24)} d`;
}

export function IncidentCard({ incidente, distancia_km, onPress }: IncidentCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        { borderLeftColor: NIVEL_BORDER_COLOR[incidente.nivel_alerta] },
      ]}
    >
      <AlertaBadge nivel={incidente.nivel_alerta} size="sm" />
      <AmenazaIcon tipo={incidente.tipo_amenaza} size={20} />
      <View style={styles.info}>
        <Text style={styles.titulo} numberOfLines={1}>{incidente.titulo}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {incidente.municipio_nombre ?? incidente.municipio_id}
          {distancia_km !== undefined ? ` · ${distancia_km.toFixed(1)} km` : ''}
        </Text>
      </View>
      <Text style={styles.tiempo}>{tiempoRelativo(incidente.created_at)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.default,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.standard,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  info: {
    flex: 1,
  },
  titulo: {
    fontFamily: typography.family.body,
    fontWeight: typography.weight.semibold,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  meta: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  tiempo: {
    fontFamily: typography.family.mono,
    fontSize: typography.size.xs,
    color: colors.text.disabled,
  },
});
