export type Season = 'Spring' | 'Summer' | 'Fall'

export type YearSeason = { year: number; season: Season }

/** Chronological period labels within each season (Sisu / Finnish-style ordering). */
export const PERIODS_FOR_SEASON: Record<Season, readonly string[]> = {
  Fall: ['I', 'II'],
  Spring: ['III', 'IV', 'V'],
  Summer: ['Summer'],
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
  /** Original Sisu `plannedPeriods` entry (full path string as received). */
  plannedPeriod: string
}

/**
 * Period keys: Spring = 0, Fall = 1, Summer = 2 (middle segment).
 * Legacy keys used `Spring` index 3 for summer; `parsePeriodKey` normalizes those to Summer.
 */
export function makePeriodKey(year: number, season: Season, periodIndex: number): string {
  const s = season === 'Fall' ? 1 : season === 'Summer' ? 2 : 0
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
  let season: Season
  if (s === 1) {
    season = 'Fall'
  } else if (s === 2) {
    season = 'Summer'
  } else {
    season = 'Spring'
  }
  // Pre–Summer-season encoding: fourth Spring slot was summer
  if (season === 'Spring' && periodIndex === 3) {
    return { year, season: 'Summer', periodIndex: 0 }
  }
  return { year, season, periodIndex }
}

export function yearSeasonFromKey(key: string): YearSeason {
  const p = parsePeriodKey(key)
  return { year: p.year, season: p.season }
}

/**
 * Raw period keys are not chronologically ordered lexically (e.g. Fall uses `…-1-…` but Summer uses `…-2-…`).
 * Use this for min/max over keys and any stable chronological ordering.
 */
export function comparePeriodKeysChronological(a: string, b: string): number {
  const pa = parsePeriodKey(a)
  const pb = parsePeriodKey(b)
  if (pa.year !== pb.year) {
    return pa.year - pb.year
  }
  const ta = seasonTier(pa.season)
  const tb = seasonTier(pb.season)
  if (ta !== tb) {
    return ta - tb
  }
  return pa.periodIndex - pb.periodIndex
}

function seasonTier(season: Season): number {
  if (season === 'Spring') {
    return 0
  }
  if (season === 'Summer') {
    return 1
  }
  return 2
}

/** Spring Y → Summer Y → Fall Y → Spring Y+1 (calendar-year order). */
function yearSeasonSortKey(ys: YearSeason): string {
  return `${ys.year}-${seasonTier(ys.season)}`
}

function nextSeason(ys: YearSeason): YearSeason {
  if (ys.season === 'Spring') {
    return { year: ys.year, season: 'Summer' }
  }
  if (ys.season === 'Summer') {
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

  let timelineSeason: Season = season

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
    if (period === 'Summer') {
      timelineSeason = 'Summer'
    }
  } else {
    period = periodPart === '1' ? 'I' : periodPart === '2' ? 'II' : null
  }

  if (!period) {
    return null
  }

  const periods = PERIODS_FOR_SEASON[timelineSeason] as readonly string[]
  const periodIndex = periods.indexOf(period)
  if (periodIndex < 0) {
    return null
  }

  const timelineYear = season === 'Spring' ? pathYear + 1 : pathYear
  const key = makePeriodKey(timelineYear, timelineSeason, periodIndex)

  return { season: timelineSeason, year: timelineYear, period, key, plannedPeriod }
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
    allKeys.sort(comparePeriodKeysChronological)
    const dataMinKey = allKeys[0]
    const dataMaxKey = allKeys[allKeys.length - 1]
    rangeStartKey =
      comparePeriodKeysChronological(dataMinKey, nowStartKey) < 0 ? nowStartKey : dataMinKey
    rangeEndKey = dataMaxKey
  }

  if (comparePeriodKeysChronological(rangeEndKey, rangeStartKey) < 0) {
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
  /** Representative original `plannedPeriods` string for this slot (first in-cell selection). */
  plannedPeriod: string
  periodKey: string
  selections: T[]
}

export type TimelineCard<T = { id: string; name: string }> = {
  year: number
  season: Season
  cardKey: string
  periods: TimelinePeriod<T>[]
}

export type BuildTimelineCardsOptions = {
  /** When false, summer semester columns are omitted from the grid. Default true. */
  showSummer?: boolean
}

export function buildTimelineCards<
  T extends { id: string; name: string; parsedPlannedPeriods: (ParsedPlannedPeriod | null)[] },
>(
  selections: T[],
  now: Date = new Date(),
  options?: BuildTimelineCardsOptions
): TimelineCard<T>[] {
  const { start, end } = computeTimelineRange(selections, now)
  const slots = iterateYearSeasonSlots(start, end)
  const visibleSlots =
    options?.showSummer === false ? slots.filter((slot) => slot.season !== 'Summer') : slots

  return visibleSlots.map((slot) => {
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
        const firstMatch = inCell[0]?.parsedPlannedPeriods.find(
          (pp) =>
            pp !== null &&
            pp.year === slot.year &&
            pp.season === slot.season &&
            pp.period === periodLabel
        )
        return {
          period: periodLabel,
          periodKey,
          selections: inCell,
          plannedPeriod: firstMatch?.plannedPeriod ?? '',
        }
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
