import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../tokens';

interface SyncStatusProps {
  pendientes: number;
  ultimoSync?: number;
  onSync: () => void;
}

/**
 * Formatea epoch ms como tiempo relativo
 */
function tiempoDesde(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return `hace ${Math.floor(hrs / 24)} d`;
}

export function SyncStatus({ pendientes, ultimoSync, onSync }: SyncStatusProps) {
  return (
    <View style={styles.container}>
      {ultimoSync && (
        <Text style={styles.lastSync}>
          Último sync: {tiempoDesde(ultimoSync)}
        </Text>
      )}
      {pendientes > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendientes}</Text>
        </View>
      )}
      {pendientes > 0 && (
        <TouchableOpacity onPress={onSync} style={styles.button} activeOpacity={0.75}>
          <Text style={styles.buttonText}>↑ Sincronizar</Text>
        </TouchableOpacity>
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
  lastSync: {
    fontFamily: typography.family.mono,
    fontSize: typography.size.xs,
    color: colors.text.disabled,
  },
  badge: {
    backgroundColor: colors.alerta.naranja.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.alerta.naranja.solid,
  },
  badgeText: {
    fontFamily: typography.family.mono,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.xs,
    color: colors.alerta.naranja.text,
  },
  button: {
    backgroundColor: colors.action.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  buttonText: {
    fontFamily: typography.family.body,
    fontWeight: typography.weight.semibold,
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
});
