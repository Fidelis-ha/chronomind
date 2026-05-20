// Shim for drizzle-orm on web
export const drizzle = () => ({})
export function sqliteTable() { return {} }
export function text() { return {} }
export function integer() { return {} }
export function primaryKey() { return {} }
export function notNull() { return {} }
export function unique() { return {} }
export function references() { return {} }
export function default$() { return {} }
export function eq() { return {} }
export function and() { return {} }
export function or() { return {} }
export function desc() { return {} }
export function asc() { return {} }
export function sql() { return {} }
export default { drizzle, sqliteTable, text, integer, primaryKey, notNull, unique, references, default: default$, eq, and, or, desc, asc, sql }