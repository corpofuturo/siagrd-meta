import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../tokens';
import type { NivelAlerta } from '../types';

interface AlertaBadgeProps {
  nivel: NivelAlerta;
  size?: 'sm' | 'md' | 'lg';
}

const NIVEL_MAP: Record<NivelAlerta, { label: string; bg: string; text: string; solid: string }> = {
  VERDE:    { label: 'VERDE',    bg: colors.alerta.verde.bg,    text: colors.alerta.verde.text,    solid: colors.alerta.verde.solid },
  AMARILLO: { label: 'AMARILLO', bg: colors.alerta.amarillo.bg, text: colors.alerta.amarillo.text, solid: colors.alerta.amarillo.solid },
  NARANJA:  { label: 'NARANJA',  bg: colors.alerta.naranja.bg,  text: colors.alerta.naranja.text,  solid: colors.alerta.naranja.solid },
  ROJO:     { label: 'ROJO',     bg: colors.alerta.rojo.bg,     text: colors.alerta.rojo.text,     solid: colors.alerta.rojo.solid },
};

const SIZE_MAP = {
  sm: { fontSize: typography.size.xs, paddingH: spacing[2], paddingV: spacing[1] },
  md: { fontSize: typography.size.sm, paddingH: spacing[3], paddingV: spacing[1] },
  lg: { fontSize: typography.size.base, paddingH: spacing[4], paddingV: spacing[2] },
};

export function AlertaBadge({ nivel, size = 'md' }: AlertaBadgeProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const config = NIVEL_MAP[nivel];
  const sizeConfig = SIZE_MAP[size];

  useEffect(() => {
    if (nivel === 'ROJO') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1.0,  duration: 400, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      scaleAnim.setValue(1);
    }
  }, [nivel, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.solid,
          paddingHorizontal: sizeConfig.paddingH,
          paddingVertical: sizeConfig.paddingV,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: config.text, fontSize: sizeConfig.fontSize },
        ]}
      >
        {config.label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: typography.family.display,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
  },
});
