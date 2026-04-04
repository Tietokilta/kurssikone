import type { SisuAttainment } from './types'

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
