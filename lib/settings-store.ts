// Zentrale Lesehilfe fuer die KI-Einstellungen im lokalen Modus.
//
// Die App speichert alle Einstellungen im localStorage des Geraets; die
// Secret-Felder (API-Keys) liegen dort verschluesselt vor (lib/secrets-crypto).
// Der Chat-Reiter braucht die entschluesselten Werte, um sie an die eigene
// API-Route zu uebergeben – serverseitig ist keine Sitzung und keine
// Einstellungs-Datenbank vorhanden (lokaler Modus).

import { decryptSecretFields } from './secrets-crypto'

export const SETTINGS_KEY = 'chronomind_settings'

export interface AiSettingsPayload {
  ai_provider?: 'mistral' | 'routerlab' | string
  ai_model?: string
  ai_api_key_mistral?: string
  ai_api_key_routerlab?: string
  routerlab_base_url?: string
}

/**
 * Liest die KI-Einstellungen aus dem localStorage und entschluesselt die
 * API-Keys. Gibt ein leeres Objekt zurueck, wenn nichts eingerichtet ist.
 */
export async function loadAiSettings(): Promise<AiSettingsPayload> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return {}
    const stored = JSON.parse(raw) as Record<string, unknown>
    const plain = await decryptSecretFields(stored)
    return {
      ai_provider: (plain.ai_provider as string) || undefined,
      ai_model: (plain.ai_model as string) || undefined,
      ai_api_key_mistral: (plain.ai_api_key_mistral as string) || undefined,
      ai_api_key_routerlab: (plain.ai_api_key_routerlab as string) || undefined,
      routerlab_base_url: (plain.routerlab_base_url as string) || undefined
    }
  } catch {
    return {}
  }
}
