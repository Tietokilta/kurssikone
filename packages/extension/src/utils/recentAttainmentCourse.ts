import { fetchAttainments, fetchCourseUnits, fetchStudyPlans, initSisuAuth } from '../requestHandlers'

export type CompletedCourse = {
  code: string
  names: string[]
  /** Attainment dates in Sisu's UI format (`d.m.yyyy`). */
  dates: string[]
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()

/** `2026-05-31` → `31.5.2026`, as shown in the "Latest completed credits" widget. */
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

/** Letters and digits only, so punctuation, spacing and casing differences don't break matching. */
const looseKey = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

/**
 * Finds the course a widget row refers to. The row text looks like
 * `Programming Parallel Computers D, 5 cr, 31.5.2026` and has no course code, so the course is
 * matched by its name (in any language) being the start of the row, preferring the one completed
 * on the row's date. If no name matches, a course that is the only one completed on that date is used.
 */
export const matchCompletedCourse = (
  courses: CompletedCourse[],
  description: string,
  date: string
): { code: string; name: string } | null => {
  const text = looseKey(description)
  const candidates = courses.flatMap((course) =>
    course.names
      .filter((name) => looseKey(name) !== '' && text.startsWith(looseKey(name)))
      .map((name) => ({ code: course.code, name, dateMatches: course.dates.includes(date) }))
  )

  if (candidates.length === 0) {
    const onDate = courses.filter((course) => course.dates.includes(date))
    if (new Set(onDate.map((c) => c.code)).size !== 1) return null
    return { code: onDate[0].code, name: onDate[0].names[0] ?? normalize(description) }
  }

  const dated = candidates.some((c) => c.dateMatches)
    ? candidates.filter((c) => c.dateMatches)
    : candidates
  // Longest name wins so "Course A" doesn't shadow "Course A, part 2"
  const longest = Math.max(...dated.map((c) => looseKey(c.name).length))
  const best = dated.filter((c) => looseKey(c.name).length === longest)
  // Same name with different codes and nothing to tell them apart: don't guess
  if (new Set(best.map((c) => c.code)).size > 1) return null
  return { code: best[0].code, name: best[0].name }
}

export const resolveCompletedCourse = async (description: string, date: string) => {
  const courses = await getCompletedCourses()
  const match = matchCompletedCourse(courses, description, date)
  if (!match) {
    console.warn('[KurssiKone] No completed course matched widget row', {
      description: normalize(description),
      date,
      completedCourses: courses.map((c) => ({ code: c.code, names: c.names, dates: c.dates })),
    })
  }
  return match
}
