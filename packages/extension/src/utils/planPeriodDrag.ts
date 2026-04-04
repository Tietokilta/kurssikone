import { comparePeriodKeysChronological, parsePlannedPeriods } from './parsePlannedPeriods'
import type { SisuCourseUnitSelection, SisuStudyPlan } from './types'

export function plannedPeriodKeysEqual(
  a: string,
  b: string,
  courseUnitId: string
): boolean {
  const pa = parsePlannedPeriods(a, courseUnitId)
  const pb = parsePlannedPeriods(b, courseUnitId)
  if (!pa || !pb) {
    return false
  }
  return comparePeriodKeysChronological(pa.key, pb.key) === 0
}

/**
 * Remove one planned period matching the source cell (exact string first, else same parsed slot).
 */
export function removePlannedPeriodForSlot(
  periods: string[],
  sourcePlannedPeriod: string,
  courseUnitId: string
): string[] | null {
  const idxExact = periods.indexOf(sourcePlannedPeriod)
  if (idxExact >= 0) {
    return periods.filter((_, i) => i !== idxExact)
  }
  const sourceParsed = parsePlannedPeriods(sourcePlannedPeriod, courseUnitId)
  if (!sourceParsed) {
    return null
  }
  let removed = false
  const out = periods.filter((p) => {
    const parsed = parsePlannedPeriods(p, courseUnitId)
    if (!parsed) {
      return true
    }
    if (comparePeriodKeysChronological(parsed.key, sourceParsed.key) === 0) {
      removed = true
      return false
    }
    return true
  })
  return removed ? out : null
}

export function addPlannedPeriodIfMissing(
  periods: string[],
  targetPlannedPeriod: string,
  courseUnitId: string
): string[] {
  if (periods.includes(targetPlannedPeriod)) {
    return periods
  }
  const targetParsed = parsePlannedPeriods(targetPlannedPeriod, courseUnitId)
  if (!targetParsed) {
    return [...periods, targetPlannedPeriod]
  }
  for (const p of periods) {
    const parsed = parsePlannedPeriods(p, courseUnitId)
    if (parsed && comparePeriodKeysChronological(parsed.key, targetParsed.key) === 0) {
      return periods
    }
  }
  return [...periods, targetPlannedPeriod]
}

export function moveCourseUnitPlannedPeriod(
  row: SisuCourseUnitSelection,
  sourcePlannedPeriod: string,
  targetPlannedPeriod: string
): SisuCourseUnitSelection | null {
  const { courseUnitId } = row
  const withoutSource = removePlannedPeriodForSlot(
    row.plannedPeriods,
    sourcePlannedPeriod,
    courseUnitId
  )
  if (withoutSource === null) {
    return null
  }
  const newPeriods = addPlannedPeriodIfMissing(
    withoutSource,
    targetPlannedPeriod,
    courseUnitId
  )
  return { ...row, plannedPeriods: newPeriods }
}

export type ApplyPlannedPeriodMoveResult =
  | { ok: false; reason: 'same_slot' | 'source_not_found' | 'invalid_index' }
  | { ok: true; plan: SisuStudyPlan }

export function applyPlannedPeriodMove(
  plan: SisuStudyPlan,
  selectionIndex: number,
  sourcePlannedPeriod: string,
  targetPlannedPeriod: string
): ApplyPlannedPeriodMoveResult {
  const row = plan.courseUnitSelections[selectionIndex]
  if (!row) {
    return { ok: false, reason: 'invalid_index' }
  }
  if (plannedPeriodKeysEqual(sourcePlannedPeriod, targetPlannedPeriod, row.courseUnitId)) {
    return { ok: false, reason: 'same_slot' }
  }
  const moved = moveCourseUnitPlannedPeriod(row, sourcePlannedPeriod, targetPlannedPeriod)
  if (!moved) {
    return { ok: false, reason: 'source_not_found' }
  }
  const updated = structuredClone(plan) as SisuStudyPlan
  updated.courseUnitSelections[selectionIndex] = moved
  updated.metadata = {
    ...updated.metadata,
    revision: updated.metadata.revision + 1,
  }
  return { ok: true, plan: updated }
}
