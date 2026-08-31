import { Course } from '@kurssikone/shared/src/types'
import { buildTeachingPeriodQuickOptions } from './parseKoriTeachingPeriods'
import { getTodayDateIso, prepareTeachingPeriodsForTimeline } from './teachingPeriodTimeline'
import { parseCourseUnitPlannedPeriods, type StudyPeriodIndex } from './parsePlannedPeriods'
import { findPeriodByDate } from './studyYearPeriods'
import i18n from '../i18n'
import type {
  SisuAssessmentItemAttainment,
  SisuAttainment,
  SisuCourseUnitAttainment,
  SisuCourseUnitSelection,
  SisuCustomCourseUnitAttainment,
} from './types'
import type { ParsedPlannedPeriod } from './parsePlannedPeriods'
import type { ParsedCourseUnitSelection } from '../pages/TimelinePage'

function localizedName(fi: string | undefined | null, en: string | undefined | null, fallback: string): string {
  const preferFi = i18n.language === 'fi'
  const primary = preferFi ? fi?.trim() : en?.trim()
  const secondary = preferFi ? en?.trim() : fi?.trim()
  return primary || secondary || fallback
}

export const DEFAULT_SISU_ROOT_ID = 'aalto-university-root-id'

export function extractSisuRootId(selections: ParsedCourseUnitSelection[]): string {
  for (const s of selections) {
    for (const p of s.rawData.plannedPeriods) {
      const root = p.split('/')[0]
      if (root) {
        return root
      }
    }
  }
  return DEFAULT_SISU_ROOT_ID
}

function emptySelectionRow(courseUnitId: string): SisuCourseUnitSelection {
  return {
    courseUnitId,
    parentModuleId: '',
    completionMethodId: null,
    substitutedBy: [],
    substituteFor: [],
    plannedPeriods: [],
    gradeRaiseAttempt: null,
  }
}

/** States that should not appear as completed on the timeline (failed / voided). */
const TIMELINE_NON_COMPLETION_STATES = new Set(
  ['FAILED', 'CANCELLED', 'WITHDRAWN', 'REJECTED', 'DRAFT'].map((s) => s.toUpperCase())
)

function normState(s: string | undefined | null): string {
  return (s ?? '').trim().toUpperCase()
}

/** ISO date for ordering / placement; prefers attainment date, then registration. */
export function placementSortKey(a: { attainmentDate: string; registrationDate: string }): string {
  const ad = a.attainmentDate?.trim()
  if (ad) {
    return ad
  }
  return a.registrationDate?.trim() ?? ''
}

function findSlotForAttainment(
  periodIndex: StudyPeriodIndex,
  a: { attainmentDate: string; registrationDate: string }
): ParsedPlannedPeriod | null {
  const ad = a.attainmentDate?.trim()
  const rd = a.registrationDate?.trim()
  if (ad) {
    const slot = findPeriodByDate(periodIndex, ad)
    if (slot) {
      return slot
    }
  }
  if (rd && rd !== ad) {
    return findPeriodByDate(periodIndex, rd)
  }
  return null
}

export type TimelineCompletionAttainment =
  | SisuCourseUnitAttainment
  | SisuAssessmentItemAttainment
  | SisuCustomCourseUnitAttainment

/**
 * Whether an ORI attainment should contribute a “completed course” row on the timeline.
 * Counts credit-bearing rows such as {@link SisuAttainmentBase.state} `INCLUDED` (e.g. transfer / aggregation).
 * Matching is case-insensitive for `state` and `primaryStatus`.
 */
export function countsAsTimelineCompletion(a: TimelineCompletionAttainment): boolean {
  if (TIMELINE_NON_COMPLETION_STATES.has(normState(a.state))) {
    return false
  }
  if (normState(a.state) === 'INCLUDED') {
    return true
  }
  if (a.type === 'AssessmentItemAttainment' && normState(a.primaryStatus) === 'INCLUDED') {
    return true
  }
  return true
}

export function buildParsedCourseUnitSelections(
  selections: SisuCourseUnitSelection[],
  courseData: Record<string, Course>,
  periodIndex: StudyPeriodIndex | null
): ParsedCourseUnitSelection[] {
  return selections.map((s, selectionIndex) => {
    const course = courseData[s.courseUnitId]

    const name = localizedName(course?.nameFi, course?.nameEn, course?.code || s.courseUnitId)

    const code = (course?.code && course.code.trim()) || ''

    const creditsMin = course?.creditsMin || 0
    const creditsMax = course?.creditsMax || 0
    const plannedCredits =
      creditsMax === creditsMin ? creditsMax : Math.round((creditsMax + creditsMin) / 2)

    const todayIso = getTodayDateIso()
    const prepared = prepareTeachingPeriodsForTimeline(course, periodIndex, todayIso)
    const teachingPeriodQuickOptions = buildTeachingPeriodQuickOptions(
      periodIndex,
      prepared.quickGroups
    )

    return {
      id: s.courseUnitId,
      name,
      code,
      creditsMin,
      creditsMax,
      plannedCredits,
      parsedPlannedPeriods: parseCourseUnitPlannedPeriods(
        s.courseUnitId,
        s.plannedPeriods,
        periodIndex
      ),
      rawData: s,
      selectionIndex,
      teachingPeriodLabels: prepared.displayLabels,
      teachingPeriodQuickOptions,
    }
  })
}

export function buildCompletedSelections(
  attainments: SisuAttainment[],
  periodIndex: StudyPeriodIndex | null,
  courseData: Record<string, Course>
): ParsedCourseUnitSelection[] {
  if (!periodIndex) {
    return []
  }
  type Best =
    | { kind: 'standard'; att: SisuCourseUnitAttainment | SisuAssessmentItemAttainment }
    | { kind: 'custom'; att: SisuCustomCourseUnitAttainment }
  const best = new Map<string, Best>()
  for (const a of attainments) {
    if (a.type === 'CourseUnitAttainment' || a.type === 'AssessmentItemAttainment') {
      if (!countsAsTimelineCompletion(a)) {
        continue
      }
      const key = `std:${a.courseUnitId}`
      const prev = best.get(key)
      const prevKey = prev?.kind === 'standard' ? placementSortKey(prev.att) : ''
      if (!prev || placementSortKey(a).localeCompare(prevKey) < 0) {
        best.set(key, { kind: 'standard', att: a })
      }
      continue
    }
    if (a.type === 'CustomCourseUnitAttainment') {
      if (!countsAsTimelineCompletion(a)) {
        continue
      }
      const key = `cust:${a.id}`
      const prev = best.get(key)
      const prevKey = prev?.kind === 'custom' ? placementSortKey(prev.att) : ''
      if (!prev || placementSortKey(a).localeCompare(prevKey) < 0) {
        best.set(key, { kind: 'custom', att: a })
      }
    }
  }

  const out: ParsedCourseUnitSelection[] = []
  for (const [, entry] of best) {
    if (entry.kind === 'custom') {
      const att = entry.att
      const slot = findSlotForAttainment(periodIndex, att)
      if (!slot) {
        continue
      }
      const name = localizedName(att.name.fi, att.name.en, att.code || att.id)
      const code = (att.code && att.code.trim()) || ''
      const creditsMin = att.credits || 0
      const creditsMax = att.credits || 0
      const plannedCredits =
        creditsMax === creditsMin ? creditsMax : Math.round((creditsMax + creditsMin) / 2)
      out.push({
        id: att.id,
        name,
        code,
        creditsMin,
        creditsMax,
        plannedCredits,
        parsedPlannedPeriods: [slot],
        rawData: emptySelectionRow(att.id),
        selectionIndex: -1,
        completed: true,
        teachingPeriodLabels: [],
        teachingPeriodQuickOptions: [],
      })
      continue
    }

    const att = entry.att
    const slot = findSlotForAttainment(periodIndex, att)
    if (!slot) {
      continue
    }
    const course = courseData[att.courseUnitId]
    const name = localizedName(course?.nameFi, course?.nameEn, course?.code || att.courseUnitId)
    const code = (course?.code && course.code.trim()) || ''
    const plannedCredits = att.credits || 0
    const creditsMin = plannedCredits
    const creditsMax = plannedCredits

    const todayIso = getTodayDateIso()
    const prepared = prepareTeachingPeriodsForTimeline(course, periodIndex, todayIso)
    const teachingPeriodQuickOptions = buildTeachingPeriodQuickOptions(
      periodIndex,
      prepared.quickGroups
    )

    out.push({
      id: att.courseUnitId,
      name,
      code,
      creditsMin,
      creditsMax,
      plannedCredits,
      parsedPlannedPeriods: [slot],
      rawData: emptySelectionRow(att.courseUnitId),
      selectionIndex: -1,
      completed: true,
      teachingPeriodLabels: prepared.displayLabels,
      teachingPeriodQuickOptions,
    })
  }
  return out
}
