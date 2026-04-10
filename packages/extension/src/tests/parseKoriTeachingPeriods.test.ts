/** @jest-environment node */

import fs from 'fs'
import path from 'path'
import {
  formatTeachingPeriodGroup,
  parseKoriTeachingPeriodsFromAdditional,
  parseTeachingPeriodLine,
  parseTeachingPeriodLineToGroup,
  parsedRangeToGroup,
  resolveGroupToLocators,
} from '../utils/parseKoriTeachingPeriods'
import { createPeriodIndex } from '../utils/studyYearPeriods'

const ROOT = 'aalto-university-root-id'

function loadIndex(): ReturnType<typeof createPeriodIndex> {
  const raw = fs
    .readFileSync(path.join(__dirname, 'data', 'studyYears.json'), 'utf8')
    .replace(/^\uFEFF/, '')
  const years = JSON.parse(raw)
  return createPeriodIndex(years, ROOT, true)
}

describe('parsedRangeToGroup + formatTeachingPeriodGroup', () => {
  it('maps Autumn II to a single Fall group', () => {
    const r = parseTeachingPeriodLine('2023-2024 Autumn II')
    expect(r).not.toBeNull()
    const g = parsedRangeToGroup(r!)!
    expect(g).toEqual({
      timelineYear: 2023,
      season: 'Fall',
      periodFrom: 'II',
      periodTo: 'II',
    })
    expect(formatTeachingPeriodGroup(g)).toBe('2023 Fall II')
  })

  it('maps Spring III - V to one range string', () => {
    const r = parseTeachingPeriodLine('2024-2025 Spring III - V')
    const g = parsedRangeToGroup(r!)!
    expect(g).toEqual({
      timelineYear: 2025,
      season: 'Spring',
      periodFrom: 'III',
      periodTo: 'V',
    })
    expect(formatTeachingPeriodGroup(g)).toBe('2025 Spring III - V')
  })

  it('maps Summer-only line', () => {
    const r = parseTeachingPeriodLine('2023-2024 Summer')
    const g = parsedRangeToGroup(r!)!
    expect(formatTeachingPeriodGroup(g)).toBe('2024 Summer')
  })

  it('maps Spring III - Summer', () => {
    const r = parseTeachingPeriodLine('2024-2025 Spring III - Summer')
    const g = parsedRangeToGroup(r!)!
    expect(formatTeachingPeriodGroup(g)).toBe('2025 Spring III - Summer')
  })
})

describe('parseTeachingPeriodLineToGroup', () => {
  it('returns null for garbage', () => {
    expect(parseTeachingPeriodLineToGroup('')).toBeNull()
  })
})

describe('parseKoriTeachingPeriodsFromAdditional', () => {
  it('parses fixture-style additional object', () => {
    const raw = fs.readFileSync(
      path.join(__dirname, 'data', 'course-unit-response.json'),
      'utf8'
    )
    const units = JSON.parse(raw) as { additional?: unknown }[]
    const { groups } = parseKoriTeachingPeriodsFromAdditional(units[0]!.additional)
    expect(groups.length).toBeGreaterThan(0)
    expect(groups.some((g) => g.season === 'Fall')).toBe(true)
  })

  it('parses Sisu HTML additional (Teaching Period block)', () => {
    const additional = {
      en: '<p> Teaching Language: English</p><p> Teaching Period: 2024-2025 Spring III - V <br /> 2025-2026 Spring III - V</p><p> Registration: </p>',
    }
    const { groups } = parseKoriTeachingPeriodsFromAdditional(additional)
    expect(groups).toEqual(
      expect.arrayContaining([
        {
          timelineYear: 2025,
          season: 'Spring',
          periodFrom: 'III',
          periodTo: 'V',
        },
        {
          timelineYear: 2026,
          season: 'Spring',
          periodFrom: 'III',
          periodTo: 'V',
        },
      ])
    )
  })
})

describe('resolveGroupToLocators', () => {
  const index = loadIndex()

  it('resolves Spring III–V to three locators', () => {
    const loc = resolveGroupToLocators(index, {
      timelineYear: 2024,
      season: 'Spring',
      periodFrom: 'III',
      periodTo: 'V',
    })
    expect(loc).not.toBeNull()
    expect(loc!.length).toBe(3)
  })

  it('resolves Autumn II to one locator', () => {
    const loc = resolveGroupToLocators(index, {
      timelineYear: 2023,
      season: 'Fall',
      periodFrom: 'II',
      periodTo: 'II',
    })
    expect(loc).not.toBeNull()
    expect(loc!.length).toBe(1)
  })
})
