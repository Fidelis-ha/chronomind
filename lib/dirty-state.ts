'use client'

// Dirty-State: lokal geändert, aber noch NICHT in die Cloud hochgeladen.
// Speicherung = Cloud-Upload (gemäß Anforderung).

const KEY = 'chronomind_dirty'
export const DIRTY_CHANGED_EVENT = 'chronomind:dirty-changed'
export const SETTINGS_CHANGED_EVENT = 'chronomind:settings-changed'

export function isDirty(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(KEY) === '1'
}

export function markDirty() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(KEY) !== '1') {
    localStorage.setItem(KEY, '1')
    window.dispatchEvent(new CustomEvent(DIRTY_CHANGED_EVENT))
  }
}

export function clearDirty() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(KEY) === '1') {
    localStorage.removeItem(KEY)
    window.dispatchEvent(new CustomEvent(DIRTY_CHANGED_EVENT))
  }
}
