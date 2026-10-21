'use client'

// Zentrale Chart.js-Registrierung (einmalig pro Bundle)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  ArcElement,
  DoughnutController,
  PointElement,
  LineElement,
  LineController,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions
} from 'chart.js'

let registered = false

// Registrierung NICHT an `typeof window` koppeln: laeuft das Modul zuerst
// serverseitig (RSC), bleibt `registered` sonst im Client-Bundle-Bereich nie
// gesetzt und Chart.js kennt den Controller nicht -> "doughnut is not a
// registered controller" (weisser Bildschirm auf /app_main/analytics).
// ChartJS.register ist idempotent, doppelte Aufrufe sind harmlos.
// Controller + Elemente werden explizit registriert (Baum-Shaking entfernt
// ungenutzte Imports). Zusaetzlich einmal als Seiteneffekt IM Modul, damit
// das Registrieren unabhaengig von der Import-Reihenfolge passiert.
if (!registered) {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    Filler,
    // Controller: werden von react-chartjs-2 ueber den type-String gesucht
    BarController,
    DoughnutController,
    LineController
  )
  registered = true
}

export { ChartJS }

/** CSS-Variable mit Fallback lesen */
export function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export interface ThemeColors {
  onSurface: string
  onSurfaceVariant: string
  outlineVariant: string
  surfaceContainerHigh: string
}

export function themeColors(): ThemeColors {
  return {
    onSurface: cssVar('--md-on-surface', '#1b1b1f'),
    onSurfaceVariant: cssVar('--md-on-surface-variant', '#44464f'),
    outlineVariant: cssVar('--md-outline-variant', '#c4c6d0'),
    surfaceContainerHigh: cssVar('--md-surface-container-high', '#e9e8ef')
  }
}

export function baseChartOptions(theme: ThemeColors): ChartOptions<'bar' | 'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        labels: {
          color: theme.onSurfaceVariant,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: theme.surfaceContainerHigh,
        borderColor: theme.outlineVariant,
        borderWidth: 1,
        titleColor: theme.onSurface,
        bodyColor: theme.onSurface,
        titleFont: { size: 12 },
        bodyFont: { size: 12, weight: 'normal' }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        border: { color: theme.outlineVariant },
        ticks: {
          color: theme.onSurfaceVariant,
          font: { size: 11 }
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { color: theme.outlineVariant },
        border: { display: false },
        ticks: {
          color: theme.onSurfaceVariant,
          font: { size: 11 }
        }
      }
    }
  }
}
