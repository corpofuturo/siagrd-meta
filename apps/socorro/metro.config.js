const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

const MONOREPO_MODULES = path.resolve(monorepoRoot, 'node_modules');

config.resolver.extraNodeModules = {
  'react':                          path.resolve(MONOREPO_MODULES, 'react'),
  'react-native':                   path.resolve(MONOREPO_MODULES, 'react-native'),
  'react-native-reanimated':        path.resolve(MONOREPO_MODULES, 'react-native-reanimated'),
  'react-native-screens':           path.resolve(MONOREPO_MODULES, 'react-native-screens'),
  'react-native-safe-area-context': path.resolve(MONOREPO_MODULES, 'react-native-safe-area-context'),
  'react-native-gesture-handler':   path.resolve(MONOREPO_MODULES, 'react-native-gesture-handler'),
};

const FORCE_SINGLE = new Set([
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-native',
]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (FORCE_SINGLE.has(moduleName)) {
    return {
      filePath: require.resolve(moduleName, { paths: [MONOREPO_MODULES] }),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
