'use client'

// Zentrale Aktivitäten-Verwaltung (localStorage, mit window-Event für Live-Sync)

export interface Activity {
  title: string
  icon: string
}

const STORAGE_KEY = 'chronomind_activities'
export const ACTIVITIES_CHANGED_EVENT = 'chronomind:activities-changed'

export const DEFAULT_ACTIVITIES: Activity[] = [
  { title: 'Arbeit', icon: '💼' },
  { title: 'Meeting', icon: '👥' },
  { title: 'Pause', icon: '☕' },
  { title: 'Projekt', icon: '📋' },
  { title: 'Fahren', icon: '🚗' },
  { title: 'Sonstiges', icon: '📌' }
]

export const ICON_CHOICES = [
  '💼', '👥', '☕', '📋', '🚗', '📌', '🏢', '📞', '🛒',
  '🌳', '🏃', '🏠', '💻', '📄', '🔧', '📚', '✏️', '🎓',
  '🧹', '🍳', '❤️', '⚖️', '🎹', '🙏'
]

export function loadActivities(): Activity[] {
  if (typeof window === 'undefined') return DEFAULT_ACTIVITIES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_ACTIVITIES
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_ACTIVITIES
    return parsed
      .filter((a: unknown) => a && typeof (a as Activity).title === 'string')
      .map((a: Activity) => ({ title: a.title, icon: a.icon || '⏱️' }))
  } catch {
    return DEFAULT_ACTIVITIES
  }
}

export function saveActivities(activities: Activity[]) {
  if (typeof window === 'undefined') return
  const clean = activities
    .map(a => ({ title: a.title.trim(), icon: a.icon || '⏱️' }))
    .filter(a => a.title.length > 0)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
  window.dispatchEvent(new CustomEvent(ACTIVITIES_CHANGED_EVENT))
}

/** Aktivitäten + kürzlich genutzte Titel aus Einträgen zusammenführen (für Kacheln) */
export function mergeWithRecent(activities: Activity[], recentTitles: string[]): Activity[] {
  const known = new Set(activities.map(a => a.title.toLowerCase()))
  const recent: Activity[] = []
  for (const t of recentTitles) {
    if (!known.has(t.toLowerCase()) && !recent.some(r => r.title.toLowerCase() === t.toLowerCase())) {
      recent.push({ title: t, icon: '⏱️' })
    }
  }
  return [...activities, ...recent.slice(0, 4)]
}
