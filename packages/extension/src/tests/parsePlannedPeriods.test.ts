/** @jest-environment node */

import fs from 'fs'
import path from 'path'
import type { ParsedPlannedPeriod, Season, YearSeason } from '../utils/parsePlannedPeriods'
import {
  buildTimelineCards,
  comparePeriodKeysChronological,
  computeTimelineRange,
  formatPlannedPeriodForSlot,
  getCurrentAcademicSeason,
  getCurrentSeasonStartKey,
  iterateYearSeasonSlots,
  makePeriodKey,
  PERIODS_FOR_SEASON,
  parseCourseUnitPlannedPeriods,
  parsePeriodKey,
  parsePlannedPeriods,
  yearSeasonFromKey,
} from '../utils/parsePlannedPeriods'
import { createPeriodIndex } from '../utils/studyYearPeriods'
import type { SisuStudyYear } from '../utils/types'

const dataDir = path.join(__dirname, 'data')
const TEST_ORG = 'aalto-university-root-id'

function loadStudyYears(): SisuStudyYear[] {
  return loadJson<SisuStudyYear[]>('studyYears.json')
}

function periodIndex(showSummer = true) {
  return createPeriodIndex(loadStudyYears(), TEST_ORG, showSummer)
}

function loadJson<T>(file: string): T {
  const raw = fs.readFileSync(path.join(dataDir, file), 'utf8').replace(/^\uFEFF/, '')
  return JSON.parse(raw) as T
}

/** Strip BOM / zero-width space and trim, matching real export quirks in nameToId.csv */
function normalizeCsvField(s: string): string {
  return s
    .replace(/^\uFEFF+/, '')
    .replace(/\u200B/g, '')
    .trim()
}

function loadNameToId(): { id: string; name: string }[] {
  const raw = fs.readFileSync(path.join(dataDir, 'nameToId.csv'), 'utf8')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
  return lines.map((line) => {
    const comma = line.indexOf(',')
    const id = normalizeCsvField(line.slice(0, comma))
    const name = normalizeCsvField(line.slice(comma + 1))
    return { id, name }
  })
}

type SelectionRow = { courseUnitId: string; plannedPeriods: string[] }

function loadSelections(): SelectionRow[] {
  const doc = loadJson<{ courseUnitSelections: SelectionRow[] }>('courseUnitSelections.json')
  return doc.courseUnitSelections
}

function loadExpectedLabels(): Record<string, string> {
  return loadJson<Record<string, string>>('courseNamesToRightPeriods.json')
}

function formatParsedPeriod(p: ParsedPlannedPeriod): string {
  return `${p.year} ${p.season} ${p.period}`
}

function seasonStartKey(ys: YearSeason): string {
  return makePeriodKey(ys.year, ys.season, 0)
}

function formatJoinedFromPlannedStrings(courseUnitId: string, periods: string[], idx: ReturnType<typeof periodIndex>): string {
  const parsed = parseCourseUnitPlannedPeriods(courseUnitId, periods, idx).filter(
    (p): p is ParsedPlannedPeriod => p !== null
  )
  parsed.sort((a, b) => comparePeriodKeysChronological(a.key, b.key))
  return parsed.map(formatParsedPeriod).join(', ')
}

function distinctPlannedPeriodStrings(selections: SelectionRow[]): string[] {
  const set = new Set<string>()
  for (const s of selections) {
    for (const p of s.plannedPeriods) {
      set.add(p)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

describe('makePeriodKey / parsePeriodKey / yearSeasonFromKey', () => {
  const cases: { year: number; season: Season; periodIndex: number }[] = [
    { year: 2025, season: 'Spring', periodIndex: 0 },
    { year: 2025, season: 'Spring', periodIndex: 2 },
    { year: 2025, season: 'Summer', periodIndex: 0 },
    { year: 2025, season: 'Fall', periodIndex: 0 },
    { year: 2025, season: 'Fall', periodIndex: 1 },
    { year: 2030, season: 'Fall', periodIndex: 0 },
  ]

  it.each(cases)('round-trips %#', ({ year, season, periodIndex }) => {
    const key = makePeriodKey(year, season, periodIndex)
    expect(parsePeriodKey(key)).toEqual({ year, season, periodIndex })
    expect(yearSeasonFromKey(key)).toEqual({ year, season })
  })

  it('normalizes legacy Spring index 3 keys to Summer', () => {
    expect(parsePeriodKey('2025-0-03')).toEqual({
      year: 2025,
      season: 'Summer',
      periodIndex: 0,
    })
    expect(yearSeasonFromKey('2025-0-03')).toEqual({ year: 2025, season: 'Summer' })
  })

  it('throws on invalid key', () => {
    expect(() => parsePeriodKey('bad')).toThrow(/Invalid period key/)
    expect(() => parsePeriodKey('2025-0')).toThrow(/Invalid period key/)
  })
})

describe('getCurrentAcademicSeason / getCurrentSeasonStartKey', () => {
  it.each([
    [new Date('2026-01-15T12:00:00Z'), { year: 2026, season: 'Spring' as const }],
    [new Date('2026-07-31T12:00:00Z'), { year: 2026, season: 'Spring' as const }],
    [new Date('2026-08-01T12:00:00Z'), { year: 2026, season: 'Fall' as const }],
    [new Date('2026-12-20T12:00:00Z'), { year: 2026, season: 'Fall' as const }],
  ])('getCurrentAcademicSeason(%s) → %j', (d, expected) => {
    expect(getCurrentAcademicSeason(d)).toEqual(expected)
  })

  it('getCurrentSeasonStartKey matches first period slot', () => {
    const d = new Date('2026-03-01T12:00:00Z')
    expect(getCurrentSeasonStartKey(d)).toBe(makePeriodKey(2026, 'Spring', 0))
  })
})

describe('parsePlannedPeriods', () => {
  const idx = periodIndex(true)
  const selections = loadSelections()
  const distinct = distinctPlannedPeriodStrings(selections)

  it.each(distinct)('parses fixture string %#', (s) => {
    const p = parsePlannedPeriods(s, undefined, idx)
    expect(p).not.toBeNull()
    const fromKey = parsePeriodKey(p!.key)
    expect(fromKey.year).toBe(p!.year)
    expect(fromKey.season).toBe(p!.season)
    expect(makePeriodKey(fromKey.year, fromKey.season, fromKey.periodIndex)).toBe(p!.key)
  })

  it('returns null for empty / invalid input', () => {
    expect(parsePlannedPeriods(undefined, undefined, idx)).toBeNull()
    expect(parsePlannedPeriods('', undefined, idx)).toBeNull()
    expect(parsePlannedPeriods('aalto/2025/2/0', undefined, idx)).toBeNull()
    expect(parsePlannedPeriods('aalto-university-root-id/2025/0/0', undefined, idx)).toMatchObject({
      season: 'Summer',
      period: 'Summer',
      year: 2025,
    })
    expect(parsePlannedPeriods('aalto/2025/1/9', undefined, idx)).toBeNull()
    expect(parsePlannedPeriods('short', undefined, idx)).toBeNull()
    expect(parsePlannedPeriods('aalto-university-root-id/2025/0/1', undefined, null)).toBeNull()
  })

  it('normalizes locator segments for lookup', () => {
    const spaced = parsePlannedPeriods('aalto-university-root-id/ 2025 / 0 / 1 ', undefined, idx)
    const compact = parsePlannedPeriods('aalto-university-root-id/2025/0/1', undefined, idx)
    expect(spaced).toMatchObject({
      year: 2025,
      season: 'Fall',
      period: 'I',
      key: '2025-1-00',
    })
    expect(compact).toEqual(spaced)
    expect(spaced?.plannedPeriod).toBe('aalto-university-root-id/2025/0/1')
  })

  it('matches study-years-backed expectations', () => {
    expect(parsePlannedPeriods('aalto-university-root-id/2025/0/1', undefined, idx)).toMatchObject({
      year: 2025,
      season: 'Fall',
      period: 'I',
      key: '2025-1-00',
      plannedPeriod: 'aalto-university-root-id/2025/0/1',
    })
    expect(
      parsePlannedPeriods('aalto-university-root-id/2025/0/1', 'aalto-CU-1150973104-20240801', idx)
    ).toMatchObject({
      year: 2025,
      season: 'Fall',
      period: 'I',
      key: '2025-1-00',
      plannedPeriod: 'aalto-university-root-id/2025/0/1',
    })
    expect(parsePlannedPeriods('aalto-university-root-id/2025/0/2', undefined, idx)).toMatchObject({
      period: 'II',
      key: '2025-1-01',
      plannedPeriod: 'aalto-university-root-id/2025/0/2',
    })
    expect(parsePlannedPeriods('aalto-university-root-id/2026/1/0', undefined, idx)).toMatchObject({
      year: 2027,
      season: 'Spring',
      period: 'III',
      key: '2027-0-00',
      plannedPeriod: 'aalto-university-root-id/2026/1/0',
    })
    expect(parsePlannedPeriods('aalto-university-root-id/2025/1/3', undefined, idx)).toMatchObject({
      season: 'Summer',
      period: 'Summer',
      key: '2026-2-00',
      plannedPeriod: 'aalto-university-root-id/2025/1/3',
    })
  })
})

describe('formatPlannedPeriodForSlot', () => {
  const root = 'aalto-university-root-id'
  const idx = periodIndex(true)

  it.each([
    [2025, 'Fall' as const, 'I', 'aalto-university-root-id/2025/0/1'],
    [2025, 'Fall' as const, 'II', 'aalto-university-root-id/2025/0/2'],
    [2027, 'Spring' as const, 'III', 'aalto-university-root-id/2026/1/0'],
    [2027, 'Spring' as const, 'IV', 'aalto-university-root-id/2026/1/1'],
    [2027, 'Spring' as const, 'V', 'aalto-university-root-id/2026/1/2'],
    [2026, 'Summer' as const, 'Summer', 'aalto-university-root-id/2025/1/3'],
  ])('round-trips %# (%s %s %s)', (timelineYear, season, periodLabel, expectedPath) => {
    const formatted = formatPlannedPeriodForSlot(root, timelineYear, season, periodLabel, idx)
    expect(formatted).toBe(expectedPath)
    const parsed = parsePlannedPeriods(formatted, undefined, idx)
    expect(parsed).not.toBeNull()
    const pi = PERIODS_FOR_SEASON[season].indexOf(periodLabel)
    expect(parsed).toMatchObject({
      year: timelineYear,
      season,
      period: periodLabel,
      key: makePeriodKey(timelineYear, season, pi),
    })
  })

  it('throws for unknown slot', () => {
    expect(() => formatPlannedPeriodForSlot(root, 2099, 'Fall', 'I', idx)).toThrow(/Unknown slot/)
  })
})

describe('iterateYearSeasonSlots', () => {
  it('returns one slot when start equals end', () => {
    const start: YearSeason = { year: 2026, season: 'Spring' }
    expect(iterateYearSeasonSlots(start, start)).toEqual([start])
  })

  it('walks Spring→Fall→Spring across years', () => {
    const start: YearSeason = { year: 2025, season: 'Fall' }
    const end: YearSeason = { year: 2026, season: 'Spring' }
    expect(iterateYearSeasonSlots(start, end)).toEqual([
      { year: 2025, season: 'Fall' },
      { year: 2026, season: 'Spring' },
    ])
  })

  it('inserts Summer between Spring and Fall in the same calendar year', () => {
    const start: YearSeason = { year: 2026, season: 'Spring' }
    const end: YearSeason = { year: 2026, season: 'Fall' }
    expect(iterateYearSeasonSlots(start, end)).toEqual([
      { year: 2026, season: 'Spring' },
      { year: 2026, season: 'Summer' },
      { year: 2026, season: 'Fall' },
    ])
  })
})

describe('computeTimelineRange', () => {
  const spring2026 = new Date('2026-04-04T12:00:00Z')
  const idx = periodIndex(true)

  it('empty selections starts at current season and extends for three calendar years', () => {
    const { start, end } = computeTimelineRange([], spring2026)
    expect(start).toEqual({ year: 2026, season: 'Spring' })
    expect(end).toEqual({ year: 2028, season: 'Spring' })
  })

  it('when all planned keys are before now, end is not left before start (regression)', () => {
    const onlyPast = [
      {
        parsedPlannedPeriods: [parsePlannedPeriods('aalto-university-root-id/2025/0/1', undefined, idx)],
      },
    ]
    const { start, end } = computeTimelineRange(onlyPast, spring2026)
    expect(start).toEqual({ year: 2026, season: 'Spring' })
    expect(
      comparePeriodKeysChronological(seasonStartKey(start), seasonStartKey(end))
    ).toBeLessThanOrEqual(0)
    const slots = iterateYearSeasonSlots(start, end)
    expect(slots.length).toBeGreaterThan(0)
    expect(end).toEqual({ year: 2028, season: 'Spring' })
  })

  it('uses data min when it is not before current season start', () => {
    const futureHeavy = [
      {
        parsedPlannedPeriods: [
          parsePlannedPeriods('aalto-university-root-id/2026/1/0', 'x', idx),
          parsePlannedPeriods('aalto-university-root-id/2026/1/1', 'x', idx),
        ],
      },
    ]
    const { start } = computeTimelineRange(futureHeavy, spring2026)
    expect(start).toEqual({ year: 2027, season: 'Spring' })
  })
})

describe('buildTimelineCards', () => {
  const spring2026 = new Date('2026-04-04T12:00:00Z')
  const root = 'aalto-university-root-id'
  const idx = periodIndex(true)
  const idxNoSummer = periodIndex(false)

  it('places each course in cells for its parsed keys and sorts names case-insensitively', () => {
    const rows = loadSelections()
    const nameById = new Map(loadNameToId().map((r) => [r.id, r.name]))
    const selections = rows.map((r) => ({
      id: r.courseUnitId,
      name: nameById.get(r.courseUnitId) ?? r.courseUnitId,
      parsedPlannedPeriods: parseCourseUnitPlannedPeriods(r.courseUnitId, r.plannedPeriods, idx),
    }))

    const { start, end } = computeTimelineRange(
      selections.map((s) => ({ parsedPlannedPeriods: s.parsedPlannedPeriods })),
      spring2026
    )
    const visibleSlots = iterateYearSeasonSlots(start, end).filter(
      (s) => idx.periodsByCard.has(`${s.year}|${s.season}`)
    )

    const cards = buildTimelineCards(selections, spring2026, { periodIndex: idx })
    expect(cards.length).toBe(visibleSlots.length)

    for (const sel of selections) {
      for (const p of sel.parsedPlannedPeriods) {
        if (!p) continue
        const slotKey = `${p.year}-${p.season}`
        if (!visibleSlots.some((s) => `${s.year}-${s.season}` === slotKey)) {
          continue
        }
        const card = cards.find((c) => c.year === p.year && c.season === p.season)
        expect(card).toBeDefined()
        const row = card!.periods.find((r) => r.period === p.period)
        expect(row?.selections.map((s) => s.id)).toContain(sel.id)
      }
    }

    for (const card of cards) {
      for (const row of card.periods) {
        const names = row.selections.map((s) => s.name)
        const sorted = [...names].sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: 'base' })
        )
        expect(names).toEqual(sorted)
      }
    }

    const emptyCells = cards.flatMap((card) =>
      card.periods
        .filter((row) => row.selections.length === 0)
        .map((row) => ({ card, row }))
    )
    for (const { card, row } of emptyCells) {
      expect(row.plannedPeriod).toBe(
        formatPlannedPeriodForSlot(root, card.year, card.season, row.period, idx)
      )
    }

    const filledPeriodRows = cards.flatMap((c) =>
      c.periods
        .filter((r) => r.selections.length > 0)
        .map((row) => ({ card: c, row }))
    )
    for (const { card, row } of filledPeriodRows) {
      expect(row.plannedPeriod.length).toBeGreaterThan(0)
      const first = row.selections[0]
      const firstParsed = first.parsedPlannedPeriods.find(
        (pp) =>
          pp !== null &&
          pp.year === card.year &&
          pp.season === card.season &&
          pp.period === row.period
      )
      expect(firstParsed?.plannedPeriod).toBe(row.plannedPeriod)
    }
  })

  it('omits summer semester cards when showSummer is false', () => {
    const selections = [
      {
        id: 'a',
        name: 'Summer course',
        parsedPlannedPeriods: parseCourseUnitPlannedPeriods(
          'x',
          ['aalto-university-root-id/2025/1/3'],
          idxNoSummer
        ),
      },
    ]
    const cards = buildTimelineCards(selections, spring2026, {
      showSummer: false,
      periodIndex: idxNoSummer,
    })
    expect(cards.some((c) => c.season === 'Summer')).toBe(false)
  })
})

describe('golden: courseNamesToRightPeriods matches selections', () => {
  const expected = loadExpectedLabels()
  const rows = loadSelections()
  const idx = periodIndex(true)

  it.each(loadNameToId())('$name', ({ id, name }) => {
    const row = rows.find((r) => r.courseUnitId === id)
    expect(row).toBeDefined()
    expect(expected).toHaveProperty(name)
    const got = formatJoinedFromPlannedStrings(id, row!.plannedPeriods, idx)
    expect(got).toBe(expected[name])
  })
})
