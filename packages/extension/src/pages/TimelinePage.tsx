import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchStudyPlans, getCoursesByIds } from '../requestHandlers'
import { SisuCourseUnitSelection } from '../utils/types'
import {
  buildTimelineCards,
  formatPlannedPeriodForSlot,
  parseCourseUnitPlannedPeriods,
  type TimelineCard,
  type TimelinePeriod,
} from '../utils/parsePlannedPeriods'
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
  parsedPlannedPeriods: ReturnType<typeof parseCourseUnitPlannedPeriods>
  rawData: SisuCourseUnitSelection
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

function TimelinePeriodColumn({
  card,
  period: p,
  sisuRootId,
}: {
  card: TimelineCard<ParsedCourseUnitSelection>
  period: TimelinePeriod<ParsedCourseUnitSelection>
  sisuRootId: string
}) {
  const resolvedPlannedPeriod =
    p.plannedPeriod || formatPlannedPeriodForSlot(sisuRootId, card.year, card.season, p.period)

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
                key={`${s.id}-${p.periodKey}`}
                selection={s}
                periodKey={p.periodKey}
                sourcePlannedPeriod={resolvedPlannedPeriod}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

const TimelinePage = ({ planId }: Props) => {
  const [courseUnitSelections, setCourseUnitSelections] = useState<
    ParsedCourseUnitSelection[] | null
  >(null)
  const [error, setError] = useState<string | null>(null)
  const [showSummer, setShowSummer] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const timelineCards = useMemo(
    () =>
      courseUnitSelections
        ? buildTimelineCards(courseUnitSelections, undefined, { showSummer })
        : [],
    [courseUnitSelections, showSummer]
  )

  const sisuRootId = useMemo(
    () => extractSisuRootId(courseUnitSelections ?? []),
    [courseUnitSelections]
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over) {
      return
    }
    const courseId = active.data.current?.courseId
    const startPlannedPeriod = active.data.current?.sourcePlannedPeriod
    const targetPlannedPeriod = over.data.current?.plannedPeriod
    if (
      typeof courseId === 'string' &&
      typeof startPlannedPeriod === 'string' &&
      typeof targetPlannedPeriod === 'string'
    ) {
      console.log(courseId, startPlannedPeriod, targetPlannedPeriod)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!planId) {
      setError('Could not read plan id from URL')
      setCourseUnitSelections(null)
      return
    }

    setError(null)
    setCourseUnitSelections(null)

    void (async () => {
      const result = await fetchStudyPlans()
      if (cancelled) return

      if (!result.ok) {
        if (result.error === 'no_sisu_token') {
          setError('Could not get Sisu auth')
        } else {
          setError(result.message ?? 'Failed to load study plans')
        }
        return
      }

      const plan = result.data.find((p) => p.id === planId)
      if (!plan) {
        setError('Plan not found')
        return
      }

      const selections = plan.courseUnitSelections
      const ids = [...new Set(selections.map((s) => s.courseUnitId))]
      const courses = await getCoursesByIds(ids)

      if (cancelled) return

      const courseData: Record<string, Course> = {}

      for (const c of courses) {
        courseData[c.id] = c
      }

      const parsedSelections: ParsedCourseUnitSelection[] = selections.map((s) => {
        const course = courseData[s.courseUnitId]

        const name =
          (course.nameEn && course.nameEn.trim()) ||
          (course.nameFi && course.nameFi.trim()) ||
          course.code ||
          s.courseUnitId

        const creditsMin = course.creditsMin || 0
        const creditsMax = course.creditsMax || 0
        const plannedCredits =
          creditsMax === creditsMin ? creditsMax : Math.round((creditsMax + creditsMin) / 2) // TODO: Make feature where user can specify their planned credits

        return {
          id: s.courseUnitId,
          name: name,
          creditsMin,
          creditsMax,
          plannedCredits: plannedCredits,
          parsedPlannedPeriods: parseCourseUnitPlannedPeriods(s.courseUnitId, s.plannedPeriods),
          rawData: s,
        }
      })

      console.log('Parsed course unit selections:', parsedSelections)

      setCourseUnitSelections(parsedSelections)
    })()

    return () => {
      cancelled = true
    }
  }, [planId])

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>
  }

  if (courseUnitSelections === null) {
    return <div className="p-4 text-neutral-600">Loading…</div>
  }

  return (
    <div className="space-y-3 p-3">
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

            <ul className="grid grid-cols-3 gap-4">
              {card.periods.map((p) => (
                <TimelinePeriodColumn
                  key={p.periodKey}
                  card={card}
                  period={p}
                  sisuRootId={sisuRootId}
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
