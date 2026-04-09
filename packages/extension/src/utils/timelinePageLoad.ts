import { Course } from '@kurssikompassi/shared/src/types'
import {
  fetchAttainments,
  fetchCourseUnits,
  fetchStudyPlans,
  fetchStudyYears,
} from '../requestHandlers'
import {
  defaultFirstStudyYearWhenNoAttainments,
  firstStudyYearFromAttainmentDates,
} from './inferSisuFirstStudyYear'
import { DEFAULT_SISU_ROOT_ID } from './timelinePageData'
import { koriCourseUnitToSharedCourse } from './sisuKoriCourseUnit'
import type { SisuAttainment, SisuStudyPlan, SisuStudyYear } from './types'

type TimelineLoadSuccess = {
  ok: true
  plan: SisuStudyPlan
  courseData: Record<string, Course>
  attainments: SisuAttainment[]
  studyYears: SisuStudyYear[] | null
  studyYearsWarning: string | null
}

type TimelineLoadFailure = {
  ok: false
  error: string
}

export type TimelineLoadResult = TimelineLoadSuccess | TimelineLoadFailure

export async function loadTimelineData(planId: string): Promise<TimelineLoadResult> {
  const plansResult = await fetchStudyPlans()
  if (!plansResult.ok) {
    console.error('[Kurssikompassi/Timeline]', 'Study plans fetch failed', {
      error: plansResult.error,
      message: plansResult.error === 'fetch_failed' ? plansResult.message : undefined,
    })
    if (plansResult.error === 'no_sisu_token') {
      return { ok: false, error: 'Could not get Sisu auth' }
    }
    return { ok: false, error: plansResult.message ?? 'Failed to load study plans' }
  }

  const plan = plansResult.data.find((p) => p.id === planId)
  if (!plan) {
    return { ok: false, error: 'Plan not found' }
  }

  const selections = plan.courseUnitSelections
  const plannedIds = [...new Set(selections.map((s) => s.courseUnitId))]

  const attainmentsResult = await fetchAttainments(plan.userId)
  if (!attainmentsResult.ok) {
    console.warn('[Kurssikompassi/Timeline]', 'Attainments fetch failed', {
      error: attainmentsResult.error,
      message: attainmentsResult.error === 'fetch_failed' ? attainmentsResult.message : undefined,
    })
  }
  const attainments = attainmentsResult.ok ? attainmentsResult.data : []

  const fromAtt = firstStudyYearFromAttainmentDates(attainments)
  const firstYear = fromAtt ?? defaultFirstStudyYearWhenNoAttainments()

  const studyYearsResult = await fetchStudyYears(DEFAULT_SISU_ROOT_ID, firstYear)

  let studyYears: SisuStudyYear[] | null = null
  let studyYearsWarning: string | null = null
  if (studyYearsResult.ok) {
    studyYears = studyYearsResult.data
  } else {
    console.warn('[Kurssikompassi/Timeline]', 'Study years fetch failed', {
      error: studyYearsResult.error,
      message: studyYearsResult.error === 'fetch_failed' ? studyYearsResult.message : undefined,
      organisationId: DEFAULT_SISU_ROOT_ID,
      firstYear,
    })
    studyYearsWarning =
      studyYearsResult.error === 'no_sisu_token'
        ? 'Study years unavailable (no Sisu auth)'
        : studyYearsResult.error === 'fetch_failed' && studyYearsResult.message
          ? `Study years unavailable: ${studyYearsResult.message}`
          : 'Study years unavailable'
  }

  const attainmentCourseIds = new Set<string>()
  for (const a of attainments) {
    if (a.type === 'CourseUnitAttainment' || a.type === 'AssessmentItemAttainment') {
      attainmentCourseIds.add(a.courseUnitId)
    }
  }

  const allIds = [...new Set([...plannedIds, ...attainmentCourseIds])]
  const courseUnitsResult = await fetchCourseUnits(allIds)
  if (!courseUnitsResult.ok) {
    console.error('[Kurssikompassi/Timeline]', 'Course units fetch failed', {
      error: courseUnitsResult.error,
      message: courseUnitsResult.error === 'fetch_failed' ? courseUnitsResult.message : undefined,
    })
    if (courseUnitsResult.error === 'no_sisu_token') {
      return { ok: false, error: 'Could not get Sisu auth' }
    }
    return {
      ok: false,
      error: courseUnitsResult.message ?? 'Failed to load course metadata',
    }
  }

  const courseData: Record<string, Course> = {}
  for (const u of courseUnitsResult.data) {
    courseData[u.id] = koriCourseUnitToSharedCourse(u)
  }

  return {
    ok: true,
    plan,
    courseData,
    attainments,
    studyYears,
    studyYearsWarning,
  }
}
