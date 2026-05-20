// metro.config.js — Web bundling: redirect native packages to shims
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

module.exports = (async () => {
  const defaultConfig = await getDefaultConfig(__dirname)
  const projectRoot = __dirname

  return {
    ...defaultConfig,
    resolver: {
      ...defaultConfig.resolver,
      // Map native-only packages to empty shims for web build
      extraNodeModules: {
        'expo-sqlite': path.resolve(projectRoot, 'src/shims/expo-sqlite.js'),
        'drizzle-orm/expo-sqlite': path.resolve(projectRoot, 'src/shims/drizzle-orm-expo-sqlite.js')
      }
    }
  }
})()