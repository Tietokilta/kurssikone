/** @jest-environment node */

import fs from 'fs'
import path from 'path'
import {
  addPlannedPeriodIfMissing,
  applyPlannedPeriodAdd,
  applyPlannedPeriodExtend,
  applyPlannedPeriodMove,
  applyPlannedPeriodUnschedule,
  moveCourseUnitPlannedPeriod,
  plannedPeriodKeysEqual,
  removePlannedPeriodForSlot,
  resolveTimelineMoveRun,
} from '../utils/planPeriodDrag'
import { createPeriodIndex } from '../utils/studyYearPeriods'
import type { SisuCourseUnitSelection, SisuStudyPlan, SisuStudyYear } from '../utils/types'

const ROOT = 'aalto-university-root-id'

function loadIndex(showSummer = true): ReturnType<typeof createPeriodIndex> {
  const raw = fs.readFileSync(path.join(__dirname, 'data', 'studyYears.json'), 'utf8').replace(/^\uFEFF/, '')
  const years = JSON.parse(raw) as SisuStudyYear[]
  return createPeriodIndex(years, ROOT, showSummer)
}

const index = loadIndex()
/** Index with summer columns omitted from the grid; `byLocator` still includes Summer. */
const indexGridWithoutSummer = loadIndex(false)

function selection(periods: string[]): SisuCourseUnitSelection {
  return {
    courseUnitId: 'aalto-CU-1150973104-20240801',
    parentModuleId: 'otm-test',
    completionMethodId: 'cm-20240801-0',
    substitutedBy: [],
    substituteFor: [],
    plannedPeriods: periods,
    gradeRaiseAttempt: null,
  }
}

function studyPlan(courseUnitSelections: SisuCourseUnitSelection[], revision = 7): SisuStudyPlan {
  return {
    metadata: {
      revision,
      createdBy: 'u',
      createdOn: 't',
      lastModifiedBy: 'u',
      lastModifiedOn: 't',
      modificationOrdinal: 0,
    },
    documentState: 'DRAFT',
    id: 'plan-1',
    rootId: ROOT,
    learningOpportunityId: 'lo',
    userId: 'user',
    name: 'Test',
    curriculumPeriodId: 'cp',
    moduleSelections: [],
    courseUnitSelections,
    customModuleAttainmentSelections: [],
    customCourseUnitAttainmentSelections: [],
    assessmentItemSelections: [],
    timelineNotes: [],
    customStudyDrafts: [],
    primary: true,
  }
}

describe('plannedPeriodKeysEqual', () => {
  it('treats identical strings as same slot', () => {
    const p = `${ROOT}/2025/0/1`
    expect(plannedPeriodKeysEqual(p, p, selection([]).courseUnitId, index)).toBe(true)
  })

  it('treats different Fall periods as different slots', () => {
    const a = `${ROOT}/2025/0/1`
    const b = `${ROOT}/2025/0/2`
    expect(plannedPeriodKeysEqual(a, b, selection([]).courseUnitId, index)).toBe(false)
  })
})

describe('removePlannedPeriodForSlot', () => {
  const cu = selection([]).courseUnitId
  const p1 = `${ROOT}/2025/0/1`

  it('removes by exact string', () => {
    const out = removePlannedPeriodForSlot([p1, `${ROOT}/2025/0/2`], p1, cu, index)
    expect(out).toEqual([`${ROOT}/2025/0/2`])
  })

  it('returns null when no period matches', () => {
    expect(removePlannedPeriodForSlot([], p1, cu, index)).toBeNull()
  })
})

describe('addPlannedPeriodIfMissing', () => {
  const cu = selection([]).courseUnitId
  const p1 = `${ROOT}/2025/0/1`
  const p2 = `${ROOT}/2025/0/2`

  it('does not duplicate an existing period (exact or same slot)', () => {
    expect(addPlannedPeriodIfMissing([p1], p1, cu, index)).toEqual([p1])
  })

  it('appends new slot', () => {
    expect(addPlannedPeriodIfMissing([p1], p2, cu, index)).toEqual([p1, p2])
  })
})

describe('moveCourseUnitPlannedPeriod', () => {
  const p1 = `${ROOT}/2025/0/1`
  const p2 = `${ROOT}/2025/0/2`
  const row = selection([p1])

  it('moves from first to second period', () => {
    const next = moveCourseUnitPlannedPeriod(row, p1, p2, index)
    expect(next).not.toBeNull()
    expect(next!.plannedPeriods).toEqual([p2])
  })

  it('returns null when source is missing', () => {
    expect(moveCourseUnitPlannedPeriod(row, `${ROOT}/2099/1/0`, p2, index)).toBeNull()
  })
})

describe('applyPlannedPeriodMove', () => {
  const p1 = `${ROOT}/2025/0/1`
  const p2 = `${ROOT}/2025/0/2`
  const plan = studyPlan([selection([p1])], 4)

  it('returns same_slot when source and target match', () => {
    const r = applyPlannedPeriodMove(plan, 0, p1, p1, index)
    expect(r).toEqual({ ok: false, reason: 'same_slot' })
  })

  it('bumps revision and updates row', () => {
    const r = applyPlannedPeriodMove(plan, 0, p1, p2, index)
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.plan.metadata.revision).toBe(5)
    expect(r.plan.courseUnitSelections[0].plannedPeriods).toEqual([p2])
    expect(plan.metadata.revision).toBe(4)
    expect(plan.courseUnitSelections[0].plannedPeriods).toEqual([p1])
  })

  it('returns invalid_index for out-of-range row', () => {
    const r = applyPlannedPeriodMove(plan, 99, p1, p2, index)
    expect(r).toEqual({ ok: false, reason: 'invalid_index' })
  })

  it('returns source_not_found when period not in row', () => {
    const r = applyPlannedPeriodMove(plan, 0, `${ROOT}/2026/1/0`, p2, index)
    expect(r).toEqual({ ok: false, reason: 'source_not_found' })
  })

  const fallI = `${ROOT}/2025/0/1`
  const fallII = `${ROOT}/2025/0/2`
  const springIII = `${ROOT}/2025/1/0`
  const springIV = `${ROOT}/2025/1/1`
  const springV = `${ROOT}/2025/1/2`

  it('moves a contiguous two-period run so the block shifts (Fall I+II → start at II → II + Spring III)', () => {
    const planMulti = studyPlan([selection([fallI, fallII])], 4)
    const r = applyPlannedPeriodMove(planMulti, 0, fallI, fallII, index, [fallI, fallII])
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.plan.courseUnitSelections[0].plannedPeriods).toEqual([fallII, springIII])
  })

  it('moves a contiguous run to another season (Fall I+II → Spring III starts III+IV)', () => {
    const planMulti = studyPlan([selection([fallI, fallII])], 4)
    const r = applyPlannedPeriodMove(planMulti, 0, fallI, springIII, index, [fallI, fallII])
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.plan.courseUnitSelections[0].plannedPeriods).toEqual([springIII, springIV])
  })

  it('moves Spring III+IV with start at IV to IV+V', () => {
    const planMulti = studyPlan([selection([springIII, springIV])], 4)
    const r = applyPlannedPeriodMove(planMulti, 0, springIII, springIV, index, [springIII, springIV])
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.plan.courseUnitSelections[0].plannedPeriods).toEqual([springIV, springV])
  })

  it('moves Spring IV+V to start at V → V + Summer (next slot after V in full academic chain)', () => {
    const springSummer = `${ROOT}/2025/1/3`
    const planMulti = studyPlan([selection([springIV, springV])], 4)
    const r = applyPlannedPeriodMove(planMulti, 0, springIV, springV, index, [springIV, springV])
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.plan.courseUnitSelections[0].plannedPeriods).toEqual([springV, springSummer])
  })

  it('moves Spring V+Summer to IV → IV+V (run is inferred when UI only sends anchor column V)', () => {
    const springSummer = `${ROOT}/2025/1/3`
    const planMulti = studyPlan([selection([springV, springSummer])], 4)
    const r = applyPlannedPeriodMove(planMulti, 0, springV, springIV, index)
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.plan.courseUnitSelections[0].plannedPeriods).toEqual([springIV, springV])
  })

  it('falls back to plan-derived run when explicit connected list is invalid', () => {
    const planMulti = studyPlan([selection([springIV, springV])], 4)
    const row = planMulti.courseUnitSelections[0]!
    const run = resolveTimelineMoveRun(row, springIV, [springIV, springIV], index)
    expect(run).toEqual([springIV, springV])
    const r = applyPlannedPeriodMove(planMulti, 0, springIV, springIII, index, [springIV, springIV])
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.plan.courseUnitSelections[0].plannedPeriods).toEqual([springIII, springIV])
  })

  it('moves IV+V+Summer to III when UI only lists IV+V (extends explicit run with Summer)', () => {
    const springSummer = `${ROOT}/2025/1/3`
    const planMulti = studyPlan([selection([springIV, springV, springSummer])], 4)
    const row = planMulti.courseUnitSelections[0]!
    expect(resolveTimelineMoveRun(row, springIV, [springIV, springV], index)).toEqual([
      springIV,
      springV,
      springSummer,
    ])
    const r = applyPlannedPeriodMove(planMulti, 0, springIV, springIII, index, [springIV, springV])
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.plan.courseUnitSelections[0].plannedPeriods).toEqual([springIII, springIV, springV])
  })

  it('moves Spring IV+V to V → V+Summer even when summer is hidden from grid columns', () => {
    const springSummer = `${ROOT}/2025/1/3`
    const planMulti = studyPlan([selection([springIV, springV])], 4)
    const r = applyPlannedPeriodMove(
      planMulti,
      0,
      springIV,
      springV,
      indexGridWithoutSummer,
      [springIV, springV]
    )
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.plan.courseUnitSelections[0].plannedPeriods).toEqual([springV, springSummer])
  })
})

describe('applyPlannedPeriodAdd', () => {
  const p1 = `${ROOT}/2025/0/1`
  const p2 = `${ROOT}/2025/0/2`

  it('adds first planned period and bumps revision', () => {
    const plan = studyPlan([selection([])], 4)
    const r = applyPlannedPeriodAdd(plan, 0, p1, index)
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.plan.metadata.revision).toBe(5)
    expect(r.plan.courseUnitSelections[0].plannedPeriods).toEqual([p1])
    expect(plan.metadata.revision).toBe(4)
    expect(plan.courseUnitSelections[0].plannedPeriods).toEqual([])
  })

  it('returns already_scheduled when row has periods', () => {
    const plan = studyPlan([selection([p1])], 4)
    const r = applyPlannedPeriodAdd(plan, 0, p2, index)
    expect(r).toEqual({ ok: false, reason: 'already_scheduled' })
  })

  it('returns invalid_index for out-of-range row', () => {
    const plan = studyPlan([selection([])], 4)
    const r = applyPlannedPeriodAdd(plan, 99, p1, index)
    expect(r).toEqual({ ok: false, reason: 'invalid_index' })
  })
})

describe('applyPlannedPeriodExtend', () => {
  const p1 = `${ROOT}/2025/0/1`
  const p2 = `${ROOT}/2025/0/2`

  it('adds a second period without removing the first', () => {
    const plan = studyPlan([selection([p1])], 4)
    const r = applyPlannedPeriodExtend(plan, 0, p1, p2, index)
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.plan.metadata.revision).toBe(5)
    expect(r.plan.courseUnitSelections[0].plannedPeriods).toEqual([p1, p2])
  })

  it('returns same_slot when source and target match', () => {
    const plan = studyPlan([selection([p1])], 4)
    const r = applyPlannedPeriodExtend(plan, 0, p1, p1, index)
    expect(r).toEqual({ ok: false, reason: 'same_slot' })
  })

  it('returns same_slot when target period is already present', () => {
    const plan = studyPlan([selection([p1, p2])], 4)
    const r = applyPlannedPeriodExtend(plan, 0, p1, p2, index)
    expect(r).toEqual({ ok: false, reason: 'same_slot' })
  })
})

describe('applyPlannedPeriodUnschedule', () => {
  const p1 = `${ROOT}/2025/0/1`
  const p2 = `${ROOT}/2025/0/2`

  it('removes one slot and leaves others', () => {
    const plan = studyPlan([selection([p1, p2])], 4)
    const r = applyPlannedPeriodUnschedule(plan, 0, p1, index)
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.plan.courseUnitSelections[0].plannedPeriods).toEqual([p2])
    expect(r.plan.metadata.revision).toBe(5)
  })

  it('unschedule last period yields empty array', () => {
    const plan = studyPlan([selection([p1])], 4)
    const r = applyPlannedPeriodUnschedule(plan, 0, p1, index)
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.plan.courseUnitSelections[0].plannedPeriods).toEqual([])
  })

  it('returns source_not_found when period not in row', () => {
    const plan = studyPlan([selection([p1])], 4)
    const r = applyPlannedPeriodUnschedule(plan, 0, `${ROOT}/2099/1/0`, index)
    expect(r).toEqual({ ok: false, reason: 'source_not_found' })
  })
})
