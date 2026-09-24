'use client'

// Zentrale 3-Ebenen-Kategorien-Verwaltung (localStorage, mit window-Event für Live-Sync)
// Ebene 1: MainCategory, Ebene 2: SubCategory (subs), Ebene 3: Kinder einer SubCategory
import { nanoid } from '@/lib/utils'

export interface SubCategory {
  name: string
  children: SubCategory[]
}

export interface MainCategory {
  id: string
  name: string
  color: string
  subs: SubCategory[]
}

const STORAGE_KEY = 'chronomind_categories'
export const CATEGORIES_CHANGED_EVENT = 'chronomind:categories-changed'

// Fallback-Farbe nur als Datenwert (UI rendert zusätzlich helle Kanten für Dark Mode)
export const FALLBACK_CATEGORY_COLOR = '#6b7280'
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
const NAME_MAX_LENGTH = 60

/** Namen säubern: '/' ist Pfad-Trennzeichen und darf nicht im Namen stehen; auf 60 Zeichen kürzen */
export function sanitizeName(name: string): string {
  return name.replace(/\//g, '').trim().slice(0, NAME_MAX_LENGTH)
}

/** Farben validieren: nur gültige 6-stellige Hex-Werte, sonst neutraler Fallback */
function sanitizeColor(color: unknown): string {
  return typeof color === 'string' && COLOR_PATTERN.test(color) ? color : FALLBACK_CATEGORY_COLOR
}

export const DEFAULT_MAIN_CATEGORIES: MainCategory[] = [
  { id: 'cat-arbeit', name: 'Arbeit', color: '#ef4444', subs: [] },
  // Grauschwarz statt reinem Schwarz: im Dark Mode via heller Kante sichtbar
  { id: 'cat-soziale', name: 'Soziale', color: '#374151', subs: [] },
  { id: 'cat-geistlich', name: 'Geistlich', color: '#22c55e', subs: [] },
  { id: 'cat-vergnuegen', name: 'Vergnuegen', color: '#7dd3fc', subs: [] },
  { id: 'cat-eigene-versorgung', name: 'Eigene Versorgung', color: '#d1d5db', subs: [] }
]

export const CATEGORY_COLOR_PALETTE: string[] = [
  '#ef4444', // rot (Arbeit)
  '#374151', // grauschwarz (Soziale)
  '#22c55e', // grün (Geistlich)
  '#7dd3fc', // hellblau (Vergnuegen)
  '#d1d5db', // hellgrau (Eigene Versorgung)
  '#f97316', // orange
  '#eab308', // gelb
  '#8b5cf6', // violett
  '#ec4899', // pink
  '#14b8a6', // türkis
  '#3b82f6', // blau
  '#6b7280' // grau
]

function isSubCategory(value: unknown): value is SubCategory {
  if (!value || typeof value !== 'object') return false
  const s = value as Partial<SubCategory>
  return typeof s.name === 'string' && Array.isArray(s.children)
}

function normalizeSub(value: unknown): SubCategory | null {
  if (!isSubCategory(value)) return null
  return {
    name: sanitizeName(value.name),
    children: value.children.map(normalizeSub).filter((s): s is SubCategory => s !== null)
  }
}

function normalizeMain(value: unknown): MainCategory | null {
  if (!value || typeof value !== 'object') return null
  const m = value as Partial<MainCategory>
  if (typeof m.name !== 'string') return null
  const subs = Array.isArray(m.subs) ? m.subs : []
  return {
    id: typeof m.id === 'string' && m.id.length > 0 ? m.id : nanoidCat(),
    name: sanitizeName(m.name),
    color: sanitizeColor(m.color),
    subs: subs.map(normalizeSub).filter((s): s is SubCategory => s !== null)
  }
}

function nanoidCat(): string {
  return `cat-${nanoid()}`
}

export function loadCategories(): MainCategory[] {
  if (typeof window === 'undefined') return DEFAULT_MAIN_CATEGORIES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_MAIN_CATEGORIES
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_MAIN_CATEGORIES
    return parsed.map(normalizeMain).filter((c): c is MainCategory => c !== null)
  } catch {
    return DEFAULT_MAIN_CATEGORIES
  }
}

export function saveCategories(categories: MainCategory[]) {
  if (typeof window === 'undefined') return
  const clean = categories
    .map(normalizeMain)
    .filter((c): c is MainCategory => c !== null)
    .filter(c => c.name.length > 0)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
  window.dispatchEvent(new CustomEvent(CATEGORIES_CHANGED_EVENT))
}

function mutate(mutator: (cats: MainCategory[]) => MainCategory[]): MainCategory[] {
  const next = mutator(loadCategories())
  saveCategories(next)
  return next
}

export function addMainCategory(name: string, color: string): MainCategory[] {
  return mutate(cats => [
    ...cats,
    { id: nanoidCat(), name: sanitizeName(name), color: sanitizeColor(color), subs: [] }
  ])
}

export function updateMainCategory(id: string, patch: Partial<Pick<MainCategory, 'name' | 'color'>>): MainCategory[] {
  return mutate(cats =>
    cats.map(c =>
      c.id === id
        ? {
            ...c,
            name: patch.name !== undefined ? sanitizeName(patch.name) : c.name,
            color: patch.color !== undefined ? sanitizeColor(patch.color) : c.color
          }
        : c
    )
  )
}

export function removeMainCategory(id: string): MainCategory[] {
  return mutate(cats => cats.filter(c => c.id !== id))
}

/** path.mainId + path.subIdx (Ebene 1) + optional path.childIdx (Ebene 2) adressiert die Einfüge-Position */
export function addSub(
  path: { mainId: string; subIdx?: number; childIdx?: number },
  name: string
): MainCategory[] {
  const trimmed = sanitizeName(name)
  // Nach dem Sanitizing leer (z.B. nur '/'): nichts anlegen, aktuellen Stand zurückgeben
  if (!trimmed) return loadCategories()
  return mutate(cats =>
    cats.map(c => {
      if (c.id !== path.mainId) return c
      if (path.subIdx === undefined) {
        return { ...c, subs: [...c.subs, { name: trimmed, children: [] }] }
      }
      return {
        ...c,
        subs: c.subs.map((s, i) => {
          if (i !== path.subIdx) return s
          if (path.childIdx === undefined) {
            return { ...s, children: [...s.children, { name: trimmed, children: [] }] }
          }
          return {
            ...s,
            children: s.children.map((ch, j) =>
              j === path.childIdx ? { ...ch, children: [...ch.children, { name: trimmed, children: [] }] } : ch
            )
          }
        })
      }
    })
  )
}

export function updateSub(
  path: { mainId: string; subIdx: number; childIdx?: number },
  name: string
): MainCategory[] {
  const trimmed = sanitizeName(name)
  // Nach dem Sanitizing leer (z.B. nur '/'): unveraendert zurückgeben, kein Rename auf ''
  if (!trimmed) return loadCategories()
  return mutate(cats =>
    cats.map(c => {
      if (c.id !== path.mainId) return c
      return {
        ...c,
        subs: c.subs.map((s, i) => {
          if (i !== path.subIdx) return s
          if (path.childIdx === undefined) return { ...s, name: trimmed }
          return {
            ...s,
            children: s.children.map((ch, j) => (j === path.childIdx ? { ...ch, name: trimmed } : ch))
          }
        })
      }
    })
  )
}

export function removeSub(
  path: { mainId: string; subIdx: number; childIdx?: number }
): MainCategory[] {
  return mutate(cats =>
    cats.map(c => {
      if (c.id !== path.mainId) return c
      if (path.childIdx === undefined) {
        return { ...c, subs: c.subs.filter((_, i) => i !== path.subIdx) }
      }
      return {
        ...c,
        subs: c.subs.map((s, i) =>
          i === path.subIdx ? { ...s, children: s.children.filter((_, j) => j !== path.childIdx) } : s
        )
      }
    })
  )
}

/** Farbe der Hauptkategorie für ein Kategorie-Pfad-Segment (erstes Segment) */
export function colorForPath(path: string): string | null {
  const mainName = path.split('/')[0]?.trim().toLowerCase()
  if (!mainName) return null
  const cat = loadCategories().find(c => c.name.trim().toLowerCase() === mainName)
  return cat?.color ?? null
}

/** 'Arbeit/Projekt/X' -> 'Arbeit/Projekt/X' (join mit '/') */
export function categoryPathToString(path: string[]): string {
  return path.join('/')
}

/** 'Arbeit/Projekt/X' -> 'X' */
export function lastSegment(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}
