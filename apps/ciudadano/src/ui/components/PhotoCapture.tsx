import React, { useState } from 'react';
import {
  View,
  Image,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { EmergencyButton } from './EmergencyButton';
import { colors, typography, spacing, radius } from '../tokens';

export interface PhotoResult {
  uri: string;
  miniatura_uri: string;
  lat?: number;
  lng?: number;
  precision_metros?: number;
  timestamp: number;
}

export interface PhotoCaptureProps {
  onCapture: (photo: PhotoResult) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
}

type CaptureState = 'idle' | 'capturing' | 'processing' | 'done';

/** Solicita permisos de cámara y ubicación. Devuelve true si ambos (o cámara al menos) fueron concedidos. */
async function requestPermissions(): Promise<{ camera: boolean; location: boolean }> {
  const camResult = await ImagePicker.requestCameraPermissionsAsync();
  const locResult = await Location.requestForegroundPermissionsAsync();
  return {
    camera: camResult.status === 'granted',
    location: locResult.status === 'granted',
  };
}

/** Comprime la imagen al lado mayor máximo de 1200px, calidad 0.75, JPEG. */
async function compressImage(uri: string): Promise<string> {
  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
  );
  return compressed.uri;
}

/** Genera thumbnail 400x400, calidad 0.6, JPEG. */
async function generateThumbnail(uri: string): Promise<string> {
  const thumb = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 400, height: 400 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
  );
  return thumb.uri;
}

/** Obtiene posición GPS con timeout. Devuelve null si falla. */
async function getGpsCoords(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
    } as Location.LocationOptions);
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? 0,
    };
  } catch {
    return null;
  }
}

export function PhotoCapture({ onCapture, onError, disabled = false }: PhotoCaptureProps) {
  const [state, setState] = useState<CaptureState>('idle');
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  async function handleCapture() {
    setState('capturing');

    try {
      const perms = await requestPermissions();
      if (!perms.camera) {
        throw new Error('Permiso de cámara denegado');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.75,
        exif: true,
        base64: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setState('idle');
        return;
      }

      const rawUri = result.assets[0].uri;
      setPreviewUri(rawUri);
      setState('processing');

      const [compressedUri, thumbnailUri, gps] = await Promise.all([
        compressImage(rawUri),
        generateThumbnail(rawUri),
        getGpsCoords(),
      ]);

      const photoResult: PhotoResult = {
        uri: compressedUri,
        miniatura_uri: thumbnailUri,
        timestamp: Date.now(),
        ...(gps !== null && {
          lat: gps.lat,
          lng: gps.lng,
          precision_metros: gps.accuracy,
        }),
      };

      setState('done');
      onCapture(photoResult);
    } catch (err) {
      setState('idle');
      const error = err instanceof Error ? err : new Error(String(err));
      if (onError) {
        onError(error);
      }
    }
  }

  function handleReset() {
    setState('idle');
    setPreviewUri(null);
  }

  return (
    <View style={styles.container}>
      {previewUri && (
        <Image
          source={{ uri: previewUri }}
          style={styles.preview}
          resizeMode="cover"
        />
      )}

      {state === 'processing' && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={colors.action.primary} />
          <Text style={styles.processingText}>Procesando…</Text>
        </View>
      )}

      {state === 'done' && (
        <View style={styles.doneRow}>
          <View style={styles.checkBadge}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <Text style={styles.doneText}>Foto guardada</Text>
        </View>
      )}

      {(state === 'idle' || state === 'capturing') && (
        <EmergencyButton
          label="TOMAR FOTO"
          onPress={handleCapture}
          variant="primary"
          size="standard"
          disabled={disabled || state === 'capturing'}
          loading={state === 'capturing'}
        />
      )}

      {state === 'done' && (
        <EmergencyButton
          label="NUEVA FOTO"
          onPress={handleReset}
          variant="primary"
          size="standard"
          disabled={disabled}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[4],
  },
  preview: {
    width: 200,
    height: 200,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
  },
  processingOverlay: {
    alignItems: 'center',
    gap: spacing[2],
  },
  processingText: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    fontFamily: typography.family.body,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.action.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    color: colors.text.primary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  doneText: {
    color: colors.alerta.verde.text,
    fontSize: typography.size.base,
    fontFamily: typography.family.body,
    fontWeight: typography.weight.medium,
  },
});
