import type {
  CourseTeachingPeriodGroup,
  CourseTeachingPeriodToken,
} from '@kurssikone/shared/src/types'
import { PERIODS_FOR_SEASON, type Season, type StudyPeriodIndex } from './parsePlannedPeriods'
import i18n from '../i18n'

function tSeason(season: string): string {
  return i18n.t(`extension.season${season}`)
}

const AUTUMN_TERMS = /^(autumn|fall|syksy|höst|host)$/i
const SPRING_TERMS = /^(spring|kevät|kevat)$/i
const SUMMER_TERMS = /^(summer|kesä|kesa)$/i

const ROMAN: CourseTeachingPeriodToken[] = ['I', 'II', 'III', 'IV', 'V']

/** Intermediate parse from one `YYYY–YYYY Season …` line (not stored on {@link Course}). */
export type ParsedKoriTeachingRange = {
  academicYearStart: number
  term: 'autumn' | 'spring' | 'summer'
  periodFrom: CourseTeachingPeriodToken
  periodTo: CourseTeachingPeriodToken
}

function tokenOrderInSeason(
  season: 'Fall' | 'Spring' | 'Summer',
  t: CourseTeachingPeriodToken
): number {
  if (t === 'Summer') {
    return 0
  }
  const periods = PERIODS_FOR_SEASON[
    season === 'Fall' ? 'Fall' : season === 'Spring' ? 'Spring' : 'Summer'
  ] as readonly string[]
  const idx = periods.indexOf(t)
  return idx >= 0 ? idx : -1
}

/**
 * One Kori line → one group (timeline year + inclusive period range).
 */
export function parsedRangeToGroup(o: ParsedKoriTeachingRange): CourseTeachingPeriodGroup | null {
  const y0 = o.academicYearStart

  if (o.term === 'summer') {
    return {
      timelineYear: y0 + 1,
      season: 'Summer',
      periodFrom: 'Summer',
      periodTo: 'Summer',
    }
  }

  if (o.term === 'spring' && o.periodTo === 'Summer' && o.periodFrom !== 'Summer') {
    return {
      timelineYear: y0 + 1,
      season: 'Spring',
      periodFrom: o.periodFrom,
      periodTo: 'Summer',
    }
  }

  const season: Season = o.term === 'autumn' ? 'Fall' : 'Spring'
  const timelineYear = o.term === 'autumn' ? y0 : y0 + 1
  return {
    timelineYear,
    season,
    periodFrom: o.periodFrom,
    periodTo: o.periodTo,
  }
}

export function groupKey(g: CourseTeachingPeriodGroup): string {
  return `${g.timelineYear}|${g.season}|${g.periodFrom}|${g.periodTo}`
}

export function formatTeachingPeriodGroup(g: CourseTeachingPeriodGroup): string {
  if (g.season === 'Summer' && g.periodFrom === 'Summer' && g.periodTo === 'Summer') {
    return `${g.timelineYear} ${tSeason('Summer')}`
  }
  if (g.season === 'Spring' && g.periodTo === 'Summer' && g.periodFrom !== 'Summer') {
    return `${g.timelineYear} ${tSeason('Spring')} ${g.periodFrom} - ${tSeason('Summer')}`
  }
  if (g.periodFrom === g.periodTo) {
    return `${g.timelineYear} ${tSeason(g.season)} ${g.periodFrom}`
  }
  return `${g.timelineYear} ${tSeason(g.season)} ${g.periodFrom} - ${g.periodTo}`
}

/**
 * Resolve a period group to Sisu locators (one per spanned column); used for quick-schedule spans.
 */
export function resolveGroupToLocators(
  index: StudyPeriodIndex,
  g: CourseTeachingPeriodGroup
): string[] | null {
  if (g.season === 'Spring' && g.periodTo === 'Summer' && g.periodFrom !== 'Summer') {
    const springYear = g.timelineYear
    const springCols = index.periodsByCard.get(`${springYear}|Spring`)
    const summerCols = index.periodsByCard.get(`${springYear}|Summer`)
    if (!springCols?.length || !summerCols?.length) {
      return null
    }
    const springPeriods = PERIODS_FOR_SEASON.Spring as readonly string[]
    const fromIdx = springPeriods.indexOf(g.periodFrom as string)
    if (fromIdx < 0) {
      return null
    }
    const locators: string[] = []
    for (let i = fromIdx; i < springPeriods.length; i++) {
      const label = springPeriods[i]!
      const hit = springCols.find((c) => c.label === label)
      if (!hit) {
        return null
      }
      locators.push(hit.locator)
    }
    const sumHit = summerCols.find((c) => c.label === 'Summer')
    if (!sumHit) {
      return null
    }
    locators.push(sumHit.locator)
    return locators
  }

  if (g.periodFrom === 'Summer' && g.periodTo === 'Summer' && g.season === 'Summer') {
    const tryYears = [g.timelineYear, g.timelineYear - 1]
    for (const tryY of tryYears) {
      const cols = index.periodsByCard.get(`${tryY}|Summer`)
      const hit = cols?.find((c) => c.label === 'Summer')
      if (hit) {
        return [hit.locator]
      }
    }
    return null
  }

  const cols = index.periodsByCard.get(`${g.timelineYear}|${g.season}`)
  if (!cols?.length) {
    return null
  }

  const season = g.season
  if (season !== 'Fall' && season !== 'Spring') {
    return null
  }

  const periods = PERIODS_FOR_SEASON[season] as readonly string[]
  const fromIdx = periods.indexOf(g.periodFrom as string)
  const toIdx = periods.indexOf(g.periodTo as string)
  if (fromIdx < 0 || toIdx < 0) {
    return null
  }
  const lo = Math.min(fromIdx, toIdx)
  const hi = Math.max(fromIdx, toIdx)
  const labels = periods.slice(lo, hi + 1) as string[]
  const locators: string[] = []
  for (const label of labels) {
    const hit = cols.find((c) => c.label === label)
    if (!hit) {
      return null
    }
    locators.push(hit.locator)
  }
  return locators
}

function parseRomanOrSummer(s: string): CourseTeachingPeriodToken | null {
  const t = s
    .trim()
    .replace(/[,;.):]+$/g, '')
    .trim()
  if (SUMMER_TERMS.test(t)) {
    return 'Summer'
  }
  if (/^(i|ii|iii|iv|v)$/i.test(t)) {
    const upper = t.toUpperCase()
    if (['I', 'II', 'III', 'IV', 'V'].includes(upper)) {
      return upper as CourseTeachingPeriodToken
    }
  }
  return null
}

function parsePeriodRange(
  rest: string
): { from: CourseTeachingPeriodToken; to: CourseTeachingPeriodToken } | null {
  let compact = rest.replace(/\s+/g, ' ').trim()
  compact = compact.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
  compact = compact.replace(/([IV]+)\s*,\s*([IV]+)/gi, '$1 - $2')
  /** Leading match only: Kori often appends `, language of instruction: …` after the range. */
  const springToSummer = compact.match(/^([IV]+)\s*-\s*(Summer|kesä|kesa)\b/i)
  if (springToSummer) {
    const from = parseRomanOrSummer(springToSummer[1]!)
    if (from && from !== 'Summer') {
      return { from, to: 'Summer' }
    }
  }
  const rangeMatch = compact.match(/^([IV]+)\s*-\s*([IV]+)\b/i)
  if (rangeMatch) {
    const from = parseRomanOrSummer(rangeMatch[1]!)
    const to = parseRomanOrSummer(rangeMatch[2]!)
    if (from && to && from !== 'Summer' && to !== 'Summer') {
      return { from, to }
    }
  }
  const single = parseRomanOrSummer(compact)
  if (single) {
    return { from: single, to: single }
  }
  return null
}

function parseSeasonSegment(
  seg: string
): { term: 'autumn' | 'spring' | 'summer'; periodPart: string } | null {
  const s = seg.trim()
  const m = s.match(/^(\d{4})\s*[-–]\s*(\d{4})\s+(.+)$/i)
  if (!m) {
    return null
  }
  const rest = m[3]!.trim()
  const parts = rest.split(/\s+/)
  if (parts.length === 1 && SUMMER_TERMS.test(parts[0]!)) {
    return { term: 'summer', periodPart: '' }
  }
  if (parts.length < 2) {
    return null
  }
  const seasonWord = parts[0]!.replace(/[:,.;]+$/g, '')
  let term: 'autumn' | 'spring' | 'summer'
  if (AUTUMN_TERMS.test(seasonWord)) {
    term = 'autumn'
  } else if (SPRING_TERMS.test(seasonWord)) {
    term = 'spring'
  } else if (SUMMER_TERMS.test(seasonWord)) {
    term = 'summer'
  } else {
    return null
  }
  const periodPart = parts.slice(1).join(' ')
  return { term, periodPart }
}

export function parseTeachingPeriodLine(line: string): ParsedKoriTeachingRange | null {
  const trimmed = line.trim()
  if (!trimmed) {
    return null
  }
  const yearMatch = trimmed.match(/^(\d{4})\s*[-–]\s*(\d{4})/)
  if (!yearMatch) {
    return null
  }
  const yStart = Number(yearMatch[1])
  const yEnd = Number(yearMatch[2])
  if (yEnd !== yStart + 1) {
    return null
  }
  const parsed = parseSeasonSegment(trimmed)
  if (!parsed) {
    return null
  }
  const { term, periodPart } = parsed

  if (term === 'summer') {
    return {
      academicYearStart: yStart,
      term: 'summer',
      periodFrom: 'Summer',
      periodTo: 'Summer',
    }
  }

  const pr = parsePeriodRange(periodPart)
  if (!pr || pr.from === 'Summer') {
    return null
  }

  if (term === 'autumn') {
    if (pr.to === 'Summer') {
      return null
    }
    const ok =
      tokenOrderInSeason('Fall', pr.from) >= 0 &&
      tokenOrderInSeason('Fall', pr.to) >= 0 &&
      ROMAN.indexOf(pr.from) <= 1 &&
      ROMAN.indexOf(pr.to) <= 1
    if (!ok) {
      return null
    }
  } else {
    if (pr.to === 'Summer') {
      const ok =
        tokenOrderInSeason('Spring', pr.from) >= 0 &&
        ROMAN.indexOf(pr.from) >= 2 &&
        ROMAN.indexOf(pr.from) <= 4
      if (!ok) {
        return null
      }
      return {
        academicYearStart: yStart,
        term: 'spring',
        periodFrom: pr.from,
        periodTo: 'Summer',
      }
    }
    const ok =
      tokenOrderInSeason('Spring', pr.from) >= 0 &&
      tokenOrderInSeason('Spring', pr.to) >= 0 &&
      ROMAN.indexOf(pr.from) >= 2 &&
      ROMAN.indexOf(pr.to) <= 4
    if (!ok) {
      return null
    }
  }

  if (
    tokenOrderInSeason(term === 'autumn' ? 'Fall' : 'Spring', pr.from) >
    tokenOrderInSeason(term === 'autumn' ? 'Fall' : 'Spring', pr.to)
  ) {
    return null
  }

  return {
    academicYearStart: yStart,
    term,
    periodFrom: pr.from,
    periodTo: pr.to,
  }
}

export function parseTeachingPeriodLineToGroup(line: string): CourseTeachingPeriodGroup | null {
  const r = parseTeachingPeriodLine(line)
  return r ? parsedRangeToGroup(r) : null
}

function splitLines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n')
  const chunks: string[] = []
  for (const part of normalized.split(/[;\n]+/)) {
    const t = part.trim()
    if (t) {
      chunks.push(t)
    }
  }
  return chunks
}

const AFTER_TEACHING_PERIOD_BLOCK = /\b(?:Registration|Ilmoittautuminen|Anmälan)\s*:/i

const TEACHING_PERIOD_HEADER = /(?:Teaching\s+Period|Opetusperiodi|Undervisningsperiod)\s*:\s*/i

const NO_TEACHING_REST = /^(no\s*teaching|ei\s*opetusta|ingen\s*undervisning)\s*$/i

export function htmlAdditionalToPlainText(html: string): string {
  let t = html.replace(/\r\n/g, '\n')
  t = t.replace(/<br\s*\/?>/gi, '\n')
  t = t.replace(/<\/(p|div|li|tr)\s*>/gi, '\n')
  t = t.replace(/<[^>]+>/g, ' ')
  t = t
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
  t = t.replace(/[ \t\f\v]+/g, ' ')
  return t.trim()
}

function sliceAfterTeachingPeriodHeader(plain: string): string | null {
  const m = plain.match(TEACHING_PERIOD_HEADER)
  if (!m || m.index === undefined) {
    return null
  }
  let rest = plain.slice(m.index + m[0].length)
  const reg = rest.search(AFTER_TEACHING_PERIOD_BLOCK)
  if (reg >= 0) {
    rest = rest.slice(0, reg)
  }
  return rest.trim() || null
}

function splitTeachingPeriodPlainText(plain: string): string[] {
  const out: string[] = []
  for (const part of plain.split(/[\n;]+/)) {
    const t = part.replace(/\s+/g, ' ').trim()
    if (t && /\d{4}\s*[-–]\s*\d{4}/.test(t)) {
      out.push(t)
    }
  }
  return out
}

function extractLinesFromBlob(blob: string): string[] {
  const trimmed = blob.trim()
  if (!trimmed) {
    return []
  }
  const looksHtml = /<[a-z][\s\S]*>/i.test(trimmed)
  const plain = looksHtml ? htmlAdditionalToPlainText(trimmed) : trimmed
  const section = sliceAfterTeachingPeriodHeader(plain)
  if (section) {
    return splitTeachingPeriodPlainText(section)
  }
  return splitTeachingPeriodPlainText(plain)
}

function parseNoTeachingYear(line: string): number | null {
  const t = line.trim()
  const yearMatch = t.match(/^(\d{4})\s*[-–]\s*(\d{4})\s+(.+)$/i)
  if (!yearMatch) {
    return null
  }
  const yStart = Number(yearMatch[1])
  const yEnd = Number(yearMatch[2])
  if (yEnd !== yStart + 1) {
    return null
  }
  const rest = yearMatch[3]!.trim()
  if (!NO_TEACHING_REST.test(rest)) {
    return null
  }
  return yStart
}

export function collectAdditionalStrings(additional: unknown): string[] {
  if (additional == null) {
    return []
  }
  if (typeof additional === 'string') {
    return additional.trim() ? [additional.trim()] : []
  }
  if (Array.isArray(additional)) {
    const out: string[] = []
    for (const x of additional) {
      out.push(...collectAdditionalStrings(x))
    }
    return out
  }
  if (typeof additional === 'object') {
    const out: string[] = []
    for (const v of Object.values(additional as Record<string, unknown>)) {
      out.push(...collectAdditionalStrings(v))
    }
    return out
  }
  return []
}

export function parseKoriTeachingPeriodsFromAdditional(additional: unknown): {
  groups: CourseTeachingPeriodGroup[]
  noTeachingAcademicYearStarts: number[]
} {
  const strings = collectAdditionalStrings(additional)
  if (strings.length === 0) {
    return { groups: [], noTeachingAcademicYearStarts: [] }
  }
  const seen = new Set<string>()
  const groups: CourseTeachingPeriodGroup[] = []
  const noTeachSeen = new Set<number>()
  const noTeachingAcademicYearStarts: number[] = []

  for (const blob of strings) {
    let candidateLines = extractLinesFromBlob(blob)
    if (candidateLines.length === 0) {
      const plain = /<[a-z][\s\S]*>/i.test(blob) ? htmlAdditionalToPlainText(blob) : blob
      candidateLines = splitLines(plain)
    }
    for (const line of candidateLines) {
      const parsed = parseTeachingPeriodLine(line)
      if (parsed) {
        const g = parsedRangeToGroup(parsed)
        if (g) {
          const k = groupKey(g)
          if (!seen.has(k)) {
            seen.add(k)
            groups.push(g)
          }
        }
        continue
      }
      const nt = parseNoTeachingYear(line)
      if (nt != null && !noTeachSeen.has(nt)) {
        noTeachSeen.add(nt)
        noTeachingAcademicYearStarts.push(nt)
      }
    }
  }
  return { groups, noTeachingAcademicYearStarts }
}

export type TeachingPeriodQuickOption = {
  label: string
  group: CourseTeachingPeriodGroup
  plannedPeriodLocators: string[] | null
}

export function buildTeachingPeriodQuickOptions(
  index: StudyPeriodIndex | null,
  groups: CourseTeachingPeriodGroup[] | undefined | null
): TeachingPeriodQuickOption[] {
  if (!index || !groups?.length) {
    return []
  }
  const out: TeachingPeriodQuickOption[] = []
  for (const group of groups) {
    const label = formatTeachingPeriodGroup(group)
    const plannedPeriodLocators = resolveGroupToLocators(index, group)
    out.push({ label, group, plannedPeriodLocators })
  }
  return out
}

/**
 * When Summer exists on two adjacent timeline years, duplicate the summer-only group for each.
 */
export function expandSummerGroupsByGridYear(
  groups: CourseTeachingPeriodGroup[],
  index: StudyPeriodIndex
): CourseTeachingPeriodGroup[] {
  const out: CourseTeachingPeriodGroup[] = []
  for (const g of groups) {
    if (g.season !== 'Summer' || g.periodFrom !== 'Summer' || g.periodTo !== 'Summer') {
      out.push(g)
      continue
    }
    const y = g.timelineYear
    const candidates = [y, y - 1]
    const present: number[] = []
    for (const cy of candidates) {
      if (index.periodsByCard.get(`${cy}|Summer`)?.some((c) => c.label === 'Summer')) {
        present.push(cy)
      }
    }
    if (present.length <= 1) {
      out.push(g)
      continue
    }
    const seen = new Set<string>()
    for (const cy of present) {
      const q: CourseTeachingPeriodGroup = { ...g, timelineYear: cy }
      const k = groupKey(q)
      if (!seen.has(k)) {
        seen.add(k)
        out.push(q)
      }
    }
  }
  return out
}
