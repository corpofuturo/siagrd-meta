#!/usr/bin/env bash
# Genera APK release firmado con el bundle JS incluido.
# Ejecutar desde la raíz del workspace (D:\Jota\Desa\siagrd) o desde apps/ciudadano/.
# Requisitos: Node.js, pnpm/npm, Java 17, Android SDK con ANDROID_HOME configurado.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANDROID_DIR="$SCRIPT_DIR/android"
ASSETS_DIR="$ANDROID_DIR/app/src/main/assets"

echo "==> Creando carpeta assets si no existe..."
mkdir -p "$ASSETS_DIR"

echo "==> Generando bundle JS (expo export:embed)..."
cd "$SCRIPT_DIR"
npx expo export:embed \
  --platform android \
  --entry-file node_modules/expo-router/entry.js \
  --bundle-output "$ASSETS_DIR/index.android.bundle" \
  --assets-dest "$ANDROID_DIR/app/src/main/res" \
  --dev false \
  --reset-cache

echo "==> Compilando APK release..."
cd "$ANDROID_DIR"
./gradlew assembleRelease

APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "✓ APK generado en:"
echo "  $APK_PATH"
echo ""
echo "Para instalar en dispositivo conectado por ADB:"
echo "  adb install -r $APK_PATH"
