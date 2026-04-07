import {
  DndContext,
  DragOverlay,
  PointerSensor,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  pointerWithin,
  rectIntersection,
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
import {
  applyPlannedPeriodAdd,
  applyPlannedPeriodExtend,
  applyPlannedPeriodMove,
  applyPlannedPeriodUnschedule,
} from '../utils/planPeriodDrag'
import {
  buildTimelineCards,
  parseCourseUnitPlannedPeriods,
  type ParsedPlannedPeriod,
  type StudyPeriodIndex,
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
import TimelineCourseCard from './components/TimelineCourseCard'
import { IconUnschedule } from './components/TimelineIcons'
import TimelineCardSection, {
  type TimelineActiveDragKind,
  type TimelineDragRowSnapshot,
} from './components/TimelineCardSection'
import TimelineDropStrip from './components/TimelineDropStrip'
import TimelineToolbar from './components/TimelineToolbar'
import UnscheduledSidebar from './components/UnscheduledSidebar'

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

const timelineCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args)
  return pointerHits.length > 0 ? pointerHits : rectIntersection(args)
}

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

function UnscheduledCourseDragPreview({ selection: s }: { selection: ParsedCourseUnitSelection }) {
  return (
    <TimelineCourseCard
      name={s.name}
      plannedCredits={s.plannedCredits}
      creditsMin={s.creditsMin}
      creditsMax={s.creditsMax}
      variant="dragPreview"
    />
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
  const [activeDragKind, setActiveDragKind] = useState<TimelineActiveDragKind>('none')
  const [activeDragSelectionIndex, setActiveDragSelectionIndex] = useState<number | null>(null)

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

  const timelineDragRowSnapshot = useMemo((): TimelineDragRowSnapshot | null => {
    if (activeDragKind === 'none' || activeDragSelectionIndex === null || !fullPlan) {
      return null
    }
    const row = fullPlan.courseUnitSelections[activeDragSelectionIndex]
    if (!row) {
      return null
    }
    return { courseUnitId: row.courseUnitId, plannedPeriods: row.plannedPeriods }
  }, [activeDragKind, activeDragSelectionIndex, fullPlan])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const d = event.active.data.current
      const idx = d?.selectionIndex
      const selIdx = typeof idx === 'number' && idx >= 0 ? idx : null

      if (d?.fromUnscheduled === true) {
        setActiveDragKind('unscheduled')
        setActiveDragSelectionIndex(selIdx)
        if (typeof idx === 'number') {
          const sel = plannedSelections?.find((s) => s.selectionIndex === idx)
          setUnscheduledDragPreview(sel ?? null)
        }
      } else if (typeof d?.sourcePlannedPeriod === 'string' && d.sourcePlannedPeriod.trim()) {
        setActiveDragKind('scheduled')
        setActiveDragSelectionIndex(selIdx)
      } else {
        setActiveDragKind('none')
        setActiveDragSelectionIndex(null)
      }
    },
    [plannedSelections]
  )

  const handleDragCancel = useCallback(() => {
    setActiveDragKind('none')
    setActiveDragSelectionIndex(null)
    setUnscheduledDragPreview(null)
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDragKind('none')
      setActiveDragSelectionIndex(null)
      setUnscheduledDragPreview(null)
      const { active, over } = event
      if (!fullPlan || !periodIndex) {
        return
      }
      if (!over) {
        return
      }

      const selectionIndex = active.data.current?.selectionIndex
      if (typeof selectionIndex !== 'number' || selectionIndex < 0) {
        return
      }

      const fromUnscheduled = active.data.current?.fromUnscheduled === true
      const overData = over.data.current as
        | { plannedPeriod?: string; action?: 'move' | 'extend' | 'unschedule' }
        | undefined
      const dropAction = overData?.action ?? 'move'
      const targetPlannedPeriod = overData?.plannedPeriod

      type Applied =
        | ReturnType<typeof applyPlannedPeriodAdd>
        | ReturnType<typeof applyPlannedPeriodMove>
        | ReturnType<typeof applyPlannedPeriodExtend>
        | ReturnType<typeof applyPlannedPeriodUnschedule>

      let applied: Applied | null = null

      if (dropAction === 'unschedule') {
        if (fromUnscheduled) {
          return
        }
        const startPlannedPeriod = active.data.current?.sourcePlannedPeriod
        if (typeof startPlannedPeriod !== 'string' || !startPlannedPeriod.trim()) {
          return
        }
        applied = applyPlannedPeriodUnschedule(
          fullPlan,
          selectionIndex,
          startPlannedPeriod,
          periodIndex
        )
      } else if (dropAction === 'extend') {
        if (fromUnscheduled) {
          return
        }
        const startPlannedPeriod = active.data.current?.sourcePlannedPeriod
        if (typeof startPlannedPeriod !== 'string' || !startPlannedPeriod.trim()) {
          return
        }
        if (typeof targetPlannedPeriod !== 'string' || !targetPlannedPeriod.trim()) {
          return
        }
        applied = applyPlannedPeriodExtend(
          fullPlan,
          selectionIndex,
          startPlannedPeriod,
          targetPlannedPeriod,
          periodIndex
        )
      } else {
        if (typeof targetPlannedPeriod !== 'string' || !targetPlannedPeriod.trim()) {
          return
        }
        applied = fromUnscheduled
          ? applyPlannedPeriodAdd(fullPlan, selectionIndex, targetPlannedPeriod, periodIndex)
          : (() => {
              const startPlannedPeriod = active.data.current?.sourcePlannedPeriod
              if (typeof startPlannedPeriod !== 'string' || !startPlannedPeriod.trim()) {
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
      }

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
        } else if (applied.reason === 'invalid_index') {
          setSaveError('Could not update plan.')
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

      <TimelineToolbar
        showPastPeriods={showPastPeriods}
        setShowPastPeriods={setShowPastPeriods}
        showSummer={showSummer}
        setShowSummer={setShowSummer}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={timelineCollisionDetection}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="relative min-h-dvh">
          <UnscheduledSidebar
            open={unscheduledSidebarOpen}
            setOpen={setUnscheduledSidebarOpen}
            selections={unscheduledSelections}
          />

          <div
            className={`relative z-20 min-h-dvh min-w-0 flex flex-col space-y-3 transition-[padding-left] duration-300 ease-out ${
              unscheduledSidebarOpen ? 'pl-48 2xl:pl-0' : 'pl-0'
            }`}
          >
            {timelineCards.map((card) => (
              <TimelineCardSection
                key={card.cardKey}
                card={card}
                sisuRootId={sisuRootId}
                periodIndex={periodIndex}
                activeDragKind={activeDragKind}
                dragRowSnapshot={timelineDragRowSnapshot}
              />
            ))}
          </div>
          {activeDragKind === 'scheduled' ? (
            <TimelineDropStrip
              id="timeline-unschedule"
              action="unschedule"
              label="Unschedule"
              icon={<IconUnschedule className="size-6 shrink-0 opacity-95" />}
            />
          ) : null}
          <DragOverlay adjustScale={false} dropAnimation={null} zIndex={11000}>
            {unscheduledDragPreview ? (
              <UnscheduledCourseDragPreview selection={unscheduledDragPreview} />
            ) : null}
          </DragOverlay>
        </div>
      </DndContext>
    </div>
  )
}

export default TimelinePage
