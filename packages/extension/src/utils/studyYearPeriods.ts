import type { SisuStudyPeriod, SisuStudyTerm, SisuStudyYear } from './types'
import {
  comparePeriodKeysChronological,
  makePeriodKey,
  normalizeStudyLocator,
  PERIODS_FOR_SEASON,
  type ParsedPlannedPeriod,
  type Season,
  type StudyPeriodIndex,
} from './parsePlannedPeriods'

function cardKey(year: number, season: Season): string {
  return `${year}|${season}`
}

function termKind(term: SisuStudyTerm): 'autumn' | 'spring' | null {
  const e = term.name.en?.toLowerCase()
  if (e === 'autumn' || e === 'fall') {
    return 'autumn'
  }
  if (e === 'spring') {
    return 'spring'
  }
  const f = term.name.fi?.toLowerCase()
  if (f === 'syksy') {
    return 'autumn'
  }
  if (f === 'kevät' || f === 'kevat') {
    return 'spring'
  }
  return null
}

/** Roman / Summer label from study-years `name` fields only. */
export function periodLabelFromApi(sp: SisuStudyPeriod): string | null {
  const fi = sp.name.fi?.trim()
  const en = sp.name.en?.trim()
  const t = fi || en || ''
  if (['I', 'II', 'III', 'IV', 'V'].includes(t)) {
    return t
  }
  if (t === 'Kesä' || en === 'Summer') {
    return 'Summer'
  }
  return null
}

/**
 * Map study term + label to timeline card (year + season) using academic-year rules from the API tree.
 */
function timelinePlacement(
  sy: SisuStudyYear,
  kind: 'autumn' | 'spring',
  label: string
): { year: number; season: Season } | null {
  if (kind === 'autumn') {
    if (label === 'I' || label === 'II') {
      return { year: sy.startYear, season: 'Fall' }
    }
    if (label === 'Summer') {
      return { year: sy.startYear, season: 'Summer' }
    }
  }
  if (kind === 'spring') {
    const y = sy.startYear + 1
    if (label === 'III' || label === 'IV' || label === 'V') {
      return { year: y, season: 'Spring' }
    }
    if (label === 'Summer') {
      return { year: y, season: 'Summer' }
    }
  }
  return null
}

function includePeriodInGrid(sp: SisuStudyPeriod, label: string, showSummer: boolean): boolean {
  if (label === 'Summer') {
    return showSummer
  }
  return sp.visibleByDefault
}

function parsedFromApi(
  loc: string,
  place: { year: number; season: Season },
  label: string
): ParsedPlannedPeriod | null {
  const periods = PERIODS_FOR_SEASON[place.season] as readonly string[]
  const periodIndex = periods.indexOf(label)
  if (periodIndex < 0) {
    return null
  }
  const key = makePeriodKey(place.year, place.season, periodIndex)
  return {
    year: place.year,
    season: place.season,
    period: label,
    key,
    plannedPeriod: loc,
  }
}

/** ISO date YYYY-MM-DD inclusive. */
function dayInRange(day: string, start: string, end: string): boolean {
  return day >= start && day <= end
}

export function createPeriodIndex(
  studyYears: SisuStudyYear[],
  org: string,
  showSummer: boolean
): StudyPeriodIndex {
  const byLocator = new Map<string, ParsedPlannedPeriod>()
  const intervals: StudyPeriodIndex['intervals'] = []
  const cardBuckets = new Map<string, { label: string; periodKey: string; locator: string; sortKey: string }[]>()

  for (const sy of studyYears) {
    if (sy.org !== org) {
      continue
    }
    for (const term of sy.studyTerms) {
      const kind = termKind(term)
      if (!kind) {
        continue
      }
      for (const sp of term.studyPeriods) {
        const label = periodLabelFromApi(sp)
        if (!label) {
          continue
        }
        const place = timelinePlacement(sy, kind, label)
        if (!place) {
          continue
        }
        const normLoc = normalizeStudyLocator(sp.locator)
        const parsed = parsedFromApi(normLoc, place, label)
        if (!parsed) {
          continue
        }
        byLocator.set(normLoc, parsed)
        intervals.push({
          startDay: sp.valid.startDate,
          endDay: sp.valid.endDate,
          parsed: { ...parsed, plannedPeriod: normLoc },
        })
        if (!includePeriodInGrid(sp, label, showSummer)) {
          continue
        }
        const ck = cardKey(place.year, place.season)
        const list = cardBuckets.get(ck) ?? []
        list.push({
          label,
          periodKey: parsed.key,
          locator: normLoc,
          sortKey: sp.valid.startDate,
        })
        cardBuckets.set(ck, list)
      }
    }
  }

  const periodsByCard = new Map<string, { label: string; periodKey: string; locator: string }[]>()
  for (const [ck, list] of cardBuckets) {
    list.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    const seen = new Set<string>()
    const deduped: { label: string; periodKey: string; locator: string }[] = []
    for (const row of list) {
      if (seen.has(row.periodKey)) {
        continue
      }
      seen.add(row.periodKey)
      deduped.push({ label: row.label, periodKey: row.periodKey, locator: row.locator })
    }
    deduped.sort((a, b) => comparePeriodKeysChronological(a.periodKey, b.periodKey))
    periodsByCard.set(ck, deduped)
  }

  return { byLocator, intervals, periodsByCard, locatorLookupOrgRoot: org }
}

export function findPeriodByDate(index: StudyPeriodIndex, isoDate: string): ParsedPlannedPeriod | null {
  for (const iv of index.intervals) {
    if (dayInRange(isoDate, iv.startDay, iv.endDay)) {
      return iv.parsed
    }
  }
  return null
}
