'use client'

import { type TimeEntry } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TimeEntryCardProps {
  entry: TimeEntry
  onEdit?: (entry: TimeEntry) => void
  onDelete?: (id: string) => void
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function getRecurrenceLabel(entry: TimeEntry): string | null {
  if (!entry.is_recurring || !entry.recurrence_rule) return null
  const rule = entry.recurrence_rule
  if (rule.frequency === 'daily') {
    return rule.interval === 1 ? 'Täglich' : `Alle ${rule.interval} Tage`
  }
  if (rule.frequency === 'weekly') {
    return rule.interval === 1 ? 'Wöchentlich' : `Alle ${rule.interval} Wochen`
  }
  return null
}

export function TimeEntryCard({ entry, onEdit, onDelete }: TimeEntryCardProps) {
  const isRunning = !entry.ended_at

  return (
    <div className={cn(
      "rounded-lg border p-4 transition-colors hover:bg-muted/50",
      isRunning && "border-l-4 border-l-green-500"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate">{entry.title}</h3>
            {entry.category && (
              <Badge variant="secondary" className="text-xs">
                {entry.category}
              </Badge>
            )}
            {entry.is_recurring && (
              <Badge variant="outline" className="text-xs">
                {getRecurrenceLabel(entry)}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {formatDate(entry.started_at)} · {formatTime(entry.started_at)}
              {entry.ended_at && ` – ${formatTime(entry.ended_at)}`}
              {isRunning && <span className="text-green-500 ml-1">• läuft</span>}
            </span>
            <span className="font-medium">
              {formatDuration(entry.duration_seconds)}
            </span>
          </div>

          {entry.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {entry.description}
            </p>
          )}

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex gap-1 mt-2">
              {entry.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(entry)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(entry.id)}
              className="text-red-500 hover:text-red-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}