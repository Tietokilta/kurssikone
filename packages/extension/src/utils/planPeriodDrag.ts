import {
  comparePeriodKeysChronological,
  consecutiveTimelineLocatorsFrom,
  contiguousRunContainingAnchor,
  lookupParsedPlannedPeriod,
  normalizeStudyLocator,
  plannedPeriodSlotsAreTimelineConsecutive,
  sortLocatorsByTimelineOrder,
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

export function removePlannedPeriodsForRun(
  periods: string[],
  runLocators: string[],
  courseUnitId: string,
  index: StudyPeriodIndex
): string[] | null {
  let cur = periods
  for (const loc of runLocators) {
    const next = removePlannedPeriodForSlot(cur, loc, courseUnitId, index)
    if (next === null) {
      return null
    }
    cur = next
  }
  return cur
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

function rowHasSlot(
  row: SisuCourseUnitSelection,
  loc: string,
  index: StudyPeriodIndex
): boolean {
  const parsed = lookupParsedPlannedPeriod(index, loc)
  if (!parsed) {
    return false
  }
  return row.plannedPeriods.some((p) => {
    const pp = lookupParsedPlannedPeriod(index, p)
    return pp !== null && comparePeriodKeysChronological(pp.key, parsed.key) === 0
  })
}

/** True when `prefix` matches the first N slots of `full` in chronological order (same period keys). */
function isTimelinePrefixOf(
  index: StudyPeriodIndex,
  prefix: string[],
  full: string[],
  courseUnitId: string
): boolean {
  if (prefix.length > full.length) {
    return false
  }
  const sortedFull = sortLocatorsByTimelineOrder(index, full)
  const sortedPrefix = sortLocatorsByTimelineOrder(index, prefix)
  for (let i = 0; i < sortedPrefix.length; i++) {
    if (!plannedPeriodKeysEqual(sortedPrefix[i]!, sortedFull[i]!, courseUnitId, index)) {
      return false
    }
  }
  return true
}

/**
 * When the UI sends multiple column locators (same timeline row span), that list defines the run
 * if it validates — unless the plan also continues into the next row (e.g. Summer after Spring V).
 * In that case we use the longer globally contiguous run so IV+V+Summer moves together.
 *
 * When explicit validation fails, infer from the plan. When the UI sends a single locator, infer
 * the maximal globally contiguous run (e.g. V + Summer).
 */
export function resolveTimelineMoveRun(
  row: SisuCourseUnitSelection,
  sourcePlannedPeriod: string,
  connectedSourcePeriods: string[] | null | undefined,
  index: StudyPeriodIndex
): string[] | null {
  const trimmed = (connectedSourcePeriods ?? []).map((s) => s.trim()).filter(Boolean)
  const glob = contiguousRunContainingAnchor(row.plannedPeriods, sourcePlannedPeriod, index)

  if (trimmed.length > 1) {
    const sorted = sortLocatorsByTimelineOrder(index, trimmed)
    if (plannedPeriodSlotsAreTimelineConsecutive(index, sorted)) {
      if (
        sorted.some((loc) =>
          plannedPeriodKeysEqual(loc, sourcePlannedPeriod, row.courseUnitId, index)
        )
      ) {
        const allInRow = sorted.every((loc) => rowHasSlot(row, loc, index))
        if (allInRow) {
          if (
            glob !== null &&
            glob.length > sorted.length &&
            isTimelinePrefixOf(index, sorted, glob, row.courseUnitId)
          ) {
            return glob
          }
          return sorted
        }
      }
    }
  }
  return glob
}

export type ApplyPlannedPeriodMoveResult =
  | { ok: false; reason: 'same_slot' | 'source_not_found' | 'invalid_index' }
  | { ok: true; plan: SisuStudyPlan }

export function applyPlannedPeriodMove(
  plan: SisuStudyPlan,
  selectionIndex: number,
  sourcePlannedPeriod: string,
  targetPlannedPeriod: string,
  index: StudyPeriodIndex,
  connectedSourcePeriods?: string[] | null
): ApplyPlannedPeriodMoveResult {
  const row = plan.courseUnitSelections[selectionIndex]
  if (!row) {
    return { ok: false, reason: 'invalid_index' }
  }

  const run = resolveTimelineMoveRun(row, sourcePlannedPeriod, connectedSourcePeriods, index)

  if (run !== null && run.length > 1) {
    const targetRun = consecutiveTimelineLocatorsFrom(index, targetPlannedPeriod, run.length)
    if (!targetRun) {
      return { ok: false, reason: 'invalid_index' }
    }
    const sameAsBefore =
      run.length === targetRun.length &&
      run.every((loc, i) =>
        plannedPeriodKeysEqual(loc, targetRun[i]!, row.courseUnitId, index)
      )
    if (sameAsBefore) {
      return { ok: false, reason: 'same_slot' }
    }
    const withoutSources = removePlannedPeriodsForRun(row.plannedPeriods, run, row.courseUnitId, index)
    if (withoutSources === null) {
      return { ok: false, reason: 'source_not_found' }
    }
    let newPeriods = withoutSources
    for (const t of targetRun) {
      newPeriods = addPlannedPeriodIfMissing(newPeriods, t, row.courseUnitId, index)
    }
    const updated = structuredClone(plan) as SisuStudyPlan
    updated.courseUnitSelections[selectionIndex] = { ...row, plannedPeriods: newPeriods }
    updated.metadata = {
      ...updated.metadata,
      revision: updated.metadata.revision + 1,
    }
    return { ok: true, plan: updated }
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

export type ApplyPlannedPeriodExtendResult =
  | { ok: false; reason: 'same_slot' | 'invalid_index' }
  | { ok: true; plan: SisuStudyPlan }

export function applyPlannedPeriodExtend(
  plan: SisuStudyPlan,
  selectionIndex: number,
  sourcePlannedPeriod: string,
  targetPlannedPeriod: string,
  index: StudyPeriodIndex
): ApplyPlannedPeriodExtendResult {
  const row = plan.courseUnitSelections[selectionIndex]
  if (!row) {
    return { ok: false, reason: 'invalid_index' }
  }
  if (plannedPeriodKeysEqual(sourcePlannedPeriod, targetPlannedPeriod, row.courseUnitId, index)) {
    return { ok: false, reason: 'same_slot' }
  }
  const newPeriods = addPlannedPeriodIfMissing(
    row.plannedPeriods,
    targetPlannedPeriod,
    row.courseUnitId,
    index
  )
  if (newPeriods === row.plannedPeriods) {
    return { ok: false, reason: 'same_slot' }
  }
  const updated = structuredClone(plan) as SisuStudyPlan
  updated.courseUnitSelections[selectionIndex] = { ...row, plannedPeriods: newPeriods }
  updated.metadata = {
    ...updated.metadata,
    revision: updated.metadata.revision + 1,
  }
  return { ok: true, plan: updated }
}

export type ApplyPlannedPeriodUnscheduleResult =
  | { ok: false; reason: 'source_not_found' | 'invalid_index' }
  | { ok: true; plan: SisuStudyPlan }

export function applyPlannedPeriodUnschedule(
  plan: SisuStudyPlan,
  selectionIndex: number,
  sourcePlannedPeriod: string,
  index: StudyPeriodIndex
): ApplyPlannedPeriodUnscheduleResult {
  const row = plan.courseUnitSelections[selectionIndex]
  if (!row) {
    return { ok: false, reason: 'invalid_index' }
  }
  const nextPeriods = removePlannedPeriodForSlot(
    row.plannedPeriods,
    sourcePlannedPeriod,
    row.courseUnitId,
    index
  )
  if (nextPeriods === null) {
    return { ok: false, reason: 'source_not_found' }
  }
  const updated = structuredClone(plan) as SisuStudyPlan
  updated.courseUnitSelections[selectionIndex] = { ...row, plannedPeriods: nextPeriods }
  updated.metadata = {
    ...updated.metadata,
    revision: updated.metadata.revision + 1,
  }
  return { ok: true, plan: updated }
}

export type ApplyPlannedPeriodAddResult =
  | { ok: false; reason: 'invalid_index' | 'already_scheduled' }
  | { ok: true; plan: SisuStudyPlan }

export function applyPlannedPeriodAdd(
  plan: SisuStudyPlan,
  selectionIndex: number,
  targetPlannedPeriod: string,
  index: StudyPeriodIndex
): ApplyPlannedPeriodAddResult {
  const row = plan.courseUnitSelections[selectionIndex]
  if (!row) {
    return { ok: false, reason: 'invalid_index' }
  }
  if (row.plannedPeriods.length > 0) {
    return { ok: false, reason: 'already_scheduled' }
  }
  const newPeriods = addPlannedPeriodIfMissing(
    row.plannedPeriods,
    targetPlannedPeriod,
    row.courseUnitId,
    index
  )
  const updated = structuredClone(plan) as SisuStudyPlan
  updated.courseUnitSelections[selectionIndex] = { ...row, plannedPeriods: newPeriods }
  updated.metadata = {
    ...updated.metadata,
    revision: updated.metadata.revision + 1,
  }
  return { ok: true, plan: updated }
}
