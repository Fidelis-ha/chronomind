import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { join } from 'path'

// On Vercel serverless, use /tmp for writable filesystem
const isVercel = process.env.VERCEL === '1'
const DB_PATH = process.env.DATABASE_PATH || (
  isVercel ? '/tmp/chronomind.db' : join(process.cwd(), 'chronomind.db')
)

export const db = drizzle(new Database(DB_PATH), { schema })

export type DB = typeof db
