/** @jest-environment node */

import fs from 'fs'
import path from 'path'
import type { Course } from '@kurssikompassi/shared/src/types'
import { expandSummerGroupsByGridYear } from '../utils/parseKoriTeachingPeriods'
import {
  isAcademicYearFullyPast,
  isCourseValidityEnded,
  prepareTeachingPeriodsForTimeline,
} from '../utils/teachingPeriodTimeline'
import { createPeriodIndex } from '../utils/studyYearPeriods'

function loadIndex() {
  const raw = fs
    .readFileSync(path.join(__dirname, 'data', 'studyYears.json'), 'utf8')
    .replace(/^\uFEFF/, '')
  return createPeriodIndex(JSON.parse(raw), 'aalto-university-root-id', true)
}

describe('isCourseValidityEnded', () => {
  it('is false when validity end is missing', () => {
    expect(isCourseValidityEnded(null, '2030-01-01')).toBe(false)
  })

  it('is true after the end date', () => {
    expect(isCourseValidityEnded('2024-07-31', '2025-01-01')).toBe(true)
  })
})

describe('isAcademicYearFullyPast', () => {
  it('treats an old academic year as past', () => {
    expect(isAcademicYearFullyPast(2018, '2026-04-10')).toBe(true)
  })
})

describe('expandSummerGroupsByGridYear', () => {
  it('splits one Summer group when two timeline summers exist', () => {
    const index = loadIndex()
    const base = {
      timelineYear: 2021,
      season: 'Summer' as const,
      periodFrom: 'Summer' as const,
      periodTo: 'Summer' as const,
    }
    const expanded = expandSummerGroupsByGridYear([base], index)
    expect(expanded.length).toBe(2)
    expect(new Set(expanded.map((p) => p.timelineYear))).toEqual(new Set([2020, 2021]))
  })
})

describe('prepareTeachingPeriodsForTimeline', () => {
  const index = loadIndex()

  it('returns nothing when course validity has ended', () => {
    const course: Course = {
      id: 'x',
      code: 'X',
      groupId: null,
      nameFi: null,
      nameEn: null,
      creditsMin: 5,
      creditsMax: 5,
      validityStart: '2020-08-01',
      validityEnd: '2023-07-31',
      avgQualityScore: null,
      avgWorkloadScore: null,
      reviewCount: 0,
      teachingPeriodGroups: [
        { timelineYear: 2026, season: 'Fall', periodFrom: 'I', periodTo: 'I' },
      ],
      teachingPeriodNoTeachingYears: [],
    }
    const r = prepareTeachingPeriodsForTimeline(course, index, '2026-01-01')
    expect(r.displayLabels).toEqual([])
    expect(r.quickGroups).toEqual([])
  })

  it('keeps a future season group when using heuristic (no period index)', () => {
    const course: Course = {
      id: 'x',
      code: 'X',
      groupId: null,
      nameFi: null,
      nameEn: null,
      creditsMin: 5,
      creditsMax: 5,
      validityStart: '2020-08-01',
      validityEnd: null,
      avgQualityScore: null,
      avgWorkloadScore: null,
      reviewCount: 0,
      teachingPeriodGroups: [
        { timelineYear: 2031, season: 'Fall', periodFrom: 'I', periodTo: 'I' },
      ],
      teachingPeriodNoTeachingYears: [],
    }
    const r = prepareTeachingPeriodsForTimeline(course, null, '2031-10-01')
    expect(r.quickGroups.length).toBe(1)
    expect(r.displayLabels.some((l) => l.includes('2031'))).toBe(true)
  })

  it('still shows Spring III–V in early November (season not past)', () => {
    const course: Course = {
      id: 'x',
      code: 'X',
      groupId: null,
      nameFi: null,
      nameEn: null,
      creditsMin: 5,
      creditsMax: 5,
      validityStart: '2020-08-01',
      validityEnd: null,
      avgQualityScore: null,
      avgWorkloadScore: null,
      reviewCount: 0,
      teachingPeriodGroups: [
        { timelineYear: 2026, season: 'Spring', periodFrom: 'III', periodTo: 'V' },
      ],
      teachingPeriodNoTeachingYears: [],
    }
    const r = prepareTeachingPeriodsForTimeline(course, index, '2025-11-04')
    expect(r.quickGroups.length).toBe(1)
    expect(r.displayLabels[0]).toContain('III - V')
  })
})
