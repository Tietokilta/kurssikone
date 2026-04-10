/** @jest-environment node */

import {
  applyPlannedCreditOverrides,
  creditChoiceIsUserSet,
  defaultVariablePlannedCredits,
  normalizeStoredOverrides,
  resolvePlannedCredits,
} from '../utils/timelineVariableCredits'

describe('timelineVariableCredits', () => {
  it('defaultVariablePlannedCredits uses average when range', () => {
    expect(defaultVariablePlannedCredits(1, 10)).toBe(6)
    expect(defaultVariablePlannedCredits(5, 5)).toBe(5)
  })

  it('resolvePlannedCredits ignores overrides for fixed credits', () => {
    expect(resolvePlannedCredits('x', 5, 5, { x: 99 })).toBe(5)
  })

  it('resolvePlannedCredits uses clamped override for variable credits', () => {
    expect(resolvePlannedCredits('c', 1, 10, { c: 3 })).toBe(3)
    expect(resolvePlannedCredits('c', 1, 10, { c: 0 })).toBe(1)
    expect(resolvePlannedCredits('c', 1, 10, { c: 99 })).toBe(10)
  })

  it('resolvePlannedCredits uses default when variable and no override', () => {
    expect(resolvePlannedCredits('c', 1, 10, {})).toBe(6)
  })

  it('creditChoiceIsUserSet detects own property', () => {
    expect(creditChoiceIsUserSet('a', {})).toBe(false)
    expect(creditChoiceIsUserSet('a', { a: 5 })).toBe(true)
    expect(creditChoiceIsUserSet('a', Object.create({ a: 5 }))).toBe(false)
  })

  it('applyPlannedCreditOverrides updates plannedCredits only', () => {
    const rows = [
      {
        id: 'v',
        name: 'Var',
        creditsMin: 1,
        creditsMax: 10,
        plannedCredits: 6,
        parsedPlannedPeriods: [],
        rawData: {} as never,
        selectionIndex: 0,
      },
    ]
    const out = applyPlannedCreditOverrides(rows, { v: 2 })
    expect(out[0]!.plannedCredits).toBe(2)
    expect(out[0]!.name).toBe('Var')
  })

  it('normalizeStoredOverrides keeps finite numbers only', () => {
    expect(normalizeStoredOverrides(null)).toEqual({})
    expect(normalizeStoredOverrides({ a: 1, b: 'x', c: NaN })).toEqual({ a: 1 })
  })
})
