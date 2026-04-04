export type Season = 'Spring' | 'Fall'

export type YearSeason = { year: number; season: Season }

/** Chronological period labels within each season (Sisu / Finnish-style ordering). */
export const PERIODS_FOR_SEASON: Record<Season, readonly string[]> = {
  Fall: ['I', 'II'],
  Spring: ['III', 'IV', 'V', 'Summer'],
}

/**
 * Parsed Sisu planned period. `year` is the calendar year of that semester on the timeline
 * (Fall uses the path year; Spring uses path year + 1 — Sisu paths anchor Spring to the
 * starting academic year).
 */
export type ParsedPlannedPeriod = {
  season: Season
  year: number
  period: string
  key: string
}

/** Spring before Fall in the same calendar year; periods ordered by index within the season. */
export function makePeriodKey(year: number, season: Season, periodIndex: number): string {
  const s = season === 'Fall' ? 1 : 0
  return `${year}-${s}-${String(periodIndex).padStart(2, '0')}`
}

export function parsePeriodKey(key: string): { year: number; season: Season; periodIndex: number } {
  const parts = key.split('-')
  if (parts.length !== 3) {
    throw new Error(`Invalid period key: ${key}`)
  }
  const year = Number(parts[0])
  const s = Number(parts[1])
  const periodIndex = Number(parts[2])
  const season: Season = s === 1 ? 'Fall' : 'Spring'
  return { year, season, periodIndex }
}

export function yearSeasonFromKey(key: string): YearSeason {
  const p = parsePeriodKey(key)
  return { year: p.year, season: p.season }
}

function seasonTier(season: Season): number {
  return season === 'Spring' ? 0 : 1
}

/** Spring Y, then Fall Y, then Spring Y+1, … */
function yearSeasonSortKey(ys: YearSeason): string {
  return `${ys.year}-${seasonTier(ys.season)}`
}

function nextSeason(ys: YearSeason): YearSeason {
  if (ys.season === 'Spring') {
    return { year: ys.year, season: 'Fall' }
  }
  return { year: ys.year + 1, season: 'Spring' }
}

/**
 * Counts distinct calendar year numbers that appear in any semester slot from start through end (inclusive).
 */
function distinctCalendarYearCount(start: YearSeason, end: YearSeason): number {
  const years = new Set<number>()
  let cur: YearSeason = start
  while (true) {
    years.add(cur.year)
    if (cur.year === end.year && cur.season === end.season) {
      break
    }
    cur = nextSeason(cur)
  }
  return years.size
}

/**
 * Aug–Dec: Fall of that calendar year. Jan–Jul: Spring of that calendar year.
 */
export function getCurrentAcademicSeason(now: Date = new Date()): YearSeason {
  const month = now.getMonth() + 1
  if (month >= 8) {
    return { year: now.getFullYear(), season: 'Fall' }
  }
  return { year: now.getFullYear(), season: 'Spring' }
}

export function getCurrentSeasonStartKey(now?: Date): string {
  const ys = getCurrentAcademicSeason(now)
  return makePeriodKey(ys.year, ys.season, 0)
}

/**
 * Parse a single Sisu `plannedPeriod` string. Pass `courseUnitId` from the selection when available
 * so unit-specific Sisu quirks match the study plan UI.
 */
export function parsePlannedPeriods(
  plannedPeriod: string | undefined,
  courseUnitId?: string
): ParsedPlannedPeriod | null {
  if (!plannedPeriod) {
    return null
  }

  const [, yearStringRaw, seasonPartRaw, periodPartRaw] = plannedPeriod.split('/')
  const yearString = yearStringRaw?.trim() ?? ''
  const seasonPart = seasonPartRaw?.trim() ?? ''
  const periodPart = periodPartRaw?.trim() ?? ''
  const pathYear = parseInt(yearString, 10)
  const season = seasonPart === '1' ? 'Spring' : seasonPart === '0' ? 'Fall' : null

  if (!season || isNaN(pathYear)) {
    return null
  }

  let period: string | null = null

  if (season === 'Spring') {
    period =
      periodPart === '0'
        ? 'III'
        : periodPart === '1'
          ? 'IV'
          : periodPart === '2'
            ? 'V'
            : periodPart === '3'
              ? 'Summer'
              : null
  } else {
    period = periodPart === '1' ? 'I' : periodPart === '2' ? 'II' : null
  }

  if (!period) {
    return null
  }

  const periods = PERIODS_FOR_SEASON[season] as readonly string[]
  const periodIndex = periods.indexOf(period)
  if (periodIndex < 0) {
    return null
  }

  const timelineYear = season === 'Spring' ? pathYear + 1 : pathYear
  const key = makePeriodKey(timelineYear, season, periodIndex)

  return { season, year: timelineYear, period, key }
}

export function parseCourseUnitPlannedPeriods(
  courseUnitId: string,
  plannedPeriods: string[]
): (ParsedPlannedPeriod | null)[] {
  return plannedPeriods.map((p) => parsePlannedPeriods(p, courseUnitId))
}

function collectAllPeriodKeys(
  selections: { parsedPlannedPeriods: (ParsedPlannedPeriod | null)[] }[]
): string[] {
  const keys: string[] = []
  for (const s of selections) {
    for (const p of s.parsedPlannedPeriods) {
      if (p) {
        keys.push(p.key)
      }
    }
  }
  return keys
}

/**
 * Range: earliest planned key → latest, clamped so we never start before the current academic season,
 * then extended forward until at least three distinct calendar years appear in the span.
 */
export function computeTimelineRange(
  selections: { parsedPlannedPeriods: (ParsedPlannedPeriod | null)[] }[],
  now: Date = new Date()
): { start: YearSeason; end: YearSeason } {
  const nowStartKey = getCurrentSeasonStartKey(now)
  const allKeys = collectAllPeriodKeys(selections)

  let rangeStartKey: string
  let rangeEndKey: string

  if (allKeys.length === 0) {
    rangeStartKey = nowStartKey
    rangeEndKey = nowStartKey
  } else {
    allKeys.sort((a, b) => a.localeCompare(b))
    const dataMinKey = allKeys[0]
    const dataMaxKey = allKeys[allKeys.length - 1]
    rangeStartKey = dataMinKey < nowStartKey ? nowStartKey : dataMinKey
    rangeEndKey = dataMaxKey
  }

  if (rangeEndKey.localeCompare(rangeStartKey) < 0) {
    rangeEndKey = rangeStartKey
  }

  let start = yearSeasonFromKey(rangeStartKey)
  let end = yearSeasonFromKey(rangeEndKey)

  while (distinctCalendarYearCount(start, end) < 3) {
    end = nextSeason(end)
  }

  return { start, end }
}

export function iterateYearSeasonSlots(start: YearSeason, end: YearSeason): YearSeason[] {
  const out: YearSeason[] = []
  let cur = start
  while (true) {
    out.push(cur)
    if (cur.year === end.year && cur.season === end.season) {
      break
    }
    cur = nextSeason(cur)
  }
  return out
}

export type TimelinePeriod<T = { id: string; name: string }> = {
  period: string
  periodKey: string
  selections: T[]
}

export type TimelineCard<T = { id: string; name: string }> = {
  year: number
  season: Season
  cardKey: string
  periods: TimelinePeriod<T>[]
}

export function buildTimelineCards<
  T extends { id: string; name: string; parsedPlannedPeriods: (ParsedPlannedPeriod | null)[] },
>(selections: T[], now: Date = new Date()): TimelineCard<T>[] {
  const { start, end } = computeTimelineRange(selections, now)
  const slots = iterateYearSeasonSlots(start, end)

  return slots.map((slot) => {
    const periods: TimelinePeriod<T>[] = PERIODS_FOR_SEASON[slot.season].map(
      (periodLabel, periodIndex) => {
        const periodKey = makePeriodKey(slot.year, slot.season, periodIndex)
        const inCell: T[] = []
        const seen = new Set<string>()
        for (const sel of selections) {
          const match = sel.parsedPlannedPeriods.some(
            (p) =>
              p !== null &&
              p.year === slot.year &&
              p.season === slot.season &&
              p.period === periodLabel
          )
          if (match && !seen.has(sel.id)) {
            seen.add(sel.id)
            inCell.push(sel)
          }
        }
        inCell.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
        return { period: periodLabel, periodKey, selections: inCell }
      }
    )
    return {
      year: slot.year,
      season: slot.season,
      cardKey: yearSeasonSortKey(slot),
      periods,
    }
  })
}
