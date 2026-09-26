'use client'

// Zentraler Pläne-Speicher (localStorage) – gleicher Stil wie entries-store.
// Pläne sind geplante Zeitblöcke (Zukunft) und werden beim Bestätigen zu echten Einträgen.

export interface TimePlan {
  id: string
  title: string
  category: string | null
  started_at: string
  ended_at: string
  created_at: string
}

export const PLANS_STORAGE_KEY = 'chronomind_plans'
export const PLANS_CHANGED_EVENT = 'chronomind:plans-changed'

export function loadPlans(): TimePlan[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PLANS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (p): p is TimePlan =>
        p && typeof p === 'object' && typeof p.id === 'string' && typeof p.started_at === 'string'
    )
  } catch {
    return []
  }
}

export function savePlans(plans: TimePlan[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans))
  window.dispatchEvent(new CustomEvent(PLANS_CHANGED_EVENT))
}

export function addPlan(plan: TimePlan): TimePlan[] {
  const next = [...loadPlans(), plan]
  savePlans(next)
  return next
}

export function updatePlan(
  id: string,
  patch: Partial<Omit<TimePlan, 'id'>>
): TimePlan[] {
  const next = loadPlans().map(p => (p.id === id ? { ...p, ...patch, id: p.id } : p))
  savePlans(next)
  return next
}

export function removePlan(id: string): TimePlan[] {
  const next = loadPlans().filter(p => p.id !== id)
  savePlans(next)
  return next
}
