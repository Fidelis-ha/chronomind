// Shim for drizzle-orm/expo-sqlite on web
export function drizzle() { return { insert: () => ({ values: () => ({}) }), select: () => ({ from: () => ({ where: () => ({ limit: () => [] }) }), update: () => ({ set: () => ({ where: () => {} }) }), delete: () => ({ where: () => {} }) }) } }
export default { drizzle }