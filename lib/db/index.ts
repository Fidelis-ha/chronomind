import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { join } from 'path'
import { ensureDbInitialized } from './init'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'

// On Vercel serverless, use /tmp for writable filesystem
const isVercel = process.env.VERCEL === '1'
const DB_PATH = process.env.DATABASE_PATH || (
  isVercel ? '/tmp/chronomind.db' : join(process.cwd(), 'chronomind.db')
)

// Singleton database instance
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

// Lazy initialization with automatic table creation
function getDb() {
  if (!dbInstance) {
    // Ensure /tmp directory exists on Vercel
    const fs = require('fs')
    if (isVercel && !fs.existsSync('/tmp')) {
      console.error('/tmp does not exist!')
    }
    
    // Ensure the parent directory exists
    const dbDir = isVercel ? '/tmp' : process.cwd()
    if (!fs.existsSync(dbDir)) {
      console.error(`Database directory does not exist: ${dbDir}`)
    }
    
    // On Vercel, ensure we use the correct path and create parent dirs
    const dbParentDir = isVercel ? '/tmp' : process.cwd()
    if (isVercel && !fs.existsSync(dbParentDir)) {
      console.error(`Vercel /tmp directory missing: ${dbParentDir}`)
    }
    
    // Ensure the database file itself exists (create empty file if not)
    // This is needed because better-sqlite3 may fail on first open if file doesn't exist
    if (isVercel && !fs.existsSync(DB_PATH)) {
      console.log('Creating database file at:', DB_PATH)
      // Ensure parent directory exists
      const parentDir = require('path').dirname(DB_PATH)
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true })
      }
      // Create empty file
      const handle = require('fs').openSync(DB_PATH, 'w')
      require('fs').closeSync(handle)
    }
    
    // Ensure tables exist before creating drizzle instance
    const sqlite = new Database(DB_PATH)
    sqlite.pragma('journal_mode = WAL')
    
    // Create all tables if they don't exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        tags TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_seconds INTEGER,
        source TEXT DEFAULT 'manual',
        calendar_event_id TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS calendars (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        webcal_url TEXT NOT NULL,
        color TEXT,
        auto_suggest INTEGER DEFAULT 1,
        last_synced_at TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        calendar_id TEXT NOT NULL REFERENCES calendars(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        external_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        location TEXT,
        raw_ical TEXT
      );
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY REFERENCES users(id),
        ai_provider TEXT DEFAULT 'mistral',
        ai_model TEXT DEFAULT 'mistral-large-latest',
        ai_api_key_mistral TEXT,
        ai_api_key_routerlab TEXT,
        routerlab_base_url TEXT DEFAULT 'https://routerlab.ch/v1',
        timezone TEXT DEFAULT 'Europe/Berlin',
        work_day_start TEXT DEFAULT '08:00',
        work_day_end TEXT DEFAULT '18:00',
        backup_provider TEXT,
        backup_config TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_started_at ON time_entries(started_at);
      CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    `)
    
    dbInstance = drizzle(sqlite, { schema })
  }
  return dbInstance
}

// Export a proxy that lazily initializes on first access
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (Reflect.get(getDb(), prop) as Function)?.bind(getDb())
  }
})

export type DB = typeof db