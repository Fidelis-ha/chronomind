// Vibrationsmuster für die Erinnerung (Geraete-Einstellung, nicht DB).
// Bewusst ohne lib/secrets-crypto: wir lesen chronomind_settings direkt
// als JSON und entschlüsseln nichts – das Feld 'vibration' ist kein Secret.

export type VibrationPatternId = 'kurz' | 'doppelt' | 'dreifach' | 'lang' | 'herzschlag' | 'aus'

export interface VibrationPattern {
  id: VibrationPatternId
  label: string
  sequence: number[] | number
}

export const VIBRATION_PATTERNS: VibrationPattern[] = [
  { id: 'kurz', label: 'Kurz', sequence: [100] },
  { id: 'doppelt', label: 'Doppelt', sequence: [150, 120, 150] },
  { id: 'dreifach', label: 'Dreifach', sequence: [150, 100, 150, 100, 150] },
  { id: 'lang', label: 'Lang', sequence: [800] },
  { id: 'herzschlag', label: 'Herzschlag', sequence: [80, 90, 80, 500, 80, 90, 80] },
  { id: 'aus', label: 'Aus', sequence: 0 }
]

export const DEFAULT_VIBRATION_PATTERN: VibrationPatternId = 'herzschlag'

function patternById(id: string | null | undefined): VibrationPattern {
  return (
    VIBRATION_PATTERNS.find(p => p.id === id) ??
    VIBRATION_PATTERNS.find(p => p.id === DEFAULT_VIBRATION_PATTERN)!
  )
}

export function getVibrationSequence(id: string | null | undefined): number[] | number {
  return patternById(id).sequence
}

export function loadVibrationPattern(): VibrationPatternId {
  if (typeof window === 'undefined') return DEFAULT_VIBRATION_PATTERN
  try {
    const raw = localStorage.getItem('chronomind_settings')
    if (!raw) return DEFAULT_VIBRATION_PATTERN
    const stored = JSON.parse(raw) as { vibration?: string }
    const known = VIBRATION_PATTERNS.some(p => p.id === stored.vibration)
    return known ? (stored.vibration as VibrationPatternId) : DEFAULT_VIBRATION_PATTERN
  } catch {
    return DEFAULT_VIBRATION_PATTERN
  }
}

export function vibratePattern(id: VibrationPatternId | string): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate(getVibrationSequence(id) as number)
  } catch {
    // Ignorieren: fehlende Berechtigung oder nicht unterstützte Plattform
  }
}

export function playVibrationPreview(id: VibrationPatternId | string): void {
  vibratePattern(id)
}
