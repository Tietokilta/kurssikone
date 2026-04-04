/** @jest-environment node */

import fs from 'fs'
import path from 'path'
import { parsePlannedPeriods } from '../utils/parsePlannedPeriods'
import { createPeriodIndex, findPeriodByDate, periodLabelFromApi } from '../utils/studyYearPeriods'
import type { SisuStudyPeriod, SisuStudyYear } from '../utils/types'

const fixturePath = path.join(__dirname, 'data', 'studyYears.json')

function loadStudyYears(): SisuStudyYear[] {
  const raw = fs.readFileSync(fixturePath, 'utf8').replace(/^\uFEFF/, '')
  return JSON.parse(raw) as SisuStudyYear[]
}

describe('createPeriodIndex / findPeriodByDate', () => {
  const org = 'aalto-university-root-id'

  it('maps attainment dates to the enclosing study period', () => {
    const index = createPeriodIndex(loadStudyYears(), org, true)
    const fallI = findPeriodByDate(index, '2020-09-15')
    expect(fallI).not.toBeNull()
    expect(fallI).toMatchObject({ period: 'I', season: 'Fall', year: 2020 })

    const springIII = findPeriodByDate(index, '2021-02-01')
    expect(springIII).not.toBeNull()
    expect(springIII).toMatchObject({ period: 'III', season: 'Spring', year: 2021 })
  })

  it('returns null when the date is outside all intervals', () => {
    const index = createPeriodIndex(loadStudyYears(), org, true)
    expect(findPeriodByDate(index, '1999-01-01')).toBeNull()
  })

  it('byLocator matches parsePlannedPeriods for known locators', () => {
    const index = createPeriodIndex(loadStudyYears(), org, true)
    const loc = 'aalto-university-root-id/2025/0/0'
    const p = parsePlannedPeriods(loc, undefined, index)
    expect(p).toMatchObject({ season: 'Summer', year: 2025, period: 'Summer' })
  })

  it('resolves programme-root locators against university-root study-years', () => {
    const index = createPeriodIndex(loadStudyYears(), org, true)
    const programmeLoc = 'aalto-EDU-203002-2016-08-01/2025/0/1'
    const uniLoc = 'aalto-university-root-id/2025/0/1'
    const a = parsePlannedPeriods(programmeLoc, undefined, index)
    const b = parsePlannedPeriods(uniLoc, undefined, index)
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    expect(a!.key).toBe(b!.key)
  })
})

describe('periodLabelFromApi', () => {
  it('reads Roman numerals and Summer', () => {
    expect(periodLabelFromApi({ name: { fi: 'I' } } as SisuStudyPeriod)).toBe('I')
    expect(periodLabelFromApi({ name: { en: 'Summer' } } as SisuStudyPeriod)).toBe('Summer')
  })
})
