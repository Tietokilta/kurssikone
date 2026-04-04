import { useEffect, useMemo, useState } from 'react'
import { fetchStudyPlans, getCoursesByIds } from '../requestHandlers'
import { SisuCourseUnitSelection } from '../utils/types'
import { buildTimelineCards, parseCourseUnitPlannedPeriods } from '../utils/parsePlannedPeriods'
import { Course } from '@kurssikompassi/shared/src/types'

type Props = {
  planId: string
}

type ParsedCourseUnitSelection = {
  id: string
  name: string
  creditsMin: number
  creditsMax: number
  plannedCredits: number
  parsedPlannedPeriods: ReturnType<typeof parseCourseUnitPlannedPeriods>
  rawData: SisuCourseUnitSelection
}

const TimelinePage = ({ planId }: Props) => {
  const [courseUnitSelections, setCourseUnitSelections] = useState<
    ParsedCourseUnitSelection[] | null
  >(null)
  const [error, setError] = useState<string | null>(null)
  const [showSummer, setShowSummer] = useState(true)

  const timelineCards = useMemo(
    () =>
      courseUnitSelections
        ? buildTimelineCards(courseUnitSelections, undefined, { showSummer })
        : [],
    [courseUnitSelections, showSummer]
  )

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

        return {
          id: s.courseUnitId,
          name: name,
          creditsMin: course.creditsMin || 0,
          creditsMax: course.creditsMax || 0,
          plannedCredits: ((course.creditsMax || 0) + (course.creditsMin || 0)) / 2, // TODO: Make feature where user can specify their planned credits
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
              <li key={p.periodKey} className="flex flex-col gap-3 text-sm">
                <span className="w-14 shrink-0 text-neutral-500">{p.period}</span>

                <div className="min-w-0 flex-1 text-neutral-800">
                  {p.selections.length === 0 ? (
                    <span className="text-neutral-400">—</span>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {p.selections.map((s) => {
                        return (
                          <li key={s.id} className="bg-gray-300 flex">
                            <div className="py-2 px-1 bg-blue-500 text-center w-12 shrink-0 flex items-center justify-center">
                              {s.creditsMax === s.creditsMin
                                ? s.creditsMax
                                : `${s.creditsMin}–${s.creditsMax}`}
                            </div>

                            <div className="p-2">{s.name}</div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default TimelinePage
