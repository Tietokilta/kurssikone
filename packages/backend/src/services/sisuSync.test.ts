import { describe, it, expect } from 'vitest'
import { parseDate } from './sisuSync'

describe('parseDate', () => {
  it('should return null for null input', () => {
    expect(parseDate(null)).toBe(null)
  })

  it('should return null for undefined input', () => {
    expect(parseDate(undefined)).toBe(null)
  })

  it('should return null for empty string', () => {
    expect(parseDate('')).toBe(null)
  })

  it('should return null for invalid date string', () => {
    expect(parseDate('not-a-date')).toBe(null)
  })

  it('should parse ISO date string and return date part', () => {
    expect(parseDate('2024-09-15T10:30:00Z')).toBe('2024-09-15')
  })

  it('should parse date-only string', () => {
    expect(parseDate('2024-01-01')).toBe('2024-01-01')
  })

  it('should handle dates with timezone offset', () => {
    expect(parseDate('2024-12-25T00:00:00+02:00')).toBe('2024-12-25')
  })
})
