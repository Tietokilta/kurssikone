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
import { initSisuAuth, updateStudyPlan } from '../requestHandlers'
import { buildTimelineCards, type ParsedPlannedPeriod } from '../utils/parsePlannedPeriods'
import { createPeriodIndex } from '../utils/studyYearPeriods'
import {
  buildCompletedSelections,
  buildParsedCourseUnitSelections,
  DEFAULT_SISU_ROOT_ID,
  extractSisuRootId,
} from '../utils/timelinePageData'
import {
  getTimelineDragRowSnapshot,
  getUnscheduledSelections,
  mapApplyFailureToSaveError,
  resolveDragStartState,
  resolveTimelineDrop,
} from '../utils/timelinePageLogic'
import { loadTimelineData } from '../utils/timelinePageLoad'
import type {
  SisuAttainment,
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

const timelineCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args)
  return pointerHits.length > 0 ? pointerHits : rectIntersection(args)
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
  const [isErrorBannerVisible, setIsErrorBannerVisible] = useState(false)
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

  const unscheduledSelections = useMemo(
    () => getUnscheduledSelections(plannedSelections, completedSelections),
    [plannedSelections, completedSelections]
  )

  const timelineDragRowSnapshot = useMemo(
    (): TimelineDragRowSnapshot | null =>
      getTimelineDragRowSnapshot(activeDragKind, activeDragSelectionIndex, fullPlan),
    [activeDragKind, activeDragSelectionIndex, fullPlan]
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const resolved = resolveDragStartState(
        event.active.data.current as Record<string, unknown> | undefined,
        plannedSelections
      )
      setActiveDragKind(resolved.kind)
      setActiveDragSelectionIndex(resolved.selectionIndex)
      setUnscheduledDragPreview(resolved.unscheduledPreview)
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

      const applied = resolveTimelineDrop({
        fullPlan,
        periodIndex,
        selectionIndex,
        activeData: active.data.current as Record<string, unknown> | undefined,
        overData: over.data.current as
          | { plannedPeriod?: string; action?: 'move' | 'extend' | 'unschedule' }
          | undefined,
      })

      if (applied === null) {
        return
      }

      if (!applied.ok) {
        const message = mapApplyFailureToSaveError(applied.reason)
        if (!message) {
          return
        }
        setSaveError(message)
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
      const authInit = await initSisuAuth()
      if (!authInit.ok) {
        console.warn('[Kurssikompassi/Timeline]', 'Initial Sisu preauth failed; continuing with lazy refresh')
      }
      const loaded = await loadTimelineData(planId)
      if (cancelled) return
      if (!loaded.ok) {
        setError(loaded.error)
        return
      }
      setAttainments(loaded.attainments)
      setStudyYears(loaded.studyYears)
      setStudyYearsWarning(loaded.studyYearsWarning)
      setFullPlan(loaded.plan)
      setCourseData(loaded.courseData)
    })()

    return () => {
      cancelled = true
    }
  }, [planId])

  const errorBannerMessage = saveError ?? error

  useEffect(() => {
    if (errorBannerMessage) {
      setIsErrorBannerVisible(true)
    }
  }, [errorBannerMessage])

  if (timelineRows === null && !error) {
    return <div className="p-4 text-neutral-600">Loading…</div>
  }

  return (
    <div className="space-y-3 p-3">
      {isSaving ? <div className="text-sm text-neutral-600">Saving plan…</div> : null}
      {studyYearsWarning ? <div className="text-sm text-amber-700">{studyYearsWarning}</div> : null}

      {error ? (
        <div className="text-sm text-neutral-600">Timeline unavailable.</div>
      ) : (
        <>
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
        </>
      )}

      {errorBannerMessage && isErrorBannerVisible ? (
        <div className="kurssikompassi-error-banner-in fixed right-4 bottom-4 z-12000 w-[24rem] max-w-[calc(100vw-2rem)] rounded-lg border-2 border-red-300 bg-red-700 px-4 py-3 text-base text-white shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 leading-6">{errorBannerMessage}</div>
            <button
              type="button"
              className="shrink-0 rounded border border-red-200/70 px-2 py-1 text-sm leading-none font-semibold text-white/95 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-100"
              onClick={() => setIsErrorBannerVisible(false)}
              aria-label="Dismiss error notification"
              title="Dismiss"
            >
              X
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default TimelinePage
