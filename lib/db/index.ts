import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { join } from 'path'

const DB_PATH = process.env.DATABASE_PATH || join(process.cwd(), 'chronomind.db')

const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite, { schema })

export type DB = typeof db
