'use client'

// Cloud-Sync für Chronomind: Ein-/Ausgangspunkt für alle Cloud-Operationen.
// Datenformat: { version, timestamp, device, entries, settings, activities }

export type CloudProvider = 'nextcloud' | 'webdav' | 's3'

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
  settings: unknown
  activities: unknown[]
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

export function loadCloudConfig(): CloudConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveCloudConfig(config: CloudConfig) {
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config))
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
