import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NivelAlerta } from '../types';

interface NivelAlertaHeaderProps {
  nivel: NivelAlerta;
  municipio: string;
}

const COLORES: Record<
  NivelAlerta,
  { bg: string; text: string }
> = {
  ROJO:     { bg: '#1C0505', text: '#FCA5A5' },
  NARANJA:  { bg: '#1C0A00', text: '#FDBA74' },
  AMARILLO: { bg: '#1C1700', text: '#FDE68A' },
  VERDE:    { bg: '#052E16', text: '#86EFAC' },
};

const ETIQUETA: Record<NivelAlerta, string> = {
  ROJO:     'ALERTA ROJA',
  NARANJA:  'Alerta Naranja',
  AMARILLO: 'Alerta Amarilla',
  VERDE:    'Sin alerta',
};

/**
 * Header de 60dp que cambia de color según el nivel de alerta.
 * Tipografía: nivel en BarlowCondensed bold, municipio en IBM Plex Sans.
 */
export function NivelAlertaHeader({ nivel, municipio }: NivelAlertaHeaderProps) {
  const { bg, text } = COLORES[nivel];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.nivelTexto, { color: text }]}>
        {ETIQUETA[nivel]}
      </Text>
      <Text style={[styles.municipioTexto, { color: text }]}>
        {municipio}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  nivelTexto: {
    // BarlowCondensed bold — fallback a sans-serif condensed
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  municipioTexto: {
    // IBM Plex Sans — fallback a sans-serif
    fontFamily: 'IBMPlexSans_400Regular',
    fontSize: 14,
    opacity: 0.85,
  },
});
