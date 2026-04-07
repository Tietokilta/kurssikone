import { Course } from '@kurssikompassi/shared/src/types'
import { parseCourseUnitPlannedPeriods, type StudyPeriodIndex } from './parsePlannedPeriods'
import { findPeriodByDate } from './studyYearPeriods'
import type {
  SisuAssessmentItemAttainment,
  SisuAttainment,
  SisuCourseUnitAttainment,
  SisuCourseUnitSelection,
} from './types'
import type { ParsedCourseUnitSelection } from '../pages/TimelinePage'

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

export function buildParsedCourseUnitSelections(
  selections: SisuCourseUnitSelection[],
  courseData: Record<string, Course>,
  periodIndex: StudyPeriodIndex | null
): ParsedCourseUnitSelection[] {
  return selections.map((s, selectionIndex) => {
    const course = courseData[s.courseUnitId]

    const name =
      (course?.nameEn && course.nameEn.trim()) ||
      (course?.nameFi && course.nameFi.trim()) ||
      course?.code ||
      s.courseUnitId

    const creditsMin = course?.creditsMin || 0
    const creditsMax = course?.creditsMax || 0
    const plannedCredits =
      creditsMax === creditsMin ? creditsMax : Math.round((creditsMax + creditsMin) / 2)

    return {
      id: s.courseUnitId,
      name,
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
  const best = new Map<string, SisuCourseUnitAttainment | SisuAssessmentItemAttainment>()
  for (const a of attainments) {
    if (a.type !== 'CourseUnitAttainment' && a.type !== 'AssessmentItemAttainment') {
      continue
    }
    const prev = best.get(a.courseUnitId)
    if (!prev || a.attainmentDate.localeCompare(prev.attainmentDate) < 0) {
      best.set(a.courseUnitId, a)
    }
  }

  const out: ParsedCourseUnitSelection[] = []
  for (const [, att] of best) {
    const slot = findPeriodByDate(periodIndex, att.attainmentDate)
    if (!slot) {
      continue
    }
    const course = courseData[att.courseUnitId]
    const name =
      (course?.nameEn && course.nameEn.trim()) ||
      (course?.nameFi && course.nameFi.trim()) ||
      course?.code ||
      att.courseUnitId
    const creditsMin = course?.creditsMin || att.credits || 0
    const creditsMax = course?.creditsMax || att.credits || 0
    const plannedCredits =
      creditsMax === creditsMin ? creditsMax : Math.round((creditsMax + creditsMin) / 2)

    out.push({
      id: att.courseUnitId,
      name,
      creditsMin,
      creditsMax,
      plannedCredits,
      parsedPlannedPeriods: [slot],
      rawData: emptySelectionRow(att.courseUnitId),
      selectionIndex: -1,
      completed: true,
    })
  }
  return out
}
