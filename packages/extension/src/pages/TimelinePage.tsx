import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAttainments,
  fetchStudyPlans,
  fetchStudyYears,
  getCoursesByIds,
  updateStudyPlan,
} from '../requestHandlers'
import { applyPlannedPeriodMove } from '../utils/planPeriodDrag'
import {
  buildTimelineCards,
  formatPlannedPeriodForSlot,
  parseCourseUnitPlannedPeriods,
  type ParsedPlannedPeriod,
  type StudyPeriodIndex,
  type TimelineCard,
  type TimelinePeriod,
} from '../utils/parsePlannedPeriods'
import {
  defaultFirstStudyYearWhenNoAttainments,
  firstStudyYearFromAttainmentDates,
} from '../utils/inferSisuFirstStudyYear'
import { createPeriodIndex, findPeriodByDate } from '../utils/studyYearPeriods'
import type {
  SisuAssessmentItemAttainment,
  SisuAttainment,
  SisuCourseUnitAttainment,
  SisuCourseUnitSelection,
  SisuStudyPlan,
  SisuStudyYear,
} from '../utils/types'
import { Course } from '@kurssikompassi/shared/src/types'
import TimelinePeriodCourseItem from './TimelinePeriodCourseItem'

type Props = {
  planId: string
}

export type ParsedCourseUnitSelection = {
  id: string
  name: string
  creditsMin: number
  creditsMax: number
  plannedCredits: number
  parsedPlannedPeriods: (ParsedPlannedPeriod | null)[]
  rawData: SisuCourseUnitSelection
  /** Index into `SisuStudyPlan.courseUnitSelections` for PUT updates; `-1` for completed-only rows. */
  selectionIndex: number
  completed?: boolean
}

const DEFAULT_SISU_ROOT_ID = 'aalto-university-root-id'

function extractSisuRootId(selections: ParsedCourseUnitSelection[]): string {
  for (const s of selections) {
    for (const p of s.rawData.plannedPeriods) {
      const root = p.split('/')[0]
      if (root) {
        return root
      }
    }
  }
  return DEFAULT_SISU_ROOT_ID
}

function emptySelectionRow(courseUnitId: string): SisuCourseUnitSelection {
  return {
    courseUnitId,
    parentModuleId: '',
    completionMethodId: null,
    substitutedBy: [],
    substituteFor: [],
    plannedPeriods: [],
    gradeRaiseAttempt: null,
  }
}

function buildParsedCourseUnitSelections(
  selections: SisuCourseUnitSelection[],
  courseData: Record<string, Course>,
  periodIndex: StudyPeriodIndex | null
): ParsedCourseUnitSelection[] {
  return selections.map((s, selectionIndex) => {
    const course = courseData[s.courseUnitId]

    const name =
      (course?.nameEn && course.nameEn.trim()) ||
      (course?.nameFi && course.nameFi.trim()) ||
      course?.code ||
      s.courseUnitId

    const creditsMin = course?.creditsMin || 0
    const creditsMax = course?.creditsMax || 0
    const plannedCredits =
      creditsMax === creditsMin ? creditsMax : Math.round((creditsMax + creditsMin) / 2)

    return {
      id: s.courseUnitId,
      name,
      creditsMin,
      creditsMax,
      plannedCredits,
      parsedPlannedPeriods: parseCourseUnitPlannedPeriods(s.courseUnitId, s.plannedPeriods, periodIndex),
      rawData: s,
      selectionIndex,
    }
  })
}

function buildCompletedSelections(
  attainments: SisuAttainment[],
  periodIndex: StudyPeriodIndex | null,
  courseData: Record<string, Course>
): ParsedCourseUnitSelection[] {
  if (!periodIndex) {
    return []
  }
  const best = new Map<string, SisuCourseUnitAttainment | SisuAssessmentItemAttainment>()
  for (const a of attainments) {
    if (a.type !== 'CourseUnitAttainment' && a.type !== 'AssessmentItemAttainment') {
      continue
    }
    const prev = best.get(a.courseUnitId)
    if (!prev || a.attainmentDate.localeCompare(prev.attainmentDate) < 0) {
      best.set(a.courseUnitId, a)
    }
  }

  const out: ParsedCourseUnitSelection[] = []
  for (const [, att] of best) {
    const slot = findPeriodByDate(periodIndex, att.attainmentDate)
    if (!slot) {
      continue
    }
    const course = courseData[att.courseUnitId]
    const name =
      (course?.nameEn && course.nameEn.trim()) ||
      (course?.nameFi && course.nameFi.trim()) ||
      course?.code ||
      att.courseUnitId
    const creditsMin = course?.creditsMin || att.credits || 0
    const creditsMax = course?.creditsMax || att.credits || 0
    const plannedCredits =
      creditsMax === creditsMin ? creditsMax : Math.round((creditsMax + creditsMin) / 2)

    out.push({
      id: att.courseUnitId,
      name,
      creditsMin,
      creditsMax,
      plannedCredits,
      parsedPlannedPeriods: [slot],
      rawData: emptySelectionRow(att.courseUnitId),
      selectionIndex: -1,
      completed: true,
    })
  }
  return out
}

function TimelinePeriodColumn({
  card,
  period: p,
  sisuRootId,
  periodIndex,
}: {
  card: TimelineCard<ParsedCourseUnitSelection>
  period: TimelinePeriod<ParsedCourseUnitSelection>
  sisuRootId: string
  periodIndex: StudyPeriodIndex | null
}) {
  const resolvedPlannedPeriod =
    p.plannedPeriod ||
    (periodIndex
      ? formatPlannedPeriodForSlot(sisuRootId, card.year, card.season, p.period, periodIndex)
      : '')

  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${p.periodKey}`,
    data: { plannedPeriod: resolvedPlannedPeriod },
  })

  return (
    <li
      ref={setNodeRef}
      className={`flex flex-col gap-3 text-sm ${isOver ? 'rounded bg-neutral-50 ring-1 ring-neutral-300' : ''}`}
    >
      <span className="w-14 shrink-0 text-neutral-500">{p.period}</span>

      <div className="min-h-8 min-w-0 flex-1 text-neutral-800">
        {p.selections.length === 0 ? (
          <span className="text-neutral-400">—</span>
        ) : (
          <ul className="flex flex-col gap-1">
            {p.selections.map((s) => (
              <TimelinePeriodCourseItem
                key={`${s.id}-${p.periodKey}-${s.completed ? 'c' : 'p'}`}
                selection={s}
                periodKey={p.periodKey}
                sourcePlannedPeriod={resolvedPlannedPeriod}
                completed={s.completed}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

const TimelinePage = ({ planId }: Props) => {
  const [fullPlan, setFullPlan] = useState<SisuStudyPlan | null>(null)
  const [courseData, setCourseData] = useState<Record<string, Course>>({})
  const [studyYears, setStudyYears] = useState<SisuStudyYear[] | null>(null)
  const [attainments, setAttainments] = useState<SisuAttainment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [studyYearsWarning, setStudyYearsWarning] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showSummer, setShowSummer] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  /** Kori study-years are keyed by university root; `createPeriodIndex` must use the same org id. */
  const studyYearsOrgId = DEFAULT_SISU_ROOT_ID

  const periodIndex = useMemo(() => {
    if (!studyYears?.length) {
      return null
    }
    return createPeriodIndex(studyYears, studyYearsOrgId, showSummer)
  }, [studyYears, studyYearsOrgId, showSummer])

  const plannedSelections = useMemo(() => {
    if (!fullPlan) {
      return null
    }
    return buildParsedCourseUnitSelections(fullPlan.courseUnitSelections, courseData, periodIndex)
  }, [fullPlan, courseData, periodIndex])

  const completedSelections = useMemo(
    () => buildCompletedSelections(attainments, periodIndex, courseData),
    [attainments, periodIndex, courseData]
  )

  const timelineRows = useMemo(() => {
    if (!plannedSelections) {
      return null
    }
    return [...plannedSelections, ...completedSelections]
  }, [plannedSelections, completedSelections])

  const timelineCards = useMemo(
    () =>
      timelineRows
        ? buildTimelineCards(timelineRows, undefined, { showSummer, periodIndex })
        : [],
    [timelineRows, showSummer, periodIndex]
  )

  const sisuRootId = useMemo(
    () => fullPlan?.rootId?.trim() || extractSisuRootId(plannedSelections ?? []),
    [fullPlan, plannedSelections]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || !fullPlan) {
        return
      }
      const selectionIndex = active.data.current?.selectionIndex
      const startPlannedPeriod = active.data.current?.sourcePlannedPeriod
      const targetPlannedPeriod = over.data.current?.plannedPeriod
      if (
        typeof selectionIndex !== 'number' ||
        selectionIndex < 0 ||
        typeof startPlannedPeriod !== 'string' ||
        typeof targetPlannedPeriod !== 'string'
      ) {
        return
      }

      if (!periodIndex) {
        return
      }

      const applied = applyPlannedPeriodMove(
        fullPlan,
        selectionIndex,
        startPlannedPeriod,
        targetPlannedPeriod,
        periodIndex
      )

      if (!applied.ok) {
        if (applied.reason === 'same_slot') {
          return
        }
        if (applied.reason === 'source_not_found') {
          setSaveError('Could not update plan (source period not found).')
        } else {
          setSaveError('Could not update plan.')
        }
        return
      }

      setSaveError(null)
      setIsSaving(true)
      const result = await updateStudyPlan(planId, applied.plan)
      setIsSaving(false)

      if (!result.ok) {
        if (result.error === 'no_sisu_token') {
          setSaveError('Could not get Sisu auth')
        } else {
          const statusPart = result.status != null ? ` (${result.status})` : ''
          const raw = result.message ?? ''
          const detail = raw.length > 200 ? `${raw.slice(0, 200)}…` : raw
          setSaveError(detail ? `Save failed${statusPart}: ${detail}` : `Save failed${statusPart}`)
        }
        return
      }

      setFullPlan(applied.plan)
    },
    [fullPlan, planId, periodIndex]
  )

  useEffect(() => {
    let cancelled = false

    if (!planId) {
      setError('Could not read plan id from URL')
      setFullPlan(null)
      setCourseData({})
      setStudyYears(null)
      setAttainments([])
      return
    }

    setError(null)
    setStudyYearsWarning(null)
    setSaveError(null)
    setFullPlan(null)
    setCourseData({})
    setStudyYears(null)
    setAttainments([])

    void (async () => {
      const plansResult = await fetchStudyPlans()
      if (cancelled) return

      if (!plansResult.ok) {
        console.error('[Kurssikompassi/Timeline]', 'Study plans fetch failed', {
          error: plansResult.error,
          message:
            plansResult.error === 'fetch_failed' ? plansResult.message : undefined,
        })
        if (plansResult.error === 'no_sisu_token') {
          setError('Could not get Sisu auth')
        } else {
          setError(plansResult.message ?? 'Failed to load study plans')
        }
        return
      }

      const plan = plansResult.data.find((p) => p.id === planId)
      if (!plan) {
        setError('Plan not found')
        return
      }

      const selections = plan.courseUnitSelections
      const plannedIds = [...new Set(selections.map((s) => s.courseUnitId))]

      const attainmentsResult = await fetchAttainments(plan.userId)
      if (cancelled) return

      if (!attainmentsResult.ok) {
        console.warn('[Kurssikompassi/Timeline]', 'Attainments fetch failed', {
          error: attainmentsResult.error,
          message:
            attainmentsResult.error === 'fetch_failed' ? attainmentsResult.message : undefined,
        })
      }
      const attData = attainmentsResult.ok ? attainmentsResult.data : []
      setAttainments(attData)

      const fromAtt = firstStudyYearFromAttainmentDates(attData)
      const firstYear = fromAtt ?? defaultFirstStudyYearWhenNoAttainments()

      const studyYearsResult = await fetchStudyYears(
        DEFAULT_SISU_ROOT_ID,
        firstYear,
        plan.curriculumPeriodId
      )
      if (cancelled) return

      if (studyYearsResult.ok) {
        setStudyYears(studyYearsResult.data)
      } else {
        console.warn('[Kurssikompassi/Timeline]', 'Study years fetch failed', {
          error: studyYearsResult.error,
          message:
            studyYearsResult.error === 'fetch_failed' ? studyYearsResult.message : undefined,
          organisationId: DEFAULT_SISU_ROOT_ID,
          firstYear,
        })
        setStudyYears(null)
        setStudyYearsWarning(
          studyYearsResult.error === 'no_sisu_token'
            ? 'Study years unavailable (no Sisu auth)'
            : studyYearsResult.error === 'fetch_failed' && studyYearsResult.message
              ? `Study years unavailable: ${studyYearsResult.message}`
              : 'Study years unavailable'
        )
      }

      const attainmentCourseIds = new Set<string>()
      for (const a of attData) {
        if (a.type === 'CourseUnitAttainment') {
          attainmentCourseIds.add(a.courseUnitId)
        } else if (a.type === 'AssessmentItemAttainment') {
          attainmentCourseIds.add(a.courseUnitId)
        }
      }

      const allIds = [...new Set([...plannedIds, ...attainmentCourseIds])]
      const courses = await getCoursesByIds(allIds)
      if (cancelled) return

      const nextCourseData: Record<string, Course> = {}
      for (const c of courses) {
        nextCourseData[c.id] = c
      }

      setFullPlan(plan)
      setCourseData(nextCourseData)
    })()

    return () => {
      cancelled = true
    }
  }, [planId])

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>
  }

  if (timelineRows === null) {
    return <div className="p-4 text-neutral-600">Loading…</div>
  }

  return (
    <div className="space-y-3 p-3">
      {isSaving ? <div className="text-sm text-neutral-600">Saving plan…</div> : null}
      {saveError ? <div className="text-sm text-red-600">{saveError}</div> : null}
      {studyYearsWarning ? <div className="text-sm text-amber-700">{studyYearsWarning}</div> : null}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          className="size-4 rounded border-neutral-300"
          checked={showSummer}
          onChange={(e) => setShowSummer(e.target.checked)}
        />
        Show summer periods
      </label>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {timelineCards.map((card) => (
          <section
            key={card.cardKey}
            className="rounded border border-neutral-200 bg-white p-3 shadow-sm"
          >
            <h2 className="mb-2 text-sm font-medium text-neutral-900">
              {card.season} {card.year}
            </h2>

            <ul
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${card.periods.length}, minmax(0, 1fr))` }}
            >
              {card.periods.map((p) => (
                <TimelinePeriodColumn
                  key={p.periodKey}
                  card={card}
                  period={p}
                  sisuRootId={sisuRootId}
                  periodIndex={periodIndex}
                />
              ))}
            </ul>
          </section>
        ))}
      </DndContext>
    </div>
  )
}

export default TimelinePage
