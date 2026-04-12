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
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { initSisuAuth, updateStudyPlan } from '../requestHandlers'
import type { TeachingPeriodQuickOption } from '../utils/parseKoriTeachingPeriods'
import {
  aggregateTimelineCreditsByCompletion,
  buildTimelineCards,
  computeSemesterCoursePlacements,
  formatPlannedPeriodForSlot,
  type ParsedPlannedPeriod,
} from '../utils/parsePlannedPeriods'
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
import { applyPlannedPeriodAddSpan, resolveTimelineMoveRun } from '../utils/planPeriodDrag'
import { loadTimelineData } from '../utils/timelinePageLoad'
import {
  applyPlannedCreditOverrides,
  creditChoiceIsUserSet,
  isVariableCreditRange,
  loadTimelineVariableCreditOverrides,
  setTimelineVariableCreditOverride,
} from '../utils/timelineVariableCredits'
import type {
  SisuAttainment,
  SisuCourseUnitSelection,
  SisuStudyPlan,
  SisuStudyYear,
} from '../utils/types'
import { Course } from '@kurssikompassi/shared/src/types'
import TimelineCourseCard from './components/TimelineCourseCard'
import TimelineMainGrid, {
  type TimelineInteractionKind,
  type TimelineDragRowSnapshot,
} from './components/TimelineCardSection'
import TimelineToolbar from './components/TimelineToolbar'
import UnscheduledSidebar from './components/UnscheduledSidebar'

type Props = {
  planId: string
}

export type ClickPlacementTarget =
  | { kind: 'single'; action: 'move' | 'extend'; plannedPeriod: string }
  | { kind: 'designated'; spanLocators: string[] }

export type ParsedCourseUnitSelection = {
  id: string
  name: string
  /** Course unit code from Kori / attainment (e.g. CS-C1000); may be empty if unknown. */
  code: string
  creditsMin: number
  creditsMax: number
  plannedCredits: number
  parsedPlannedPeriods: (ParsedPlannedPeriod | null)[]
  rawData: SisuCourseUnitSelection
  /** Index into `SisuStudyPlan.courseUnitSelections` for PUT updates; `-1` for completed-only rows. */
  selectionIndex: number
  completed?: boolean
  /** Display lines from Kori `additional` (e.g. `2023-2024 Autumn II`). */
  teachingPeriodLabels: string[]
  /** Resolved quick-schedule targets; locators null when not in loaded study years. */
  teachingPeriodQuickOptions: TeachingPeriodQuickOption[]
}

const timelineCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args)
  return pointerHits.length > 0 ? pointerHits : rectIntersection(args)
}

function UnscheduledCourseDragPreview({
  selection: s,
  creditUncertain,
}: {
  selection: ParsedCourseUnitSelection
  creditUncertain: boolean
}) {
  return (
    <TimelineCourseCard
      name={s.name}
      courseUnitId={s.id}
      courseCode={s.code}
      plannedCredits={s.plannedCredits}
      creditsMin={s.creditsMin}
      creditsMax={s.creditsMax}
      variant="dragPreview"
      creditUncertain={creditUncertain}
      teachingPeriodLines={s.teachingPeriodLabels}
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
  const [showEmptySummerPeriods, setShowEmptySummerPeriods] = useState(false)
  const [showPastPeriods, setShowPastPeriods] = useState(false)
  const [unscheduledSidebarOpen, setUnscheduledSidebarOpen] = useState(false)
  const [unscheduledDragPreview, setUnscheduledDragPreview] =
    useState<ParsedCourseUnitSelection | null>(null)
  const [interactionKind, setInteractionKind] = useState<TimelineInteractionKind>('none')
  const [activeSelectionIndex, setActiveSelectionIndex] = useState<number | null>(null)
  const [activeSourcePlannedPeriod, setActiveSourcePlannedPeriod] = useState<string | null>(null)
  /** Semester row (`TimelineCard.cardKey`) for click edit mode; keeps anchor in sync after partial unschedule. */
  const [activeEditCardKey, setActiveEditCardKey] = useState<string | null>(null)
  const [clickPlacementTarget, setClickPlacementTarget] = useState<ClickPlacementTarget | null>(
    null
  )
  /** Contiguous planned-period locators moved together (multi-column card); drives drop overlay rules. */
  const [activeMovingRun, setActiveMovingRun] = useState<string[] | null>(null)
  const [variableCreditOverrides, setVariableCreditOverrides] = useState<Record<string, number>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 20 },
    })
  )

  /** Kori study-years are keyed by university root; `createPeriodIndex` must use the same org id. */
  const studyYearsOrgId = DEFAULT_SISU_ROOT_ID

  /** Full grid (all summers); parsing does not depend on empty-summer visibility. */
  const periodIndexForParsing = useMemo(() => {
    if (!studyYears?.length) {
      return null
    }
    return createPeriodIndex(studyYears, studyYearsOrgId, true)
  }, [studyYears, studyYearsOrgId])

  const plannedSelectionsRaw = useMemo(() => {
    if (!fullPlan) {
      return null
    }
    return buildParsedCourseUnitSelections(
      fullPlan.courseUnitSelections,
      courseData,
      periodIndexForParsing
    )
  }, [fullPlan, courseData, periodIndexForParsing])

  const completedSelectionsRaw = useMemo(
    () => buildCompletedSelections(attainments, periodIndexForParsing, courseData),
    [attainments, periodIndexForParsing, courseData]
  )

  const plannedSelections = useMemo(
    () =>
      plannedSelectionsRaw
        ? applyPlannedCreditOverrides(plannedSelectionsRaw, variableCreditOverrides)
        : null,
    [plannedSelectionsRaw, variableCreditOverrides]
  )

  const completedSelections = useMemo(
    () => applyPlannedCreditOverrides(completedSelectionsRaw, variableCreditOverrides),
    [completedSelectionsRaw, variableCreditOverrides]
  )

  const summerCardKeysWithCourses = useMemo(() => {
    const keys = new Set<string>()
    if (!plannedSelectionsRaw) {
      return keys
    }
    for (const sel of plannedSelectionsRaw) {
      for (const p of sel.parsedPlannedPeriods) {
        if (p?.season === 'Summer') {
          keys.add(`${p.year}|Summer`)
        }
      }
    }
    for (const sel of completedSelectionsRaw) {
      for (const p of sel.parsedPlannedPeriods) {
        if (p?.season === 'Summer') {
          keys.add(`${p.year}|Summer`)
        }
      }
    }
    return keys
  }, [plannedSelectionsRaw, completedSelectionsRaw])

  const periodIndex = useMemo(() => {
    if (!studyYears?.length) {
      return null
    }
    return createPeriodIndex(
      studyYears,
      studyYearsOrgId,
      showEmptySummerPeriods,
      summerCardKeysWithCourses
    )
  }, [studyYears, studyYearsOrgId, showEmptySummerPeriods, summerCardKeysWithCourses])

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
            periodIndex,
            showPastPeriods,
          })
        : [],
    [timelineRows, periodIndex, showPastPeriods]
  )

  const sisuRootId = useMemo(
    () => fullPlan?.rootId?.trim() || extractSisuRootId(plannedSelectionsRaw ?? []),
    [fullPlan, plannedSelectionsRaw]
  )

  /** Full timeline range for totals; grid visibility still follows `showPastPeriods`. */
  const timelineCreditSummary = useMemo(() => {
    if (!timelineRows || !periodIndex) {
      return { completed: 0, planned: 0, total: 0 }
    }
    const cardsForTotals = buildTimelineCards(timelineRows, undefined, {
      periodIndex,
      showPastPeriods: true,
    })
    return aggregateTimelineCreditsByCompletion(cardsForTotals, sisuRootId, periodIndex)
  }, [timelineRows, periodIndex, sisuRootId])

  const unscheduledSelections = useMemo(
    () => getUnscheduledSelections(plannedSelections, completedSelections),
    [plannedSelections, completedSelections]
  )

  const timelineDragRowSnapshot = useMemo(
    (): TimelineDragRowSnapshot | null =>
      getTimelineDragRowSnapshot(interactionKind, activeSelectionIndex, fullPlan, activeMovingRun),
    [interactionKind, activeSelectionIndex, fullPlan, activeMovingRun]
  )

  const activeUnscheduledSelection = useMemo((): ParsedCourseUnitSelection | null => {
    if (activeSelectionIndex === null || !plannedSelections) {
      return null
    }
    if (interactionKind !== 'unscheduled' && interactionKind !== 'click-unscheduled') {
      return null
    }
    return plannedSelections.find((s) => s.selectionIndex === activeSelectionIndex) ?? null
  }, [interactionKind, activeSelectionIndex, plannedSelections])

  const handleVariableCreditChange = useCallback((courseId: string, credits: number) => {
    void setTimelineVariableCreditOverride(courseId, credits).then(setVariableCreditOverrides)
  }, [])

  const resetInteraction = useCallback(() => {
    setInteractionKind('none')
    setActiveSelectionIndex(null)
    setActiveSourcePlannedPeriod(null)
    setActiveEditCardKey(null)
    setClickPlacementTarget(null)
    setUnscheduledDragPreview(null)
    setActiveMovingRun(null)
  }, [])

  const applyDropAndPersist = useCallback(
    async (
      selectionIndex: number,
      activeData: Record<string, unknown> | undefined,
      overData:
        | {
            plannedPeriod?: string
            action?: 'move' | 'extend' | 'unschedule' | 'keep' | 'designated'
            spanLocators?: string[]
          }
        | undefined
    ): Promise<boolean> => {
      if (!fullPlan || !periodIndex) {
        return false
      }
      const applied = resolveTimelineDrop({
        fullPlan,
        periodIndex,
        selectionIndex,
        activeData,
        overData,
      })

      if (applied === null) {
        return false
      }

      if (!applied.ok) {
        const message = mapApplyFailureToSaveError(applied.reason)
        if (message) {
          setSaveError(message)
        }
        return false
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
        return false
      }

      setFullPlan(applied.plan)
      return true
    },
    [fullPlan, periodIndex, planId]
  )

  const handleQuickScheduleToSpan = useCallback(
    async (selectionIndex: number, locators: string[]) => {
      if (!fullPlan || !periodIndex) {
        return
      }
      setClickPlacementTarget({ kind: 'designated', spanLocators: locators })
      const applied = applyPlannedPeriodAddSpan(fullPlan, selectionIndex, locators, periodIndex)
      if (!applied.ok) {
        setClickPlacementTarget(null)
        const message = mapApplyFailureToSaveError(applied.reason)
        if (message) {
          setSaveError(message)
        }
        return
      }
      setSaveError(null)
      setIsSaving(true)
      const result = await updateStudyPlan(planId, applied.plan)
      setIsSaving(false)
      setClickPlacementTarget(null)
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
      resetInteraction()
    },
    [fullPlan, periodIndex, planId, resetInteraction]
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const resolved = resolveDragStartState(
        event.active.data.current as Record<string, unknown> | undefined,
        plannedSelections
      )
      setInteractionKind(resolved.kind)
      setActiveSelectionIndex(resolved.selectionIndex)
      setUnscheduledDragPreview(resolved.unscheduledPreview)

      const data = event.active.data.current as Record<string, unknown> | undefined
      const anchorRaw =
        typeof data?.sourcePlannedPeriod === 'string' ? data.sourcePlannedPeriod.trim() : ''
      let movingRun: string[] | null = null
      if (
        resolved.kind === 'scheduled' &&
        fullPlan &&
        periodIndex &&
        typeof resolved.selectionIndex === 'number' &&
        resolved.selectionIndex >= 0 &&
        anchorRaw
      ) {
        const row = fullPlan.courseUnitSelections[resolved.selectionIndex]
        const rawConnected = data?.connectedPlannedPeriods
        const connected =
          Array.isArray(rawConnected) && rawConnected.every((x) => typeof x === 'string')
            ? (rawConnected as string[]).map((s) => s.trim()).filter(Boolean)
            : null
        if (row) {
          const run = resolveTimelineMoveRun(
            row,
            anchorRaw,
            connected?.length ? connected : null,
            periodIndex
          )
          movingRun = run && run.length > 1 ? run : null
        }
      }
      setActiveMovingRun(movingRun)

      setActiveSourcePlannedPeriod(anchorRaw || null)
      setActiveEditCardKey(null)
      setClickPlacementTarget(null)
    },
    [plannedSelections, fullPlan, periodIndex]
  )

  const handleDragCancel = useCallback(() => {
    resetInteraction()
  }, [resetInteraction])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      resetInteraction()
      if (!over) {
        return
      }

      const selectionIndex = active.data.current?.selectionIndex
      if (typeof selectionIndex !== 'number' || selectionIndex < 0) {
        return
      }

      await applyDropAndPersist(
        selectionIndex,
        active.data.current as Record<string, unknown> | undefined,
        over.data.current as
          | {
              plannedPeriod?: string
              action?: 'move' | 'extend' | 'unschedule' | 'keep' | 'designated'
              spanLocators?: string[]
            }
          | undefined
      )
    },
    [applyDropAndPersist, resetInteraction]
  )

  const handleCardUnschedule = useCallback(
    async (selectionIndex: number, sourcePlannedPeriod: string) => {
      await applyDropAndPersist(
        selectionIndex,
        { selectionIndex, sourcePlannedPeriod },
        { action: 'unschedule' }
      )
    },
    [applyDropAndPersist]
  )

  const activateClickMoveMode = useCallback(
    (
      kind: 'click-scheduled' | 'click-unscheduled',
      selectionIndex: number,
      sourcePlannedPeriod: string | null,
      cardKey: string | null = null,
      connectedPlannedPeriods: string[] | null = null
    ) => {
      const isSameCard =
        interactionKind === kind &&
        activeSelectionIndex === selectionIndex &&
        (kind === 'click-unscheduled' ? activeSourcePlannedPeriod === sourcePlannedPeriod : true)
      if (isSameCard) {
        resetInteraction()
        return
      }
      setInteractionKind(kind)
      setActiveSelectionIndex(selectionIndex)
      setActiveSourcePlannedPeriod(sourcePlannedPeriod)
      setActiveEditCardKey(kind === 'click-scheduled' ? cardKey : null)
      setClickPlacementTarget(null)
      setUnscheduledDragPreview(null)
      setActiveMovingRun(
        kind === 'click-scheduled' && connectedPlannedPeriods && connectedPlannedPeriods.length > 1
          ? connectedPlannedPeriods
          : null
      )
    },
    [interactionKind, activeSelectionIndex, activeSourcePlannedPeriod, resetInteraction]
  )

  const handleCardMoveModeToggle = useCallback(
    (
      selectionIndex: number,
      sourcePlannedPeriod: string,
      cardKey: string,
      connectedPlannedPeriods: string[]
    ) => {
      activateClickMoveMode(
        'click-scheduled',
        selectionIndex,
        sourcePlannedPeriod,
        cardKey,
        connectedPlannedPeriods
      )
    },
    [activateClickMoveMode]
  )

  const handleUnscheduledMoveModeToggle = useCallback(
    (selectionIndex: number) => {
      activateClickMoveMode('click-unscheduled', selectionIndex, null, null)
    },
    [activateClickMoveMode]
  )

  const handleClickPlacementAction = useCallback(
    async (action: 'move' | 'extend', plannedPeriod: string) => {
      if (activeSelectionIndex === null) {
        return
      }
      if (interactionKind !== 'click-scheduled' && interactionKind !== 'click-unscheduled') {
        return
      }
      if (interactionKind === 'click-unscheduled' && action !== 'move') {
        return
      }
      const activeData: Record<string, unknown> =
        interactionKind === 'click-unscheduled'
          ? { selectionIndex: activeSelectionIndex, fromUnscheduled: true as const }
          : {
              selectionIndex: activeSelectionIndex,
              sourcePlannedPeriod: activeSourcePlannedPeriod,
              ...(activeMovingRun && activeMovingRun.length > 1
                ? { connectedPlannedPeriods: activeMovingRun }
                : {}),
            }
      if (
        interactionKind === 'click-scheduled' &&
        typeof activeData.sourcePlannedPeriod !== 'string'
      ) {
        return
      }
      setClickPlacementTarget({ kind: 'single', action, plannedPeriod })
      const applied = await applyDropAndPersist(activeSelectionIndex, activeData, {
        action,
        plannedPeriod,
      })
      setClickPlacementTarget(null)
      if (applied && interactionKind === 'click-unscheduled') {
        resetInteraction()
      }
    },
    [
      interactionKind,
      activeSelectionIndex,
      activeSourcePlannedPeriod,
      activeMovingRun,
      applyDropAndPersist,
      resetInteraction,
    ]
  )

  const isMoveModeActiveFor = useCallback(
    (selectionIndex: number) =>
      interactionKind === 'click-scheduled' && activeSelectionIndex === selectionIndex,
    [interactionKind, activeSelectionIndex]
  )

  useLayoutEffect(() => {
    if (
      interactionKind !== 'click-scheduled' ||
      activeSelectionIndex === null ||
      !fullPlan ||
      !periodIndex ||
      !activeEditCardKey ||
      !timelineRows
    ) {
      return
    }
    const row = fullPlan.courseUnitSelections[activeSelectionIndex]
    if (!row?.plannedPeriods?.length) {
      resetInteraction()
      return
    }
    const cards = buildTimelineCards(timelineRows, undefined, {
      periodIndex,
      showPastPeriods,
    })
    let card = cards.find((c) => c.cardKey === activeEditCardKey)
    let placements = card ? computeSemesterCoursePlacements(card, sisuRootId, periodIndex) : []
    let pl = placements.find((p) => p.selection.selectionIndex === activeSelectionIndex)

    if (!pl) {
      for (const c of cards) {
        const pls = computeSemesterCoursePlacements(c, sisuRootId, periodIndex)
        const found = pls.find((p) => p.selection.selectionIndex === activeSelectionIndex)
        if (found) {
          pl = found
          card = c
          break
        }
      }
    }

    if (!pl || !card) {
      resetInteraction()
      return
    }

    if (card.cardKey !== activeEditCardKey) {
      setActiveEditCardKey(card.cardKey)
    }
    if (pl.anchorPlannedPeriod !== activeSourcePlannedPeriod) {
      setActiveSourcePlannedPeriod(pl.anchorPlannedPeriod)
    }
    const movingRun: string[] = []
    for (let c = pl.startCol; c < pl.startCol + pl.span; c++) {
      const period = card.periods[c]
      if (period) {
        movingRun.push(
          period.plannedPeriod ||
            formatPlannedPeriodForSlot(
              sisuRootId,
              card.year,
              card.season,
              period.period,
              periodIndex
            )
        )
      }
    }
    if (movingRun.length > 1) {
      setActiveMovingRun(movingRun)
    } else {
      setActiveMovingRun(null)
    }
  }, [
    fullPlan,
    interactionKind,
    activeSelectionIndex,
    activeEditCardKey,
    activeSourcePlannedPeriod,
    timelineRows,
    periodIndex,
    showPastPeriods,
    sisuRootId,
    resetInteraction,
  ])

  const isMoveModeActiveForUnscheduled = useCallback(
    (selectionIndex: number) =>
      interactionKind === 'click-unscheduled' && activeSelectionIndex === selectionIndex,
    [interactionKind, activeSelectionIndex]
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
        console.warn(
          '[Kurssikompassi/Timeline]',
          'Initial Sisu preauth failed; continuing with lazy refresh'
        )
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

  useEffect(() => {
    void loadTimelineVariableCreditOverrides().then(setVariableCreditOverrides)
  }, [])

  const errorBannerMessage = saveError ?? error

  useEffect(() => {
    if (errorBannerMessage) {
      setIsErrorBannerVisible(true)
    }
  }, [errorBannerMessage])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      if (interactionKind !== 'click-scheduled' && interactionKind !== 'click-unscheduled') {
        return
      }
      resetInteraction()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [interactionKind, resetInteraction])

  useEffect(() => {
    if (interactionKind !== 'click-scheduled' && interactionKind !== 'click-unscheduled') {
      return
    }
    const onDocumentClick = (event: MouseEvent) => {
      const node = event.target
      const el = node instanceof Element ? node : (node as Node | null)?.parentElement
      if (
        el?.closest('[data-timeline-drop-zone],[data-timeline-credits-popup]')
      ) {
        return
      }
      resetInteraction()
    }
    document.addEventListener('click', onDocumentClick)
    return () => document.removeEventListener('click', onDocumentClick)
  }, [interactionKind, resetInteraction])

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
            creditSummary={timelineCreditSummary}
            showPastPeriods={showPastPeriods}
            setShowPastPeriods={setShowPastPeriods}
            showEmptySummerPeriods={showEmptySummerPeriods}
            setShowEmptySummerPeriods={setShowEmptySummerPeriods}
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
                onToggleMoveMode={handleUnscheduledMoveModeToggle}
                isMoveModeActiveForUnscheduled={isMoveModeActiveForUnscheduled}
                variableCreditOverrides={variableCreditOverrides}
                onVariableCreditChange={handleVariableCreditChange}
              />

              <div
                className={`relative z-20 min-h-dvh min-w-0 transition-[padding-left] duration-300 ease-out ${
                  unscheduledSidebarOpen ? 'pl-48 2xl:pl-0' : 'pl-0'
                }`}
              >
                <TimelineMainGrid
                  cards={timelineCards}
                  sisuRootId={sisuRootId}
                  periodIndex={periodIndex}
                  activeInteractionKind={interactionKind}
                  activeSelectionIndex={activeSelectionIndex}
                  dragRowSnapshot={timelineDragRowSnapshot}
                  clickModeEnabled={
                    interactionKind === 'click-scheduled' || interactionKind === 'click-unscheduled'
                  }
                  onCardUnschedule={handleCardUnschedule}
                  onCardMoveModeToggle={handleCardMoveModeToggle}
                  isMoveModeActiveFor={isMoveModeActiveFor}
                  onClickPlacementAction={handleClickPlacementAction}
                  clickPlacementTarget={clickPlacementTarget}
                  activeUnscheduledSelection={activeUnscheduledSelection}
                  onQuickScheduleToSpan={handleQuickScheduleToSpan}
                  variableCreditOverrides={variableCreditOverrides}
                  onVariableCreditChange={handleVariableCreditChange}
                />
              </div>
              <DragOverlay adjustScale={false} dropAnimation={null} zIndex={11000}>
                {unscheduledDragPreview ? (
                  <UnscheduledCourseDragPreview
                    selection={unscheduledDragPreview}
                    creditUncertain={
                      isVariableCreditRange(
                        unscheduledDragPreview.creditsMin,
                        unscheduledDragPreview.creditsMax
                      ) &&
                      !creditChoiceIsUserSet(unscheduledDragPreview.id, variableCreditOverrides)
                    }
                  />
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
