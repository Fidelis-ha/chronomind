'use client'

// Versions-Anzeige in den Einstellungen: Version, Build-Zeitpunkt, Commit (GitHub-Link)
// und beim Antippen ein kurzer Änderungskatalog. Client-Render nach Mount, damit
// Intl-Formatierung server/client garantiert identisch ist.

import { useEffect, useState } from 'react'
import {
  APP_VERSION,
  APP_COMMIT_SHA,
  APP_BUILD_TIME,
  CHANGELOG,
  commitUrl,
  shortSha,
  formatBuildTime
} from '@/lib/app-version'

export function VersionInfo() {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-6" />
  }

  const sha = APP_COMMIT_SHA

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-6">
      <h2 className="text-lg font-semibold mb-1">App &amp; Version</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Antippen zeigt den Änderungskatalog der letzten Versionen.
      </p>

      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full text-left rounded-xl px-3 py-3 min-h-[52px] bg-surface-container-lowest ring-1 ring-border transition-colors duration-200 hover:bg-on-surface/[0.06] active:bg-on-surface/[0.1]"
      >
        <span className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-semibold">Version {APP_VERSION}</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Build {formatBuildTime(APP_BUILD_TIME)} Uhr · Commit{' '}
              {shortSha(sha)}
            </span>
          </span>
          <span
            className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
            aria-hidden
          >
            ▸
          </span>
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {shortSha(sha) !== '—' && (
            <p className="text-xs text-muted-foreground">
              Commit auf GitHub:{' '}
              <a
                href={commitUrl(sha)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary"
              >
                {shortSha(sha)}
              </a>
            </p>
          )}
          {CHANGELOG.map(e => (
            <div key={e.version}>
              <div className="text-sm font-semibold">
                v{e.version}{' '}
                <span className="font-normal text-muted-foreground">· {e.date}</span>
                {e.version === APP_VERSION && (
                  <span className="ml-2 text-[11px] font-semibold text-primary">installiert</span>
                )}
              </div>
              <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {e.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
