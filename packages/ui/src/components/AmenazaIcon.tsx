import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../tokens';
import type { TipoAmenaza } from '../types';

interface AmenazaIconProps {
  tipo: TipoAmenaza;
  size?: number;
  withLabel?: boolean;
}

const EMOJI_MAP: Record<TipoAmenaza, string> = {
  INUNDACION:        '🌊',
  REMOCION:          '🏔️',
  SISMO:             '📳',
  INCENDIO_FORESTAL: '🔥',
  ACCIDENTE_VIA:     '🚗',
  DERRAME_HC:        '🛢️',
  OTRO:              '⚠️',
};

const LABEL_MAP: Record<TipoAmenaza, string> = {
  INUNDACION:        'Inundación',
  REMOCION:          'Remoción',
  SISMO:             'Sismo',
  INCENDIO_FORESTAL: 'Incendio Forestal',
  ACCIDENTE_VIA:     'Accidente Vía',
  DERRAME_HC:        'Derrame HC',
  OTRO:              'Otro',
};

export function AmenazaIcon({ tipo, size = 24, withLabel = false }: AmenazaIconProps) {
  return (
    <View style={styles.container}>
      <Text style={{ fontSize: size }}>{EMOJI_MAP[tipo]}</Text>
      {withLabel && (
        <Text
          style={[
            styles.label,
            { color: colors.amenaza[tipo], fontSize: typography.size.sm },
          ]}
        >
          {LABEL_MAP[tipo]}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1],
  },
  label: {
    fontFamily: typography.family.body,
    fontWeight: typography.weight.medium,
  },
});
