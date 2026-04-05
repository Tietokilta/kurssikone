import {
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
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
import { applyPlannedPeriodAdd, applyPlannedPeriodMove } from '../utils/planPeriodDrag'
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
      parsedPlannedPeriods: parseCourseUnitPlannedPeriods(
        s.courseUnitId,
        s.plannedPeriods,
        periodIndex
      ),
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

function UnscheduledCourseDragPreview({ selection: s }: { selection: ParsedCourseUnitSelection }) {
  return (
    <div className="box-border flex h-full min-h-0 w-full min-w-0 cursor-grabbing touch-none bg-gray-300 shadow-lg ring-1 ring-neutral-900/15 text-sm">
      <div className="flex w-12 shrink-0 flex-col items-center justify-center bg-blue-500 py-2 px-1 text-center text-white">
        <i>{s.plannedCredits.toFixed(1)}</i>
        {s.creditsMax === s.creditsMin ? s.creditsMax : `${s.creditsMin}–${s.creditsMax}`}
      </div>
      <div className="min-w-0 flex-1 p-2">{s.name}</div>
    </div>
  )
}

function UnscheduledCourseItem({ selection: s }: { selection: ParsedCourseUnitSelection }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `unscheduled-${s.selectionIndex}`,
    data: { selectionIndex: s.selectionIndex, fromUnscheduled: true as const },
  })

  const style = {
    minHeight: s.plannedCredits * 20,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`box-border flex w-full min-w-0 touch-none bg-gray-300 ${
        isDragging ? 'cursor-grabbing opacity-0' : 'cursor-grab'
      }`}
      {...listeners}
      {...attributes}
    >
      <div className="flex w-12 shrink-0 flex-col items-center justify-center bg-blue-500 py-2 px-1 text-center text-white">
        <i>{s.plannedCredits.toFixed(1)}</i>
        {s.creditsMax === s.creditsMin ? s.creditsMax : `${s.creditsMin}–${s.creditsMax}`}
      </div>
      <div className="min-w-0 flex-1 p-2">{s.name}</div>
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
  const [showPastPeriods, setShowPastPeriods] = useState(false)
  const [unscheduledSidebarOpen, setUnscheduledSidebarOpen] = useState(false)
  const [unscheduledDragPreview, setUnscheduledDragPreview] =
    useState<ParsedCourseUnitSelection | null>(null)

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
        ? buildTimelineCards(timelineRows, undefined, {
            showSummer,
            periodIndex,
            showPastPeriods,
          })
        : [],
    [timelineRows, showSummer, periodIndex, showPastPeriods]
  )

  const sisuRootId = useMemo(
    () => fullPlan?.rootId?.trim() || extractSisuRootId(plannedSelections ?? []),
    [fullPlan, plannedSelections]
  )

  const completedCourseIds = useMemo(
    () => new Set(completedSelections.map((s) => s.id)),
    [completedSelections]
  )

  const unscheduledSelections = useMemo(() => {
    if (!plannedSelections) {
      return []
    }
    return plannedSelections
      .filter(
        (s) =>
          s.selectionIndex >= 0 &&
          !s.completed &&
          !completedCourseIds.has(s.id) &&
          s.rawData.plannedPeriods.length === 0
      )
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }, [plannedSelections, completedCourseIds])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (event.active.data.current?.fromUnscheduled === true) {
        const idx = event.active.data.current.selectionIndex
        if (typeof idx === 'number') {
          const sel = plannedSelections?.find((s) => s.selectionIndex === idx)
          setUnscheduledDragPreview(sel ?? null)
        }
      }
    },
    [plannedSelections]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setUnscheduledDragPreview(null)
      const { active, over } = event
      if (!over || !fullPlan) {
        return
      }
      const selectionIndex = active.data.current?.selectionIndex
      const targetPlannedPeriod = over.data.current?.plannedPeriod
      if (
        typeof selectionIndex !== 'number' ||
        selectionIndex < 0 ||
        typeof targetPlannedPeriod !== 'string' ||
        !targetPlannedPeriod.trim()
      ) {
        return
      }

      if (!periodIndex) {
        return
      }

      const fromUnscheduled = active.data.current?.fromUnscheduled === true

      const applied = fromUnscheduled
        ? applyPlannedPeriodAdd(fullPlan, selectionIndex, targetPlannedPeriod, periodIndex)
        : (() => {
            const startPlannedPeriod = active.data.current?.sourcePlannedPeriod
            if (typeof startPlannedPeriod !== 'string') {
              return null
            }
            return applyPlannedPeriodMove(
              fullPlan,
              selectionIndex,
              startPlannedPeriod,
              targetPlannedPeriod,
              periodIndex
            )
          })()

      if (applied === null) {
        return
      }

      if (!applied.ok) {
        if (applied.reason === 'same_slot') {
          return
        }
        if (applied.reason === 'source_not_found') {
          setSaveError('Could not update plan (source period not found).')
        } else if (applied.reason === 'already_scheduled') {
          setSaveError('Could not schedule (course already has a planned period).')
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
          message: plansResult.error === 'fetch_failed' ? plansResult.message : undefined,
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

      const studyYearsResult = await fetchStudyYears(DEFAULT_SISU_ROOT_ID, firstYear)
      if (cancelled) return

      if (studyYearsResult.ok) {
        setStudyYears(studyYearsResult.data)
      } else {
        console.warn('[Kurssikompassi/Timeline]', 'Study years fetch failed', {
          error: studyYearsResult.error,
          message: studyYearsResult.error === 'fetch_failed' ? studyYearsResult.message : undefined,
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

      <div className="flex shrink-0 flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-700">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="size-4 rounded border-neutral-300"
            checked={showPastPeriods}
            onChange={(e) => setShowPastPeriods(e.target.checked)}
          />
          Show past periods
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="size-4 rounded border-neutral-300"
            checked={showSummer}
            onChange={(e) => setShowSummer(e.target.checked)}
          />
          Show summer periods
        </label>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {unscheduledSelections.length > 0 && (
          <aside
            className={`fixed left-0 z-1000 flex flex-col overflow-hidden bg-white shadow-lg transition-[width,top,transform,border-radius] duration-300 ease-out ${
              unscheduledSidebarOpen
                ? 'top-0 h-dvh w-64 translate-y-0 rounded-none border-r border-neutral-200'
                : 'top-1/2 h-auto -translate-y-1/2 rounded-r-lg border border-neutral-200 border-l-0'
            }`}
          >
            {unscheduledSidebarOpen ? (
              <div className="kurssikompassi-unscheduled-open flex min-h-0 min-w-64 flex-1 flex-col">
                <div className="flex shrink-0 items-center justify-between gap-1 border-b border-neutral-100 px-2 py-2">
                  <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">
                    Unscheduled
                  </h2>

                  <button
                    type="button"
                    className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded border border-neutral-200 bg-white text-base leading-none text-neutral-600 hover:bg-neutral-50"
                    onClick={() => setUnscheduledSidebarOpen(false)}
                    aria-expanded
                    aria-controls="kurssikompassi-unscheduled-panel"
                    aria-label="Collapse unscheduled courses panel"
                  >
                    <span aria-hidden>‹</span>
                  </button>
                </div>
                <div
                  id="kurssikompassi-unscheduled-panel"
                  className="flex min-h-0 flex-1 flex-col px-3 pt-2 pb-3"
                >
                  <p className="mb-2 shrink-0 text-xs text-neutral-500">
                    Drag a course onto a period column.
                  </p>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {unscheduledSelections.length === 0 ? (
                      <p className="text-sm text-neutral-400">None</p>
                    ) : (
                      <ul className="flex flex-col gap-1 text-sm">
                        {unscheduledSelections.map((s) => (
                          <UnscheduledCourseItem key={s.selectionIndex} selection={s} />
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="flex w-full min-w-0 items-stretch overflow-hidden rounded-r-lg bg-neutral-50 text-lg leading-none text-neutral-700 hover:bg-neutral-100"
                onClick={() => setUnscheduledSidebarOpen(true)}
                aria-expanded={false}
                aria-controls="kurssikompassi-unscheduled-panel"
                aria-label="Expand unscheduled courses panel"
              >
                <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 py-6 px-1">
                  <span className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase [writing-mode:vertical-rl]">
                    Unscheduled
                  </span>
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                    {unscheduledSelections.length}
                  </span>
                </div>

                <div className="flex w-6 shrink-0 items-center justify-center border-l border-neutral-100">
                  <span aria-hidden>›</span>
                </div>
              </button>
            )}
          </aside>
        )}

        <div
          className={`min-h-[70vh] min-w-0 flex flex-col space-y-3 transition-[padding-left] duration-300 ease-out ${
            unscheduledSidebarOpen ? 'pl-48 2xl:pl-0' : 'pl-0'
          }`}
        >
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
        </div>
        <DragOverlay adjustScale={false} dropAnimation={null} zIndex={11000}>
          {unscheduledDragPreview ? (
            <UnscheduledCourseDragPreview selection={unscheduledDragPreview} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export default TimelinePage
