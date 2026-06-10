const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(monorepoRoot, 'node_modules'),
];

// Paquetes que deben existir como instancia única en todo el bundle.
// pnpm crea junctions locales y copias hoisted en root, dando dos module IDs
// distintos para el mismo paquete → crashes de contexto en Hermes.
// NOTA: expo-router NO está aquí — necesita resolverse desde el contexto de
// ciudadano para que el descubrimiento de rutas funcione correctamente.
const SINGLETON_PREFIXES = [
  'react',
  'react-native',
  '@react-navigation/',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-gesture-handler',
  'react-native-reanimated',
];

const rootPackageJson = path.join(monorepoRoot, 'package.json');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isSingleton = SINGLETON_PREFIXES.some(
    (prefix) => moduleName === prefix || moduleName.startsWith(prefix + '/') || moduleName.startsWith(prefix)
  );

  if (isSingleton) {
    return context.resolveRequest(
      { ...context, originModulePath: rootPackageJson },
      moduleName,
      platform
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
