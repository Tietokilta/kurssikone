import type { Course, CourseTeachingPeriodGroup } from '@kurssikone/shared'
import type { Season, StudyPeriodIndex } from './parsePlannedPeriods'
import { expandSummerGroupsByGridYear, formatTeachingPeriodGroup } from './parseKoriTeachingPeriods'

export function getTodayDateIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isCourseValidityEnded(
  validityEnd: string | null | undefined,
  todayIso: string
): boolean {
  if (validityEnd == null || validityEnd === '') {
    return false
  }
  return todayIso > validityEnd
}

export function isAcademicYearFullyPast(academicYearStart: number, todayIso: string): boolean {
  return todayIso > `${academicYearStart + 1}-08-31`
}

/** Latest end date among all study periods on this timeline season card. */
function maxEndDateForSeasonOnTimeline(
  index: StudyPeriodIndex,
  timelineYear: number,
  season: Season
): string | null {
  let max = ''
  for (const iv of index.intervals) {
    if (iv.parsed.year === timelineYear && iv.parsed.season === season) {
      if (iv.endDay > max) {
        max = iv.endDay
      }
    }
  }
  return max || null
}

function seasonsTouchedByGroup(g: CourseTeachingPeriodGroup): Array<{ y: number; season: Season }> {
  if (g.season === 'Spring' && g.periodTo === 'Summer' && g.periodFrom !== 'Summer') {
    return [
      { y: g.timelineYear, season: 'Spring' },
      { y: g.timelineYear, season: 'Summer' },
    ]
  }
  return [{ y: g.timelineYear, season: g.season as Season }]
}

/**
 * Past only when every timeline season touched by the group has ended (not per Roman period).
 */
function isGroupPastHeuristic(g: CourseTeachingPeriodGroup, todayIso: string): boolean {
  const touched = seasonsTouchedByGroup(g)
  for (const { y, season } of touched) {
    const approxEnd =
      season === 'Fall' ? `${y + 1}-02-28` : season === 'Spring' ? `${y}-08-31` : `${y}-09-30`
    if (todayIso <= approxEnd) {
      return false
    }
  }
  return true
}

function isGroupPast(
  index: StudyPeriodIndex | null,
  g: CourseTeachingPeriodGroup,
  todayIso: string
): boolean {
  const touched = seasonsTouchedByGroup(g)
  if (!index) {
    return isGroupPastHeuristic(g, todayIso)
  }
  for (const { y, season } of touched) {
    const maxEnd = maxEndDateForSeasonOnTimeline(index, y, season)
    if (!maxEnd) {
      return false
    }
    if (todayIso <= maxEnd) {
      return false
    }
  }
  return true
}

function compareGroups(a: CourseTeachingPeriodGroup, b: CourseTeachingPeriodGroup): number {
  if (a.timelineYear !== b.timelineYear) {
    return a.timelineYear - b.timelineYear
  }
  const so = (s: string) => (s === 'Fall' ? 0 : s === 'Spring' ? 1 : 2)
  const sd = so(a.season) - so(b.season)
  if (sd !== 0) {
    return sd
  }
  const po = (x: CourseTeachingPeriodGroup) =>
    ['I', 'II', 'III', 'IV', 'V', 'Summer'].indexOf(x.periodFrom)
  return po(a) - po(b)
}

export function formatNoTeachingYearLabel(academicYearStart: number): string {
  return `No teaching (${academicYearStart}–${academicYearStart + 1})`
}

export type PreparedTeachingPeriods = {
  displayLabels: string[]
  quickGroups: CourseTeachingPeriodGroup[]
}

export function prepareTeachingPeriodsForTimeline(
  course: Course | undefined,
  periodIndex: StudyPeriodIndex | null,
  todayIso: string
): PreparedTeachingPeriods {
  if (!course) {
    return { displayLabels: [], quickGroups: [] }
  }
  if (isCourseValidityEnded(course.validityEnd, todayIso)) {
    return { displayLabels: [], quickGroups: [] }
  }

  let groups = [...(course.teachingPeriodGroups ?? [])]
  if (periodIndex) {
    groups = expandSummerGroupsByGridYear(groups, periodIndex)
  }
  groups = groups.filter((g) => !isGroupPast(periodIndex, g, todayIso))
  groups.sort(compareGroups)

  const noTeachingYears = (course.teachingPeriodNoTeachingYears ?? [])
    .map((n) => n.academicYearStart)
    .filter((y0) => !isAcademicYearFullyPast(y0, todayIso))
    .sort((a, b) => a - b)

  const scheduleLabels = groups.map((g) => formatTeachingPeriodGroup(g))
  const noTeachingLabels = noTeachingYears.map((y0) => formatNoTeachingYearLabel(y0))

  return {
    displayLabels: [...scheduleLabels, ...noTeachingLabels],
    quickGroups: groups,
  }
}
