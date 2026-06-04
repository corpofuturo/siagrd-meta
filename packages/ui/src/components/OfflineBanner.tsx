import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, typography, spacing, animation } from '../tokens';

interface OfflineBannerProps {
  pendingCount: number;
  onSyncPress?: () => void;
}

export function OfflineBanner({ pendingCount, onSyncPress }: OfflineBannerProps) {
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: animation.normal,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.text}>
        Sin conexión • {pendingCount} elemento{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}
      </Text>
      {onSyncPress && (
        <TouchableOpacity onPress={onSyncPress} style={styles.button}>
          <Text style={styles.buttonText}>Reintentar</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.alerta.naranja.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.alerta.naranja.solid,
  },
  text: {
    fontFamily: typography.family.body,
    fontWeight: typography.weight.medium,
    fontSize: typography.size.sm,
    color: colors.alerta.naranja.text,
    flex: 1,
  },
  button: {
    marginLeft: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  buttonText: {
    fontFamily: typography.family.body,
    fontWeight: typography.weight.semibold,
    fontSize: typography.size.sm,
    color: colors.alerta.naranja.icon,
  },
});
