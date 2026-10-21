'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/app-layout'
import { VibrateIcon, Volume2Icon, WavesIcon } from 'lucide-react'
import {
  getVibrationSequence,
  loadVibrationPattern,
  playVibrationPreview
} from '@/lib/vibration'

interface DiagRow {
  label: string
  value: string
  ok: boolean | null
}

interface TimelineEntry {
  time: string
  value: boolean
}

function dot(ok: boolean | null) {
  if (ok === null) return <span className="inline-block h-3 w-3 rounded-full bg-muted-foreground/40" />
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full ${ok ? 'bg-green-600' : 'bg-red-600'}`}
      aria-label={ok ? 'ok' : 'nicht ok'}
    />
  )
}

export default function VibrationTestPage() {
  const [rows, setRows] = useState<DiagRow[]>([])
  const [vibrateResult, setVibrateResult] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [audioResult, setAudioResult] = useState<string | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [patternResult, setPatternResult] = useState<string | null>(null)

  useEffect(() => {
    const rows: DiagRow[] = []

    const hasVibrate = 'vibrate' in navigator
    rows.push({
      label: "1. 'vibrate' in navigator",
      value: String(hasVibrate),
      ok: hasVibrate
    })
    rows.push({
      label: '2. typeof navigator.vibrate',
      value: typeof navigator.vibrate,
      ok: typeof navigator.vibrate === 'function'
    })
    rows.push({
      label: '3. window.isSecureContext',
      value: String(window.isSecureContext),
      ok: window.isSecureContext
    })
    rows.push({
      label: '4. location.protocol',
      value: window.location.protocol,
      ok: window.location.protocol === 'https:' || window.location.protocol === 'chrome-extension:'
    })

    const standalone = window.matchMedia('(display-mode: standalone)').matches
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
    rows.push({
      label: '5. display-mode standalone',
      value: `${standalone} / navigator.standalone (iOS): ${iosStandalone}`,
      ok: standalone || iosStandalone
    })

    const navGetInstalled = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<Array<Record<string, unknown>>>
    }
    if (typeof navGetInstalled.getInstalledRelatedApps === 'function') {
      // Ergebnis in eine feste Zeile schreiben (vorher wurde angehaengt ->
      // bei ReactStrictMode doppelter useEffect-Lauf = Zeile doppelt).
      const setRow = (value: string, ok: boolean | null) =>
        setRows(prev => {
          const rest = prev.filter(r => !r.label.startsWith('6.'))
          return [...rest, { label: '6. getInstalledRelatedApps', value, ok }]
        })
      navGetInstalled
        .getInstalledRelatedApps()
        .then(apps => setRow(JSON.stringify(apps), apps.length > 0))
        .catch(err => {
          const msg = err instanceof Error ? err.message : String(err)
          setRows(prev => {
            const rest = prev.filter(r => !r.label.startsWith('6.'))
            return [...rest, { label: '6. getInstalledRelatedApps', value: `Fehler: ${msg}`, ok: null }]
          })
        })
    } else {
      rows.push({
        label: '6. getInstalledRelatedApps',
        value: 'nicht unterstuetzt',
        ok: null
      })
    }

    rows.push({
      label: '7. Notification.permission',
      value: typeof Notification !== 'undefined' ? Notification.permission : 'Notification nicht verfuegbar',
      ok: typeof Notification !== 'undefined' && Notification.permission === 'granted'
    })
    rows.push({
      label: '8. document.visibilityState',
      value: document.visibilityState,
      ok: document.visibilityState === 'visible'
    })

    setRows(rows.filter(r => !r.label.startsWith('6.')))
  }, [])

  const handleVibrateTest = useCallback(() => {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
      setVibrateResult('navigator.vibrate nicht vorhanden')
      return
    }
    const result = navigator.vibrate(200)
    setVibrateResult(String(result))
    setTimeline(prev => [
      { time: new Date().toLocaleTimeString('de-DE'), value: result },
      ...prev.slice(0, 9)
    ])
  }, [])

  const handleAudioTest = useCallback(() => {
    setAudioError(null)
    try {
      const Ctx = window.AudioContext
      if (!Ctx) {
        setAudioResult('kein AudioContext')
        return
      }
      const ctx = new Ctx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 80
      gain.gain.value = 0.6
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
      const state = ctx.state
      setTimeout(() => void ctx.close(), 400)
      setAudioResult(state)
    } catch (err) {
      setAudioResult('Fehler')
      setAudioError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const handlePatternTest = useCallback(() => {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
      setPatternResult('navigator.vibrate nicht vorhanden')
      return
    }
    playVibrationPreview(loadVibrationPattern())
    const result = navigator.vibrate(getVibrationSequence(loadVibrationPattern()) as number)
    setPatternResult(String(result))
  }, [])

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl py-6 px-4 sm:py-8">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-6 mb-8">
          <h1 className="text-lg font-semibold mb-1">Vibration-Diagnose</h1>
          <p className="text-sm text-muted-foreground">
            Diese Seite zeigt, ob das Geraet die Vibrations-API zulaesst. Bitte Marc: Seite oeffnen und die Werte
            melden.
          </p>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Umgebungswerte</h2>
          <ul className="space-y-3">
            {rows.length === 0 && <li className="text-sm text-muted-foreground">Lade Werte…</li>}
            {rows.map(row => (
              <li key={row.label} className="flex items-start gap-3">
                <span className="mt-1">{dot(row.ok)}</span>
                <span className="text-sm">
                  <span className="block font-medium text-on-surface">{row.label}</span>
                  <span className="block break-all text-muted-foreground">{row.value}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Tests</h2>

          <Button onClick={handleVibrateTest} className="w-full sm:w-auto mb-4">
            <VibrateIcon className="h-4 w-4 mr-1" />
            Vibration testen (200ms)
          </Button>
          {vibrateResult !== null && (
            <p className="mb-2 text-on-surface">
              <span className="text-3xl font-bold">{vibrateResult}</span>
              <span className="ml-2 text-sm text-muted-foreground">
                {vibrateResult === 'true'
                  ? 'Motor angesprochen'
                  : vibrateResult === 'false'
                    ? 'vom Browser/System ignoriert'
                    : ''}
              </span>
            </p>
          )}
          {timeline.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium mb-1">Zeitleiste der letzten Ergebnisse</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {timeline.map((t, i) => (
                  <li key={i}>
                    {t.time}: {String(t.value)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={handleAudioTest} variant="outline" className="w-full sm:w-auto mb-4">
            <Volume2Icon className="h-4 w-4 mr-1" />
            Ton-Puls testen
          </Button>
          {audioResult !== null && (
            <p className="mb-2 text-sm text-on-surface">
              AudioContext.state: <span className="font-semibold">{audioResult}</span>
            </p>
          )}
          {audioError && <p className="mb-6 text-sm text-destructive">Fehler: {audioError}</p>}
          <div className="mb-6" />

          <Button onClick={handlePatternTest} variant="outline" className="w-full sm:w-auto mb-4">
            <WavesIcon className="h-4 w-4 mr-1" />
            Muster testen
          </Button>
          {patternResult !== null && (
            <p className="text-sm text-on-surface">
              Rueckgabewert: <span className="font-semibold">{patternResult}</span>
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
