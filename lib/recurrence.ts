import { type RecurrenceRule, type TimeEntry } from '@/lib/types'

/**
 * Generate the next occurrence date based on a recurrence rule.
 * Returns null if the max count has been reached or end date has passed.
 */
export function getNextOccurrence(
  baseDate: Date,
  rule: RecurrenceRule,
  currentIndex: number
): Date | null {
  const nextDate = new Date(baseDate)

  if (rule.frequency === 'daily') {
    nextDate.setDate(nextDate.getDate() + rule.interval * 1)
  } else if (rule.frequency === 'weekly') {
    const daysUntilNextWeek = rule.interval * 7
    nextDate.setDate(nextDate.getDate() + daysUntilNextWeek)
  }

  // Check count limit
  if (rule.count !== null && currentIndex >= rule.count) {
    return null
  }

  // Check end date
  if (rule.endDate) {
    const endDate = new Date(rule.endDate)
    if (nextDate > endDate) {
      return null
    }
  }

  return nextDate
}

/**
 * Create expanded time entries from a recurring entry template.
 * Returns an array of entries for all occurrences within a date range.
 */
export function expandRecurringEntry(
  template: TimeEntry,
  rangeStart: Date,
  rangeEnd: Date
): TimeEntry[] {
  if (!template.is_recurring || !template.recurrence_rule) {
    return [template]
  }

  const entries: TimeEntry[] = []
  const rule = template.recurrence_rule
  const baseStart = new Date(template.started_at)
  const baseEnd = template.ended_at ? new Date(template.ended_at) : null
  const duration = baseEnd ? baseEnd.getTime() - baseStart.getTime() : 0

  let currentDate = new Date(baseStart)
  let index = template.recurrence_index ?? 0

  // If the template is itself a generated entry, find the original and start from there
  if (template.recurrence_parent_id) {
    // Start from the original, iterate until we're past rangeStart
    while (true) {
      const nextOccurrence = getNextOccurrence(currentDate, rule, index)
      if (!nextOccurrence) break
      if (nextOccurrence >= rangeStart) break
      currentDate = nextOccurrence
      index++
    }
  }

  // Generate entries within the date range
  while (true) {
    const nextOccurrence = getNextOccurrence(currentDate, rule, index)
    if (!nextOccurrence) break
    if (nextOccurrence > rangeEnd) break

    // Skip if before range start
    if (nextOccurrence < rangeStart) {
      currentDate = nextOccurrence
      index++
      continue
    }

    const entryStart = nextOccurrence
    const entryEnd = duration > 0 ? new Date(entryStart.getTime() + duration) : null

    const expandedEntry: TimeEntry = {
      ...template,
      id: `${template.id}_occurrence_${index}`,
      started_at: entryStart.toISOString(),
      ended_at: entryEnd ? entryEnd.toISOString() : null,
      duration_seconds: duration > 0 ? Math.round(duration / 1000) : null,
      is_recurring: true,
      recurrence_parent_id: template.recurrence_parent_id || template.id,
      recurrence_index: index
    }

    entries.push(expandedEntry)

    currentDate = nextOccurrence
    index++
  }

  // If the original entry falls within range, include it too
  const originalInRange = baseStart >= rangeStart && baseStart <= rangeEnd
  if (originalInRange && (template.recurrence_index ?? 0) === 0) {
    entries.unshift(template)
  }

  return entries
}

/**
 * Calculate the next occurrences for display (e.g., in a preview).
 * Returns up to `limit` upcoming dates.
 */
export function getUpcomingOccurrences(
  template: TimeEntry,
  limit: number = 5
): Date[] {
  if (!template.is_recurring || !template.recurrence_rule) {
    return []
  }

  const occurrences: Date[] = []
  const rule = template.recurrence_rule
  const baseStart = new Date(template.started_at)
  const baseEnd = template.ended_at ? new Date(template.ended_at) : null
  const duration = baseEnd ? baseEnd.getTime() - baseStart.getTime() : 0

  let currentDate = new Date(baseStart)
  let index = template.recurrence_index ?? 0

  while (occurrences.length < limit) {
    const nextOccurrence = getNextOccurrence(currentDate, rule, index)
    if (!nextOccurrence) break

    occurrences.push(nextOccurrence)

    currentDate = nextOccurrence
    index++
  }

  return occurrences
}

/**
 * Format a recurrence rule as a human-readable string.
 */
export function formatRecurrenceRule(rule: RecurrenceRule): string {
  const intervalText = rule.interval === 1 ? '' : `${rule.interval} `

  if (rule.frequency === 'daily') {
    if (rule.interval === 1) return 'Täglich'
    return `Alle ${rule.interval} Tage`
  } else if (rule.frequency === 'weekly') {
    if (rule.interval === 1) return 'Wöchentlich'
    return `Alle ${rule.interval} Wochen`
  }

  return `${intervalText}${rule.frequency}`
}

/**
 * Parse a recurrence rule from a simple string representation.
 * Used for quick setup in the UI.
 */
export function parseRecurrenceRule(
  frequency: 'daily' | 'weekly',
  interval: number = 1,
  endDate?: string,
  count?: number
): RecurrenceRule {
  return {
    frequency,
    interval,
    endDate: endDate || null,
    count: count || null
  }
}