// lib/secrets-crypto.ts
// Verschluesselung von Secrets (API-Keys, Passwoerter, Tokens) auf Client-Ebene.
//
// Zwei Verfahren:
//  1. Browser: Device-Key (AES-GCM 256, non-extractable) in der IndexedDB
//     (DB 'chronomind-secrets', Store 'keys') – NICHT in localStorage. Damit werden
//     Secrets "at rest" verschluesselt (Prefix 'enc:v1:'). Der Schluessel verlaesst
//     das Geraet nie -> ein Mitleser des localStorage sieht nur Ciphertext.
//     HINWEIS: Ein Geraetewechsel ist damit ohne Neu-Einrichtung der Secrets nicht
//     moeglich (deterministische Konsequenz des Device-Keys).
//  2. Server (Node): lib/backup/index.ts exportiert serverseitig; dort gibt es
//     keine IndexedDB. Fuer serverseitige Werte (userSettings-Tabelle) wird ein
//     AES-Key aus JWT_SECRET (PBKDF2, fester Salt) abgeleitet – gleiches
//     'enc:v1:'-Format. Server- und Browser-Ciphertexte sind gegenseitig NICHT
//     entschlusselbar (decryptSecret liefert dann null).
//  2. Passphrase-basiert (PBKDF2 250k Iterationen): fuer portable Backups/Exporte,
//     damit die Datei auf anderen Geraeten wiederherstellbar ist.

const ENC_PREFIX = 'enc:v1:'
const SECRET_DB_NAME = 'chronomind-secrets'
const SECRET_STORE_NAME = 'keys'
const SECRET_KEY_ID = 'device-key'

/** Erkennt anhand des Feldnamens, ob es sich um ein Secret-Feld handelt. */
export function isSecretField(key: string): boolean {
  return /key|secret|password|token/i.test(key)
}

async function openSecretsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SECRET_DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(SECRET_STORE_NAME)) {
        req.result.createObjectStore(SECRET_STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbGet(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SECRET_STORE_NAME, 'readonly')
    const req = tx.objectStore(SECRET_STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SECRET_STORE_NAME, 'readwrite')
    const req = tx.objectStore(SECRET_STORE_NAME).put(value, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/**
 * Gibt den Verschluesselungsschluessel zurueck:
 * - Browser: device-lokaler AES-GCM-Key (non-extractable, IndexedDB), einmalig erzeugt.
 * - Server: AES-GCM-Key abgeleitet aus JWT_SECRET (PBKDF2, fester Salt), gecacht.
 * Wirft, wenn im Browser WebCrypto/IndexedDB fehlen oder serverseitig
 * JWT_SECRET nicht gesetzt ist.
 */
async function getDeviceKey(): Promise<CryptoKey> {
  if (typeof window !== 'undefined') {
    if (!window.crypto?.subtle || !window.indexedDB) {
      throw new Error('WebCrypto/IndexedDB nicht verfuegbar')
    }
    const db = await openSecretsDb()
    try {
      const existing = (await idbGet(db, SECRET_KEY_ID)) as CryptoKey | undefined
      if (existing) return existing
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt'
      ])
      await idbPut(db, SECRET_KEY_ID, key)
      return key
    } finally {
      db.close()
    }
  }
  // Server-Pfad (Node 18+ hat globales crypto.subtle)
  if (!crypto?.subtle) throw new Error('WebCrypto nicht verfuegbar')
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET nicht gesetzt')
  if (serverKeyCache) return serverKeyCache
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  serverKeyCache = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode(SERVER_KEY_SALT), iterations: 250000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
  return serverKeyCache
}

const SERVER_KEY_SALT = 'chronomind-server-key-v1'
let serverKeyCache: CryptoKey | null = null

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const bytes = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/**
 * Verschluesselt einen Klartext-Wert mit dem Device-Key.
 * Rueckgabe: 'enc:v1:' + base64(iv || ciphertext), oder null bei leerer Eingabe.
 */
export async function encryptSecret(plain: string | null | undefined): Promise<string | null> {
  if (!plain) return null
  const key = await getDeviceKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain)
  )
  // iv + ciphertext als ein base64-Block, durch ':' getrennt zur einfacheren Trennung
  return `${ENC_PREFIX}${toBase64(iv)}:${toBase64(ciphertext)}`
}

/**
 * Entschluesselt einen 'enc:v1:'-Wert mit dem Device-Key.
 * - Werte ohne Prefix (Klartext/Altbestand): Rueckgabe null
 * - Entschluesselung fehlgeschlagen (z.B. fremdes Geraet): Rueckgabe null
 */
export async function decryptSecret(value: string | null | undefined): Promise<string | null> {
  if (!value || !value.startsWith(ENC_PREFIX)) return null
  try {
    const [ivB64, dataB64] = value.slice(ENC_PREFIX.length).split(':')
    if (!ivB64 || !dataB64) return null
    const key = await getDeviceKey()
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(ivB64) },
      key,
      fromBase64(dataB64)
    )
    return new TextDecoder().decode(plaintext)
  } catch {
    return null
  }
}

/** True, wenn der Wert mit dem Encryption-Prefix beginnt. */
export function isEncryptedSecret(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX)
}

/**
 * Verschluesselt alle Secret-Felder eines Objekts (Device-Key).
 * Wird vor jeder Persistenz (localStorage) bzw. vor Upload-Payloads verwendet.
 */
export async function encryptSecretFields<T extends Record<string, unknown>>(obj: T): Promise<T> {
  const result: Record<string, unknown> = { ...obj }
  for (const key of Object.keys(result)) {
    const value = result[key]
    if (typeof value === 'string' && value && !isEncryptedSecret(value) && isSecretField(key)) {
      result[key] = (await encryptSecret(value)) ?? value
    }
  }
  return result as T
}

/**
 * Entschluesselt alle 'enc:v1:'-Secret-Felder eines Objekts (Device-Key).
 * Klartext-Felder und nicht entschlüsselbare Werte bleiben unveraendert.
 */
export async function decryptSecretFields<T extends Record<string, unknown>>(obj: T): Promise<T> {
  const result: Record<string, unknown> = { ...obj }
  for (const key of Object.keys(result)) {
    const value = result[key]
    if (typeof value === 'string' && isEncryptedSecret(value) && isSecretField(key)) {
      result[key] = (await decryptSecret(value)) ?? value
    }
  }
  return result as T
}

/**
 * Verschluesselt ein komplettes Payload-Objekt passphrasenbasiert (fuer portable
 * Exporte/Backups): PBKDF2-SHA256 (250k Iterationen, 16-Byte-Salt) -> AES-GCM.
 * Rueckgabe: JSON-String { enc:'v1', salt, iv, data }.
 */
export async function encryptForBackup(payloadObj: unknown, passphrase: string): Promise<string> {
  if (!passphrase) throw new Error('Passphrase erforderlich')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(payloadObj))
  )
  return JSON.stringify({
    enc: 'v1',
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(ciphertext)
  })
}

/**
 * Entschluesselt einen mit encryptForBackup erzeugten JSON-String.
 * Rueckgabe: das urspruengliche Objekt, oder null bei falscher Passphrase /
 * ungueltigem Format.
 */
export async function decryptFromBackup(json: string, passphrase: string): Promise<unknown | null> {
  try {
    const parsed = JSON.parse(json) as { enc?: string; salt?: string; iv?: string; data?: string }
    if (parsed.enc !== 'v1' || !parsed.salt || !parsed.iv || !parsed.data) return null
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    )
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: fromBase64(parsed.salt), iterations: 250000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(parsed.iv) },
      key,
      fromBase64(parsed.data)
    )
    return JSON.parse(new TextDecoder().decode(plaintext))
  } catch {
    return null
  }
}
