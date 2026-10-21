'use client'

// Issue #9.1: KI-Gating für den Chat. Ohne eingerichtete KI (Provider + passender
// API-Key in den persistierten Settings) wird der Chat nicht gerendert, sondern
// ein Hinweis mit Link zur KI-Einrichtung.

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { SETTINGS_CHANGED_EVENT } from '@/lib/dirty-state'
import { Chat } from '@/components/chat'

const STORAGE_KEY = 'chronomind_settings'

/**
 * Prüft clientseitig, ob die KI eingerichtet ist: Es muss ein Provider gewählt
 * sein UND zum Provider ein API-Key in den persistierten Settings existieren
 * (der Key liegt dort Device-verschlüsselt als 'enc:v1:...'-Wert vor –
 * verschlüsselt genügt als Existenznachweis, der Klartext wird nie angefasst).
 */
function isAiConfigured(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const settings = JSON.parse(raw) as {
      ai_provider?: string
      ai_api_key_mistral?: string
      ai_api_key_routerlab?: string
    }
    if (!settings.ai_provider) return false
    if (settings.ai_provider === 'mistral') return !!settings.ai_api_key_mistral
    if (settings.ai_provider === 'routerlab') return !!settings.ai_api_key_routerlab
    return false
  } catch {
    return false
  }
}

export default function ChatPage() {
  const [configured, setConfigured] = useState<boolean | null>(null)

  const recheck = useCallback(() => setConfigured(isAiConfigured()), [])

  useEffect(() => {
    recheck()
    // Re-Prüfung, wenn Settings sich (auch in anderen Tabs) ändern
    window.addEventListener(SETTINGS_CHANGED_EVENT, recheck)
    window.addEventListener('storage', recheck)
    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, recheck)
      window.removeEventListener('storage', recheck)
    }
  }, [recheck])

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-5rem-env(safe-area-inset-bottom))] md:h-[calc(100vh-4rem)]">
        <div className="flex-1 flex items-center justify-center p-4">
          {configured === false ? (
            <div className="max-w-sm w-full rounded-2xl border border-outline-variant bg-surface-container-low p-6 text-center">
              <h1 className="text-lg font-semibold mb-2">KI nicht eingerichtet</h1>
              <p className="text-sm text-muted-foreground mb-4">
                Wähle in den Einstellungen einen KI-Anbieter (Mistral oder RouterLab) und hinterlege den zugehörigen API-Key, um den Chat zu nutzen.
              </p>
              <Link href="/app_main/settings">
                <Button className="w-full">Zur KI-Einrichtung</Button>
              </Link>
            </div>
          ) : configured === true ? (
            <div className="flex-1 h-full">
              {/* Chat-Kommunikation unverändert (Issue #9 Teile 2/4 nicht betroffen) */}
              <Chat />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Lade…</p>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
