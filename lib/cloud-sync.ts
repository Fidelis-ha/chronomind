'use client'

// Cloud-Sync für Chronomind: Ein-/Ausgangspunkt für alle Cloud-Operationen.
// Datenformat: { version, timestamp, device, entries, settings, categories }

export type CloudProvider = 'nextcloud' | 'webdav' | 's3'

import { encryptSecretFields, decryptSecretFields } from '@/lib/secrets-crypto'


export interface CloudConfig {
  provider: CloudProvider
  // Nextcloud
  nc_server?: string
  username?: string
  password?: string
  nc_path?: string
  // generisches WebDAV
  webdav_url?: string
  webdav_filename?: string
  // S3
  s3_bucket?: string
  s3_region?: string
  aws_access_key_id?: string
  aws_secret_access_key?: string
}

export interface CloudPayload {
  version: number
  timestamp: string
  device: string
  entries: unknown[]
  /** Seit v3; fehlt in älteren Backups -> als leere Liste behandeln */
  plans?: unknown[]
  settings: unknown
  categories: unknown[]
}

const SYNC_CONFIG_KEY = 'chronomind_cloud_config'
const LAST_SYNC_KEY = 'chronomind_last_sync' // { pushed_at, pulled_timestamp }
const DEVICE_ID_KEY = 'chronomind_device_id'

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = `geraet-${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

/**
 * Laedt die CloudConfig aus dem localStorage. Persistiert sind die Secret-Felder
 * (password/token/access keys) mit dem Device-Key verschluesselt ('enc:v1:');
 * hier werden sie fuer die Nutzung in Memory entschluesselt. Klartext-Altbestaende
 * werden beim Laden einmalig verschluesselt zurueckgeschrieben (Migration).
 */
export async function loadCloudConfig(): Promise<CloudConfig | null> {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY)
    if (!raw) return null
    const config = JSON.parse(raw) as unknown as CloudConfig
    const decrypted = (await decryptSecretFields(config as unknown as Record<string, unknown>)) as unknown as CloudConfig
    // Migration: Klartext-Secrets (ohne 'enc:v1:') verschluesselt zurueckschreiben
    if (JSON.stringify(config) !== JSON.stringify(decrypted)) {
      await saveCloudConfig(decrypted)
    }
    return decrypted
  } catch {
    return null
  }
}

/**
 * Speichert die CloudConfig im localStorage – Secret-Felder werden vor dem
 * Schreiben mit dem Device-Key verschluesselt (encryptSecret), nie im Klartext.
 */
export async function saveCloudConfig(config: CloudConfig) {
  const encrypted = (await encryptSecretFields(
    config as unknown as Record<string, unknown>
  )) as unknown as CloudConfig
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(encrypted))
}

export function clearCloudConfig() {
  localStorage.removeItem(SYNC_CONFIG_KEY)
  localStorage.removeItem(LAST_SYNC_KEY)
}

export function getLastSync(): { pushed_at?: string; pulled_timestamp?: string } {
  try {
    return JSON.parse(localStorage.getItem(LAST_SYNC_KEY) || '{}')
  } catch {
    return {}
  }
}

function setLastSync(patch: Record<string, string>) {
  localStorage.setItem(LAST_SYNC_KEY, JSON.stringify({ ...getLastSync(), ...patch }))
}

async function callSyncApi(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string; data?: unknown; detail?: string }> {
  const res = await fetch('/api/cloud/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const json = await res.json()
  return json
}

export async function testCloudConnection(config: CloudConfig): Promise<{ ok: boolean; error?: string; detail?: string }> {
  return callSyncApi({ action: 'test', provider: config.provider, config })
}

export async function pushToCloud(config: CloudConfig, payload: Omit<CloudPayload, 'timestamp' | 'device'>): Promise<{ ok: boolean; error?: string }> {
  const full: CloudPayload = { ...payload, timestamp: new Date().toISOString(), device: getDeviceId() }
  const result = await callSyncApi({ action: 'push', provider: config.provider, config, data: full })
  if (result.ok) setLastSync({ pushed_at: full.timestamp })
  return result
}

export async function pullFromCloud(config: CloudConfig): Promise<{ ok: boolean; error?: string; data: CloudPayload | null }> {
  const result = await callSyncApi({ action: 'pull', provider: config.provider, config })
  if (!result.ok) return { ok: false, error: result.error, data: null }
  return { ok: true, data: (result.data as CloudPayload) ?? null }
}

/** Vergleicht lokale und Cloud-Zeitstände. Rückgabe für die UI-Entscheidung. */
export function compareWithCloud(localNewestIso: string | null, cloudTimestamp: string | null | undefined): 'cloud-neuer' | 'lokal-neuer' | 'gleich' | 'cloud-leer' {
  if (!cloudTimestamp) return 'cloud-leer'
  if (!localNewestIso) return 'cloud-neuer'
  const diff = new Date(cloudTimestamp).getTime() - new Date(localNewestIso).getTime()
  if (diff > 1000) return 'cloud-neuer'
  if (diff < -1000) return 'lokal-neuer'
  return 'gleich'
}
