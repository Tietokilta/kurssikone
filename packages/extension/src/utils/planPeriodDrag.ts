import {
  comparePeriodKeysChronological,
  lookupParsedPlannedPeriod,
  normalizeStudyLocator,
  type StudyPeriodIndex,
} from './parsePlannedPeriods'
import type { SisuCourseUnitSelection, SisuStudyPlan } from './types'

export function plannedPeriodKeysEqual(
  a: string,
  b: string,
  _courseUnitId: string,
  index: StudyPeriodIndex
): boolean {
  const pa = lookupParsedPlannedPeriod(index, a)
  const pb = lookupParsedPlannedPeriod(index, b)
  if (!pa || !pb) {
    return false
  }
  return comparePeriodKeysChronological(pa.key, pb.key) === 0
}

export function removePlannedPeriodForSlot(
  periods: string[],
  sourcePlannedPeriod: string,
  _courseUnitId: string,
  index: StudyPeriodIndex
): string[] | null {
  const idxExact = periods.findIndex((p) => normalizeStudyLocator(p) === normalizeStudyLocator(sourcePlannedPeriod))
  if (idxExact >= 0) {
    return periods.filter((_, i) => i !== idxExact)
  }
  const sourceParsed = lookupParsedPlannedPeriod(index, sourcePlannedPeriod)
  if (!sourceParsed) {
    return null
  }
  let removed = false
  const out = periods.filter((p) => {
    const parsed = lookupParsedPlannedPeriod(index, p)
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
  _courseUnitId: string,
  index: StudyPeriodIndex
): string[] {
  const normTarget = normalizeStudyLocator(targetPlannedPeriod)
  if (periods.some((p) => normalizeStudyLocator(p) === normTarget)) {
    return periods
  }
  const targetParsed = lookupParsedPlannedPeriod(index, targetPlannedPeriod)
  if (!targetParsed) {
    return [...periods, targetPlannedPeriod]
  }
  for (const p of periods) {
    const parsed = lookupParsedPlannedPeriod(index, p)
    if (parsed && comparePeriodKeysChronological(parsed.key, targetParsed.key) === 0) {
      return periods
    }
  }
  return [...periods, targetPlannedPeriod]
}

export function moveCourseUnitPlannedPeriod(
  row: SisuCourseUnitSelection,
  sourcePlannedPeriod: string,
  targetPlannedPeriod: string,
  index: StudyPeriodIndex
): SisuCourseUnitSelection | null {
  const { courseUnitId } = row
  const withoutSource = removePlannedPeriodForSlot(
    row.plannedPeriods,
    sourcePlannedPeriod,
    courseUnitId,
    index
  )
  if (withoutSource === null) {
    return null
  }
  const newPeriods = addPlannedPeriodIfMissing(
    withoutSource,
    targetPlannedPeriod,
    courseUnitId,
    index
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
  targetPlannedPeriod: string,
  index: StudyPeriodIndex
): ApplyPlannedPeriodMoveResult {
  const row = plan.courseUnitSelections[selectionIndex]
  if (!row) {
    return { ok: false, reason: 'invalid_index' }
  }
  if (plannedPeriodKeysEqual(sourcePlannedPeriod, targetPlannedPeriod, row.courseUnitId, index)) {
    return { ok: false, reason: 'same_slot' }
  }
  const moved = moveCourseUnitPlannedPeriod(row, sourcePlannedPeriod, targetPlannedPeriod, index)
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
