import { NextResponse } from 'next/server'

export async function GET() {
  const isVercel = process.env.VERCEL === '1'
  const dbPath = process.env.DATABASE_PATH || (isVercel ? '/tmp/chronomind.db' : './chronomind.db')
  
  // Try to get filesystem info
  let fsInfo = {}
  try {
    const fs = require('fs')
    fsInfo = {
      '/tmp exists': fs.existsSync('/tmp'),
      '/tmp writable': (() => {
        try {
          fs.writeFileSync('/tmp/test.txt', 'test')
          fs.unlinkSync('/tmp/test.txt')
          return true
        } catch { return false }
      })(),
      'db path exists': fs.existsSync(dbPath),
      'db path dir exists': fs.existsSync(isVercel ? '/tmp' : process.cwd()),
      '/tmp contents': fs.readdirSync('/tmp').slice(0, 10)
    }
  } catch (e) {
    fsInfo = { error: String(e) }
  }
  
  // Test opening a database
  let dbTest = {}
  try {
    const Database = require('better-sqlite3')
    const sqlite = new Database('/tmp/chronomind.db')
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    sqlite.close()
    dbTest = { success: true, tables }
  } catch (e) {
    dbTest = { error: String(e), code: (e as NodeJS.ErrnoException).code }
  }
  
  return NextResponse.json({
    isVercel,
    dbPath,
    fsInfo,
    dbTest
  })
}