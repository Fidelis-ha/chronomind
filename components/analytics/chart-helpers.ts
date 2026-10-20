'use client'

import { useMemo } from 'react'
import {
  Chart as ChartJS,
  Tooltip as ChartTooltip,
  Legend as ChartLegend
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { themeColors } from './chart-registry'
import { colorForPath } from '@/lib/categories'

export const SONSTIGE_LABEL = 'Sonstige'
const SONSTIGE_COLOR = '#9e9e9e'

export function mainCategory(entryCategory: string | null | undefined): string {
  if (!entryCategory) return SONSTIGE_LABEL
  const main = entryCategory.split('/')[0]?.trim()
  return main || SONSTIGE_LABEL
}

export function mainCategoryColor(entryCategory: string | null | undefined): string {
  if (!entryCategory) return SONSTIGE_COLOR
  const color = colorForPath(entryCategory)
  return color || SONSTIGE_COLOR
}
