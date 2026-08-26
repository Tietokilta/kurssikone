export const PERIOD_MONTH_DEFS: Record<string, { positive: [number, number]; negative: number[] }> = {
  I: { positive: [9, 10], negative: [11] },
  II: { positive: [11, 12], negative: [] },
  III: { positive: [1, 2], negative: [] },
  IV: { positive: [3, 4], negative: [5] },
  V: { positive: [5, 6], negative: [7] },
  Summer: { positive: [7, 7], negative: [] },
}

export const VALID_PERIODS = Object.keys(PERIOD_MONTH_DEFS)

export function getMatchingPeriods(startMonth: number, endMonth: number): string[] {
  const matched: string[] = []
  for (const [label, { positive: [pStart, pEnd] }] of Object.entries(PERIOD_MONTH_DEFS)) {
    const startInPositive = startMonth >= pStart && startMonth <= pEnd
    const endInPositive = endMonth >= pStart && endMonth <= pEnd
    const spans = startMonth < pStart && endMonth > pEnd

    const excludeByStart = startMonth === pEnd && endMonth > pEnd
    const excludeByEnd = endMonth === pStart && startMonth < pStart - 2

    if ((startInPositive && !excludeByStart) || (endInPositive && !excludeByEnd) || spans) {
      matched.push(label)
    }
  }
  return matched
}
