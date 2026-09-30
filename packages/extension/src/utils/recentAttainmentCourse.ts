import { fetchAttainments, fetchCourseUnits, fetchStudyPlans, initSisuAuth } from '../requestHandlers'

export type CompletedCourse = {
  code: string
  names: string[]
  /** Attainment dates in Sisu's UI format (`d.m.yyyy`). */
  dates: string[]
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()

/** `2026-05-31` → `31.5.2026` */
const toSisuUiDate = (isoDate: string): string | null => {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return `${Number(match[3])}.${Number(match[2])}.${match[1]}`
}

const loadCompletedCourses = async (): Promise<CompletedCourse[]> => {
  await initSisuAuth()

  const plansResult = await fetchStudyPlans()
  if (!plansResult.ok) throw new Error(`Study plans fetch failed: ${plansResult.error}`)
  const personId = plansResult.data[0]?.userId
  if (!personId) throw new Error('No study plan to read the person ID from')

  const attainmentsResult = await fetchAttainments(personId)
  if (!attainmentsResult.ok) throw new Error(`Attainments fetch failed: ${attainmentsResult.error}`)

  const datesByCourseUnitId = new Map<string, string[]>()
  for (const a of attainmentsResult.data) {
    if (a.type !== 'CourseUnitAttainment' && a.type !== 'AssessmentItemAttainment') continue
    const date = toSisuUiDate(a.attainmentDate ?? '')
    if (!date) continue
    datesByCourseUnitId.set(a.courseUnitId, [...(datesByCourseUnitId.get(a.courseUnitId) ?? []), date])
  }

  const courseUnitsResult = await fetchCourseUnits([...datesByCourseUnitId.keys()])
  if (!courseUnitsResult.ok) throw new Error(`Course units fetch failed: ${courseUnitsResult.error}`)

  return courseUnitsResult.data.map((unit) => ({
    code: unit.code,
    names: Object.values(unit.name ?? {})
      .filter((name): name is string => typeof name === 'string' && name.trim() !== '')
      .map(normalize),
    dates: datesByCourseUnitId.get(unit.id) ?? [],
  }))
}

let completedCoursesPromise: Promise<CompletedCourse[]> | null = null

const getCompletedCourses = (): Promise<CompletedCourse[]> => {
  if (!completedCoursesPromise) {
    completedCoursesPromise = loadCompletedCourses().catch((error) => {
      completedCoursesPromise = null
      throw error
    })
  }
  return completedCoursesPromise
}

/** Captures the name from `<name>, <credits> <unit>[, <date>]`. */
const ROW_PATTERN = /^(.+?)\s*,\s*\d+(?:[.,]\d+)?\s*\p{L}+\s*(?:,.*)?$/u

/**
 * Widget rows (`Programming Parallel Computers D, 5 cr, 31.5.2026`) have no course code, so the
 * course is matched by its exact name, using the row's date to tell apart courses sharing a name.
 */
export const matchCompletedCourse = (
  courses: CompletedCourse[],
  description: string,
  date: string
): { code: string; name: string } | null => {
  const rowName = normalize(description).match(ROW_PATTERN)?.[1].toLowerCase()
  if (!rowName) return null

  const candidates = courses.flatMap((course) =>
    course.names
      .filter((name) => name.toLowerCase() === rowName)
      .map((name) => ({ code: course.code, name, dateMatches: course.dates.includes(date) }))
  )
  const best = candidates.some((c) => c.dateMatches)
    ? candidates.filter((c) => c.dateMatches)
    : candidates
  if (new Set(best.map((c) => c.code)).size !== 1) return null
  return { code: best[0].code, name: best[0].name }
}

export const resolveCompletedCourse = async (description: string, date: string) => {
  const courses = await getCompletedCourses()
  const match = matchCompletedCourse(courses, description, date)
  if (!match) {
    console.warn('[KurssiKone] No completed course matched widget row:', normalize(description))
  }
  return match
}
