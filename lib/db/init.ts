import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import { join } from 'path'

const DB_PATH = process.env.DATABASE_PATH || join(process.cwd(), 'chronomind.db')

async function initDb() {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')

  const db = drizzle(sqlite, { schema })

  console.log('Running migrations...')
  migrate(db, { migrationsFolder: './drizzle' })
  console.log('Migrations complete!')

  sqlite.close()
}

initDb().catch(console.error)
