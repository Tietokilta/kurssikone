import i18n from '../../i18n'
import type { Season } from '../../utils/parsePlannedPeriods'

export function resolvePeriodColumnLabel(
  columnPeriodHeading: string,
  plannedPeriodLocator: string
): string {
  const h = columnPeriodHeading.trim()
  if (h) return h
  const l = plannedPeriodLocator.trim()
  if (l) return l
  return i18n.t('extension.thisPeriod')
}

export function resolveTimelinePlacementLabel(
  year: number,
  season: Season,
  columnPeriodHeading: string,
  plannedPeriodLocator: string
): string {
  const period = resolvePeriodColumnLabel(columnPeriodHeading, plannedPeriodLocator)

  if (season === period) {
    return `${season} ${year}`
  }

  return `${season} ${year} ${period}`
}

export function formatKeepInPeriod(periodName: string): string {
  return i18n.t('extension.keepInPeriod', { period: periodName })
}

export function formatMoveToPeriod(periodName: string, longForm = true): string {
  if (!longForm) {
    return i18n.t('extension.moveToPeriod', { period: periodName })
  }
  return i18n.t('extension.moveToStartFrom', { period: periodName })
}

export function formatExtendToPeriod(periodName: string): string {
  return i18n.t('extension.extendToPeriod', { period: periodName })
}

export function formatRemoveFromPeriod(periodName: string): string {
  return i18n.t('extension.removeFromPeriod', { period: periodName })
}

export function formatMoveAndExpandTo(optionLabel: string): string {
  return i18n.t('extension.moveToTeachingPeriod', { option: optionLabel })
}
