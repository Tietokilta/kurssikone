import type { SisuAttainment } from './types'

/** Trailing ISO date on programme org ids, e.g. `aalto-EDU-203002-2016-08-01`. */
const ROOT_DATE_SUFFIX = /-(\d{4})-\d{2}-\d{2}$/

function academicYearStartCalendarYear(now: Date): number {
  const y = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 8 ? y : y - 1
}

/**
 * First calendar year to request from kori study-years: one year before the earliest
 * attainment (so the academic grid covers that date). Returns `null` if there are no dates.
 */
export function firstStudyYearFromAttainmentDates(attainments: SisuAttainment[]): number | null {
  let minMs = Infinity
  for (const a of attainments) {
    const d = a.attainmentDate
    if (typeof d !== 'string' || !d.trim()) {
      continue
    }
    const t = Date.parse(d)
    if (Number.isNaN(t)) {
      continue
    }
    if (t < minMs) {
      minMs = t
    }
  }
  if (minMs === Infinity) {
    return null
  }
  const y = new Date(minMs).getFullYear()
  return Math.max(1990, Math.min(2100, y - 1))
}

/** When the student has no dated attainments yet, start the window a few years before “now”. */
export function defaultFirstStudyYearWhenNoAttainments(now = new Date()): number {
  const academicStart = academicYearStartCalendarYear(now)
  return Math.max(1990, academicStart - 10)
}

/**
 * Kori `/kori/api/study-years` requires `firstYear` (int). Prefer the curriculum start year
 * encoded on `rootId` / `organisationId` when present; otherwise a conservative default window.
 */
export function inferFirstYearForKoriStudyYears(plan: {
  rootId?: string | null
  curriculumPeriodId?: string | null
}): number {
  const root = plan.rootId?.trim() ?? ''
  const fromRoot = root.match(ROOT_DATE_SUFFIX)
  if (fromRoot) {
    const y = parseInt(fromRoot[1], 10)
    if (y >= 1990 && y <= 2100) return y
  }

  const cp = plan.curriculumPeriodId?.trim() ?? ''
  const fromCp = cp.match(/\b(20\d{2})\b/)
  if (fromCp) {
    const y = parseInt(fromCp[1], 10)
    if (y >= 1990 && y <= 2100) return y
  }

  const academicStart = academicYearStartCalendarYear(new Date())
  return Math.max(1990, academicStart - 10)
}
