import type { Season } from '../../utils/parsePlannedPeriods'

/** Prefer column header text; fall back to locator or a generic label. */
export function resolvePeriodColumnLabel(
  columnPeriodHeading: string,
  plannedPeriodLocator: string
): string {
  const h = columnPeriodHeading.trim()
  if (h) return h
  const l = plannedPeriodLocator.trim()
  if (l) return l
  return 'this period'
}

/**
 * Full placement context for action copy: same order as the semester row title (`Spring 2025`),
 * then an em dash and the period column (or locator fallback).
 */
export function resolveTimelinePlacementLabel(
  year: number,
  season: Season,
  columnPeriodHeading: string,
  plannedPeriodLocator: string
): string {
  const period = resolvePeriodColumnLabel(columnPeriodHeading, plannedPeriodLocator)
  return `${season} ${year} ${period}`
}

export function formatKeepInPeriod(periodName: string): string {
  return `Keep in ${periodName}`
}

/**
 * @param longForm When false: `Move to {period}` (no “start from”). When true: `Move to start from {period}`
 *   for multi-period rows where re-anchoring matters.
 */
export function formatMoveToPeriod(periodName: string, longForm = true): string {
  if (!longForm) {
    return `Move to ${periodName}`
  }
  return `Move to start from ${periodName}`
}

export function formatExtendToPeriod(periodName: string): string {
  return `Extend to ${periodName}`
}

export function formatRemoveFromPeriod(periodName: string): string {
  return `Remove from ${periodName}`
}

export function formatMoveAndExpandTo(optionLabel: string): string {
  return `Schedule for ${optionLabel}`
}
