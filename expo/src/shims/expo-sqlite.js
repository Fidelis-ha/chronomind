// Shim for expo-sqlite on web
// Provides a mock implementation so the module resolves without errors

export function openDatabaseSync() {
  return {
    runSync: () => ({ changes: { get: () => 0 } }),
    getSync: () => [],
    execSync: () => {}
  }
}

export const openInMemoryAsync = async () => ({
  runAsync: async () => ({ changes: 0 }),
  getAsync: async () => [],
  execAsync: async () => {}
})

export default { openDatabaseSync, openInMemoryAsync }