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

export interface StudyPeriodIndex {
  byLocator: Map<string, ParsedPlannedPeriod>
  intervals: Array<{ startDay: string; endDay: string; parsed: ParsedPlannedPeriod }>
  /** key `${timelineYear}|${season}` → columns left-to-right */
  periodsByCard: Map<string, { label: string; periodKey: string; locator: string }[]>
  /**
   * Organisation id used in kori study-year locators (e.g. `aalto-university-root-id`).
   * My-plans locators may use a programme root; lookups rewrite the first path segment to this.
   */
  locatorLookupOrgRoot: string
}

/** Replace the first locator segment with `organisationRoot` (same year/term/period tail). */
function rewriteLocatorOrganisationRoot(
  locator: string,
  organisationRoot: string
): string | null {
  const parts = normalizeStudyLocator(locator).split('/').filter(Boolean)
  if (parts.length < 2) {
    return null
  }
  return [organisationRoot, ...parts.slice(1)].join('/')
}

export function lookupParsedPlannedPeriod(
  index: StudyPeriodIndex,
  plannedPeriod: string
): ParsedPlannedPeriod | null {
  const norm = normalizeStudyLocator(plannedPeriod)
  const direct = index.byLocator.get(norm)
  if (direct) {
    return direct
  }
  const rewritten = rewriteLocatorOrganisationRoot(norm, index.locatorLookupOrgRoot)
  if (!rewritten) {
    return null
  }
  return index.byLocator.get(rewritten) ?? null
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
  if (season === 'Spring' && periodIndex === 3) {
    return { year, season: 'Summer', periodIndex: 0 }
  }
  return { year, season, periodIndex }
}

export function yearSeasonFromKey(key: string): YearSeason {
  const p = parsePeriodKey(key)
  return { year: p.year, season: p.season }
}

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

/** Normalize Sisu locator strings for map lookup (trim each path segment). */
export function normalizeStudyLocator(loc: string): string {
  return loc
    .trim()
    .split('/')
    .map((s) => s.trim())
    .join('/')
}

/**
 * Resolve a planned-period locator using only {@link StudyPeriodIndex} from study-years data.
 */
export function parsePlannedPeriods(
  plannedPeriod: string | undefined,
  _courseUnitId?: string,
  index?: StudyPeriodIndex | null
): ParsedPlannedPeriod | null {
  if (!plannedPeriod || !index) {
    return null
  }
  return lookupParsedPlannedPeriod(index, plannedPeriod)
}

/**
 * Locator for an empty grid cell; requires study-years index (no path-string synthesis).
 */
export function formatPlannedPeriodForSlot(
  _rootId: string,
  timelineYear: number,
  season: Season,
  periodLabel: string,
  index: StudyPeriodIndex
): string {
  const hit = index.periodsByCard
    .get(`${timelineYear}|${season}`)
    ?.find((c) => c.label === periodLabel)
  if (!hit) {
    throw new Error(`Unknown slot ${timelineYear} ${season} ${periodLabel}`)
  }
  return hit.locator
}

export function parseCourseUnitPlannedPeriods(
  courseUnitId: string,
  plannedPeriods: string[],
  index?: StudyPeriodIndex | null
): (ParsedPlannedPeriod | null)[] {
  return plannedPeriods.map((p) => parsePlannedPeriods(p, courseUnitId, index))
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

export type ComputeTimelineRangeOptions = {
  /**
   * When true (default), the range begins at the earliest course or attainment period.
   * When false, the range does not start before the current academic season (e.g. Spring 2026).
   */
  showPastPeriods?: boolean
}

export function computeTimelineRange(
  selections: { parsedPlannedPeriods: (ParsedPlannedPeriod | null)[] }[],
  now: Date = new Date(),
  options?: ComputeTimelineRangeOptions
): { start: YearSeason; end: YearSeason } {
  const showPast = options?.showPastPeriods !== false
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
    rangeStartKey = showPast
      ? dataMinKey
      : comparePeriodKeysChronological(dataMinKey, nowStartKey) < 0
        ? nowStartKey
        : dataMinKey
    // Extend through at least the current season when all data lies in the past.
    rangeEndKey =
      comparePeriodKeysChronological(dataMaxKey, nowStartKey) < 0 ? nowStartKey : dataMaxKey
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

/**
 * Credits shown in one timeline cell when a selection spans multiple planned periods
 * (planned credits split evenly across non-null slices).
 */
export function plannedCreditsPerTimelineSlice<T extends { plannedCredits: number; parsedPlannedPeriods: unknown[] }>(
  selection: T
): number {
  return selection.plannedCredits / Math.max(1, selection.parsedPlannedPeriods.filter(Boolean).length)
}

/** One rendered course block in a semester row (may span multiple period columns). */
export type SemesterCoursePlacement<T = { id: string; name: string }> = {
  selection: T
  /** 0-based column index into `card.periods`. */
  startCol: number
  span: number
  /** First column in the run; used for drag/move source resolution. */
  anchorPlannedPeriod: string
  anchorPeriodKey: string
  /** Distinct runs when the same course appears in non-adjacent periods. */
  runIndex: number
}

function contiguousColumnRuns(sortedIndices: number[]): number[][] {
  if (sortedIndices.length === 0) {
    return []
  }
  const runs: number[][] = []
  let cur = [sortedIndices[0]!]
  for (let i = 1; i < sortedIndices.length; i++) {
    const v = sortedIndices[i]!
    if (v === cur[cur.length - 1]! + 1) {
      cur.push(v)
    } else {
      runs.push(cur)
      cur = [v]
    }
  }
  runs.push(cur)
  return runs
}

/**
 * Deduplicates multi-period courses into contiguous column spans for a single semester card.
 * Data from {@link buildTimelineCards} may still list the same selection in multiple period cells.
 */
export function computeSemesterCoursePlacements<T extends { id: string; name: string }>(
  card: TimelineCard<T>,
  sisuRootId: string,
  periodIndex: StudyPeriodIndex | null
): SemesterCoursePlacement<T>[] {
  const byId = new Map<string, T>()
  for (const p of card.periods) {
    for (const s of p.selections) {
      if (!byId.has(s.id)) {
        byId.set(s.id, s)
      }
    }
  }

  const resolvePlannedPeriod = (col: number): string => {
    const period = card.periods[col]!
    return (
      period.plannedPeriod ||
      (periodIndex
        ? formatPlannedPeriodForSlot(sisuRootId, card.year, card.season, period.period, periodIndex)
        : '')
    )
  }

  const placements: SemesterCoursePlacement<T>[] = []

  for (const sel of byId.values()) {
    const colIndices: number[] = []
    for (let i = 0; i < card.periods.length; i++) {
      if (card.periods[i]!.selections.some((s) => s.id === sel.id)) {
        colIndices.push(i)
      }
    }
    const runs = contiguousColumnRuns(colIndices)
    runs.forEach((run, runIdx) => {
      const start = run[0]!
      placements.push({
        selection: sel,
        startCol: start,
        span: run.length,
        anchorPlannedPeriod: resolvePlannedPeriod(start),
        anchorPeriodKey: card.periods[start]!.periodKey,
        runIndex: runIdx,
      })
    })
  }

  placements.sort((a, b) => {
    if (a.startCol !== b.startCol) {
      return a.startCol - b.startCol
    }
    return a.selection.name.localeCompare(b.selection.name, undefined, { sensitivity: 'base' })
  })

  return placements
}

export type BuildTimelineCardsOptions = {
  showSummer?: boolean
  /** From kori study-years; missing or empty → no cards. */
  periodIndex?: StudyPeriodIndex | null
  /** Passed to {@link computeTimelineRange}; default true (show history). */
  showPastPeriods?: boolean
}

function mergeCellSelections<T extends { id: string; completed?: boolean }>(items: T[]): T[] {
  const byId = new Map<string, T>()
  for (const it of items) {
    const cur = byId.get(it.id)
    if (!cur) {
      byId.set(it.id, it)
    } else if (it.completed && !cur.completed) {
      byId.set(it.id, it)
    }
  }
  return [...byId.values()]
}

export function buildTimelineCards<
  T extends { id: string; name: string; parsedPlannedPeriods: (ParsedPlannedPeriod | null)[] },
>(selections: T[], now: Date = new Date(), options?: BuildTimelineCardsOptions): TimelineCard<T>[] {
  const { start, end } = computeTimelineRange(selections, now, {
    showPastPeriods: options?.showPastPeriods,
  })
  const slots = iterateYearSeasonSlots(start, end)
  const showSummer = options?.showSummer !== false
  const visibleSlots = showSummer ? slots : slots.filter((slot) => slot.season !== 'Summer')
  const index = options?.periodIndex
  if (!index || index.periodsByCard.size === 0) {
    return []
  }

  return visibleSlots
    .map((slot) => {
      const ck = `${slot.year}|${slot.season}`
      const indexedCols = index.periodsByCard.get(ck)
      if (!indexedCols?.length) {
        return null
      }
      const columnDefs = indexedCols.map((c) => ({
        label: c.label,
        periodKey: c.periodKey,
        plannedPeriod: c.locator,
      }))

      const periods: TimelinePeriod<T>[] = columnDefs.map((col) => {
        const raw: T[] = []
        const seen = new Set<string>()
        for (const sel of selections) {
          const match = sel.parsedPlannedPeriods.some(
            (p) =>
              p !== null &&
              p.year === slot.year &&
              p.season === slot.season &&
              p.period === col.label
          )
          if (match && !seen.has(sel.id)) {
            seen.add(sel.id)
            raw.push(sel)
          }
        }
        const inCell = mergeCellSelections(raw)
        inCell.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
        const firstMatch = inCell[0]?.parsedPlannedPeriods.find(
          (pp) =>
            pp !== null &&
            pp.year === slot.year &&
            pp.season === slot.season &&
            pp.period === col.label
        )
        return {
          period: col.label,
          periodKey: col.periodKey,
          selections: inCell,
          plannedPeriod: firstMatch?.plannedPeriod ?? col.plannedPeriod,
        }
      })

      return {
        year: slot.year,
        season: slot.season,
        cardKey: yearSeasonSortKey(slot),
        periods,
      }
    })
    .filter((c): c is TimelineCard<T> => c !== null)
}
