const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const MONOREPO_MODULES = path.resolve(monorepoRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  MONOREPO_MODULES,
];

config.resolver.unstable_enableSymlinks = true;

config.resolver.extraNodeModules = {
  'react':                          path.resolve(MONOREPO_MODULES, 'react'),
  'react-native':                   path.resolve(MONOREPO_MODULES, 'react-native'),
  'react-native-reanimated':        path.resolve(MONOREPO_MODULES, 'react-native-reanimated'),
  'react-native-screens':           path.resolve(MONOREPO_MODULES, 'react-native-screens'),
  'react-native-safe-area-context': path.resolve(MONOREPO_MODULES, 'react-native-safe-area-context'),
  'react-native-gesture-handler':   path.resolve(MONOREPO_MODULES, 'react-native-gesture-handler'),
};

module.exports = config;
