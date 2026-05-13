// Deprecated: This hook is deprecated. Use the /api/entries routes instead.
export function useTimeEntries() {
  console.warn('useTimeEntries is deprecated — use /api/entries instead')
  return {
    entries: [],
    loading: false,
    error: null,
    fetchEntries: async () => {},
    createEntry: async () => {},
    updateEntry: async () => {},
    deleteEntry: async () => {}
  }
}
