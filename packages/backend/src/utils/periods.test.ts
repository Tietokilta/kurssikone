import { describe, it, expect } from 'vitest'
import { getMatchingPeriods } from './periods'

function monthOf(dateStr: string): number {
  const [, month] = dateStr.split('.').map(Number)
  return month
}

function periods(startDate: string, endDate: string): string[] {
  return getMatchingPeriods(monthOf(startDate), monthOf(endDate))
}

describe('getMatchingPeriods', () => {
  describe('single period courses', () => {
    it('1.9.2026–9.10.2026 -> I', () => {
      expect(periods('1.9.2026', '9.10.2026')).toEqual(['I'])
    })

    it('8.10.2026–16.10.2026 -> I', () => {
      expect(periods('8.10.2026', '16.10.2026')).toEqual(['I'])
    })

    it('30.11.2026–4.12.2026 -> II', () => {
      expect(periods('30.11.2026', '4.12.2026')).toEqual(['II'])
    })

    it('22.2.2027–26.2.2027 -> III', () => {
      expect(periods('22.2.2027', '26.2.2027')).toEqual(['III'])
    })

    it('19.4.2027–23.4.2027 -> IV', () => {
      expect(periods('19.4.2027', '23.4.2027')).toEqual(['IV'])
    })
  })

  describe('multi-period courses', () => {
    it('12.1.2027–19.4.2027 -> III-IV', () => {
      expect(periods('12.1.2027', '19.4.2027')).toEqual(['III', 'IV'])
    })

    it('2.9.2026–4.11.2026 -> I-II', () => {
      expect(periods('2.9.2026', '4.11.2026')).toEqual(['I', 'II'])
    })

    it('27.1.2027–5.5.2027 -> III-IV', () => {
      expect(periods('27.1.2027', '5.5.2027')).toEqual(['III', 'IV'])
    })

    it('2.9.2026–25.11.2026 -> I-II', () => {
      expect(periods('2.9.2026', '25.11.2026')).toEqual(['I', 'II'])
    })
  })

  describe('edge cases', () => {
    it('1.8.2026–31.7.2026 -> Summer', () => {
      expect(periods('1.8.2026', '31.7.2026')).toEqual(['Summer'])
    })

    it('8.6.2026–31.8.2026 -> Summer', () => {
      expect(periods('8.6.2026', '31.8.2026')).toEqual(['Summer'])
    })

    it('19.10.2026–27.11.2026 -> II', () => {
      expect(periods('19.10.2026', '27.11.2026')).toEqual(['II'])
    })
  })
})
