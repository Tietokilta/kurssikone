import {
  applyPlannedPeriodAdd,
  applyPlannedPeriodAddSpan,
  applyPlannedPeriodExtend,
  applyPlannedPeriodMove,
  applyPlannedPeriodUnschedule,
} from './planPeriodDrag'
import type { StudyPeriodIndex } from './parsePlannedPeriods'
import type { SisuStudyPlan } from './types'
import type { ParsedCourseUnitSelection } from '../pages/TimelinePage'
import type {
  TimelineInteractionKind,
  TimelineDragRowSnapshot,
} from '../pages/components/TimelineCardSection'

export function getUnscheduledSelections(
  plannedSelections: ParsedCourseUnitSelection[] | null,
  completedSelections: ParsedCourseUnitSelection[]
): ParsedCourseUnitSelection[] {
  if (!plannedSelections) {
    return []
  }
  const completedCourseIds = new Set(completedSelections.map((s) => s.id))
  return plannedSelections
    .filter(
      (s) =>
        s.selectionIndex >= 0 &&
        !s.completed &&
        !completedCourseIds.has(s.id) &&
        s.rawData.plannedPeriods.length === 0
    )
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

export function getTimelineDragRowSnapshot(
  activeDragKind: TimelineInteractionKind,
  activeDragSelectionIndex: number | null,
  fullPlan: SisuStudyPlan | null,
  movingRunPlannedPeriods: string[] | null
): TimelineDragRowSnapshot | null {
  if (activeDragKind === 'none' || activeDragSelectionIndex === null || !fullPlan) {
    return null
  }
  const row = fullPlan.courseUnitSelections[activeDragSelectionIndex]
  if (!row) {
    return null
  }
  return {
    courseUnitId: row.courseUnitId,
    plannedPeriods: row.plannedPeriods,
    movingRunPlannedPeriods: movingRunPlannedPeriods?.length ? movingRunPlannedPeriods : undefined,
  }
}

export function resolveDragStartState(
  dragData: Record<string, unknown> | undefined,
  plannedSelections: ParsedCourseUnitSelection[] | null
): {
  kind: TimelineInteractionKind
  selectionIndex: number | null
  unscheduledPreview: ParsedCourseUnitSelection | null
  movingRunPlannedPeriods: string[] | null
} {
  const idx = dragData?.selectionIndex
  const selIdx = typeof idx === 'number' && idx >= 0 ? idx : null

  const movingRunFromData = (): string[] | null => {
    const raw = dragData?.connectedPlannedPeriods
    if (!Array.isArray(raw) || !raw.every((x) => typeof x === 'string')) {
      return null
    }
    const filtered = (raw as string[]).map((s) => s.trim()).filter(Boolean)
    return filtered.length > 0 ? filtered : null
  }

  if (dragData?.fromUnscheduled === true) {
    return {
      kind: 'unscheduled',
      selectionIndex: selIdx,
      unscheduledPreview:
        typeof idx === 'number'
          ? plannedSelections?.find((s) => s.selectionIndex === idx) ?? null
          : null,
      movingRunPlannedPeriods: null,
    }
  }

  if (typeof dragData?.sourcePlannedPeriod === 'string' && dragData.sourcePlannedPeriod.trim()) {
    return {
      kind: 'scheduled',
      selectionIndex: selIdx,
      unscheduledPreview: null,
      movingRunPlannedPeriods: movingRunFromData(),
    }
  }

  return { kind: 'none', selectionIndex: null, unscheduledPreview: null, movingRunPlannedPeriods: null }
}

type Applied =
  | ReturnType<typeof applyPlannedPeriodAdd>
  | ReturnType<typeof applyPlannedPeriodAddSpan>
  | ReturnType<typeof applyPlannedPeriodMove>
  | ReturnType<typeof applyPlannedPeriodExtend>
  | ReturnType<typeof applyPlannedPeriodUnschedule>

type OverData =
  | {
      plannedPeriod?: string
      action?: 'move' | 'extend' | 'unschedule' | 'keep' | 'designated'
      spanLocators?: string[]
    }
  | undefined

export function resolveTimelineDrop(params: {
  fullPlan: SisuStudyPlan
  periodIndex: StudyPeriodIndex
  selectionIndex: number
  activeData: Record<string, unknown> | undefined
  overData: OverData
}): Applied | null {
  const { fullPlan, periodIndex, selectionIndex, activeData, overData } = params
  const fromUnscheduled = activeData?.fromUnscheduled === true
  const dropAction = overData?.action ?? 'move'
  const targetPlannedPeriod = overData?.plannedPeriod

  if (dropAction === 'designated') {
    if (!fromUnscheduled) {
      return null
    }
    const raw = overData?.spanLocators
    const spanLocators =
      Array.isArray(raw) && raw.every((x) => typeof x === 'string')
        ? (raw as string[]).map((s) => s.trim()).filter(Boolean)
        : []
    if (spanLocators.length === 0) {
      return null
    }
    return applyPlannedPeriodAddSpan(fullPlan, selectionIndex, spanLocators, periodIndex)
  }

  if (dropAction === 'keep') {
    return { ok: false, reason: 'same_slot' }
  }

  if (dropAction === 'unschedule') {
    if (fromUnscheduled) return null
    const startPlannedPeriod = activeData?.sourcePlannedPeriod
    if (typeof startPlannedPeriod !== 'string' || !startPlannedPeriod.trim()) return null
    return applyPlannedPeriodUnschedule(fullPlan, selectionIndex, startPlannedPeriod, periodIndex)
  }

  if (dropAction === 'extend') {
    if (fromUnscheduled) return null
    const startPlannedPeriod = activeData?.sourcePlannedPeriod
    if (typeof startPlannedPeriod !== 'string' || !startPlannedPeriod.trim()) return null
    if (typeof targetPlannedPeriod !== 'string' || !targetPlannedPeriod.trim()) return null
    return applyPlannedPeriodExtend(
      fullPlan,
      selectionIndex,
      startPlannedPeriod,
      targetPlannedPeriod,
      periodIndex
    )
  }

  if (typeof targetPlannedPeriod !== 'string' || !targetPlannedPeriod.trim()) return null
  if (fromUnscheduled) {
    return applyPlannedPeriodAdd(fullPlan, selectionIndex, targetPlannedPeriod, periodIndex)
  }
  const startPlannedPeriod = activeData?.sourcePlannedPeriod
  if (typeof startPlannedPeriod !== 'string' || !startPlannedPeriod.trim()) return null
  const rawConnected = activeData?.connectedPlannedPeriods
  const connected =
    Array.isArray(rawConnected) && rawConnected.every((x) => typeof x === 'string')
      ? (rawConnected as string[]).map((s) => s.trim()).filter(Boolean)
      : null
  return applyPlannedPeriodMove(
    fullPlan,
    selectionIndex,
    startPlannedPeriod,
    targetPlannedPeriod,
    periodIndex,
    connected && connected.length > 0 ? connected : null
  )
}

export function mapApplyFailureToSaveError(reason: string): string | null {
  if (reason === 'same_slot') {
    return null
  }
  if (reason === 'source_not_found') {
    return 'Could not update plan (source period not found).'
  }
  if (reason === 'already_scheduled') {
    return 'Could not schedule (course already has a planned period).'
  }
  if (reason === 'invalid_span' || reason === 'empty_span') {
    return 'Could not schedule (periods are not consecutive on the timeline).'
  }
  if (reason === 'invalid_index') {
    return 'Could not update plan.'
  }
  return 'Could not update plan.'
}
