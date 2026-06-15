# APK Build & Install — SATAM
**Apps:** ciudadano (`org.corpofuturo.siagrd.ciudadano`) · socorro  
**Última actualización:** 2026-06-10

---

## Prerequisitos

```bash
node -v        # >= 18
pnpm -v        # >= 8
java -version  # JDK 17 (Android Gradle requiere JDK 17)
```

Herramientas opcionales:
- `adb` (Android Debug Bridge) — para instalación directa por USB
- `eas-cli` — para build en la nube via EAS (Expo Application Services)

---

## Opción A — Build local con Expo (modo desarrollo / preview)

### 1. Instalar dependencias del workspace

```bash
cd D:\Jota\Desa\siagrd
pnpm install
```

### 2. Build APK debug (app ciudadano)

```bash
cd apps/ciudadano
npx expo run:android --variant debug
```

El APK queda en:
```
apps/ciudadano/android/app/build/outputs/apk/debug/app-debug.apk
```

### 3. Build APK release local

```bash
cd apps/ciudadano/android
.\gradlew assembleRelease
```

APK en:
```
apps/ciudadano/android/app/build/outputs/apk/release/app-release.apk
```

> Para el build release se necesita keystore. Ver sección "Firma" más abajo.

---

## Opción B — Build en la nube con EAS (recomendado para distribución)

### 1. Instalar EAS CLI

```bash
npm install -g eas-cli
eas login   # cuenta Expo: corpofuturo
```

### 2. Build preview (APK sin firma de producción, distribuible internamente)

```bash
cd apps/ciudadano
eas build --platform android --profile preview
```

Esto sube el código a los servidores de EAS, hace el build y devuelve un link de descarga.

### 3. Build producción

```bash
eas build --platform android --profile production
```

El APK / AAB producción va firmado con el keystore del proyecto en EAS.

### 4. Build app socorro

```bash
cd apps/socorro
eas build --platform android --profile preview
```

---

## Opción C — Prebuild nativo + Gradle directo

Si se necesita modificar código nativo (plugins nativos, permisos):

```bash
cd apps/ciudadano
npx expo prebuild --platform android --clean
cd android
.\gradlew assembleDebug
```

---

## Instalación en dispositivo físico via ADB

### Prerequisitos
- USB Debugging habilitado en el dispositivo Android
- Driver USB instalado en Windows (generalmente automático con el fabricante)

### Conectar y verificar

```bash
adb devices
# Debe mostrar: <serial>  device
```

### Instalar APK debug

```bash
adb install -r apps\ciudadano\android\app\build\outputs\apk\debug\app-debug.apk
```

Flag `-r`: reemplaza instalación existente (no desinstala datos).

### Instalar APK release

```bash
adb install -r apps\ciudadano\android\app\build\outputs\apk\release\app-release.apk
```

### Ver logs en tiempo real (diagnóstico)

```bash
adb logcat -s "ReactNative" "ReactNativeJS" "ExpoModules"
```

### Desinstalar app antes de reinstalar (si hay conflictos de firma)

```bash
adb uninstall org.corpofuturo.siagrd.ciudadano
adb install apps\ciudadano\android\app\build\outputs\apk\debug\app-debug.apk
```

---

## Firma del APK para release

Para builds locales de release, Gradle necesita un keystore. Opciones:

### Opción 1 — Dejar que EAS maneje la firma (recomendado)
EAS genera y custodia el keystore automáticamente. No se necesita gestión manual.

### Opción 2 — Keystore local
Crear el archivo `apps/ciudadano/android/gradle.properties` con:

```properties
MYAPP_UPLOAD_STORE_FILE=satam-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=satam-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=**contraseña**
MYAPP_UPLOAD_KEY_PASSWORD=**contraseña**
```

Generar keystore:
```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore satam-upload-key.keystore \
  -alias satam-key-alias \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

Mover el `.keystore` a `apps/ciudadano/android/app/` y **no subir al repositorio** (agregar a `.gitignore`).

---

## Configurar API URL antes del build

La app lee el API URL desde la variable de entorno de build. Verificar en:

- `apps/ciudadano/src/config/api.ts` (o equivalente)

Para builds de producción, asegurarse de que apunte al backend de VPS:
```
https://siagrd-backend.up.
```

Para builds de desarrollo local:
```
http://10.0.2.2:3000  # emulador Android → localhost
http://<IP-LAN>:3000  # dispositivo físico en la misma red
```

---

## Checklist previo al build de distribución

- [ ] `EXPO_PUBLIC_API_URL` configurado para producción
- [ ] `google-services.json` presente en `apps/ciudadano/android/app/` (Firebase)
- [ ] Versión incrementada en `app.json` → `expo.version` y `expo.android.versionCode`
- [ ] Migraciones STOP-3 ejecutadas en BD de producción
- [ ] Variables de entorno configuradas en /opt/siagrd/.env
- [ ] `NODE_ENV=production` en VPS

---

## Identificadores de las apps

| App | Package | Bundle ID (iOS) |
|-----|---------|-----------------|
| ciudadano | `org.corpofuturo.siagrd.ciudadano` | `org.corpofuturo.siagrd.ciudadano` |
| socorro | (ver apps/socorro/app.json) | (ver apps/socorro/app.json) |

---

## Troubleshooting frecuente

| Error | Causa | Solución |
|-------|-------|----------|
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | El APK está firmado con keystore diferente al instalado | `adb uninstall org.corpofuturo.siagrd.ciudadano` y reinstalar |
| `SDK location not found` | Variable `ANDROID_HOME` no configurada | Agregar `sdk.dir=C:\\Users\\JOHN\\AppData\\Local\\Android\\Sdk` a `local.properties` |
| `Metro bundler timeout` | Metro no arranca antes de que Gradle intente conectar | Iniciar Metro primero: `npx expo start` en otra terminal |
| `Manifest merger failed` | Conflicto de permisos entre plugins | Revisar `android/app/src/main/AndroidManifest.xml` y limpiar duplicados |
| Build muy lento en Windows | Gradle usa mucha RAM | Agregar `org.gradle.jvmargs=-Xmx4096m` a `gradle.properties` |
