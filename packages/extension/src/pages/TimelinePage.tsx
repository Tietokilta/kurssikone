import { useEffect, useMemo, useState } from 'react'
import { fetchStudyPlans, getCoursesByIds } from '../requestHandlers'
import { SisuCourseUnitSelection } from '../utils/types'
import { buildTimelineCards, parseCourseUnitPlannedPeriods } from '../utils/parsePlannedPeriods'

type Props = {
  planId: string
}

type ParsedCourseUnitSelection = {
  id: string
  name: string
  parsedPlannedPeriods: ReturnType<typeof parseCourseUnitPlannedPeriods>
  rawData: SisuCourseUnitSelection
}

const TimelinePage = ({ planId }: Props) => {
  const [courseUnitSelections, setCourseUnitSelections] = useState<
    ParsedCourseUnitSelection[] | null
  >(null)
  const [error, setError] = useState<string | null>(null)

  const timelineCards = useMemo(
    () => (courseUnitSelections ? buildTimelineCards(courseUnitSelections) : []),
    [courseUnitSelections]
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

      const names: Record<string, string> = {}

      for (const c of courses) {
        const label =
          (c.nameEn && c.nameEn.trim()) || (c.nameFi && c.nameFi.trim()) || c.code || c.id

        names[c.id] = label
      }

      const parsedSelections: ParsedCourseUnitSelection[] = selections.map((s) => ({
        id: s.courseUnitId,
        name: names[s.courseUnitId] || s.courseUnitId,
        parsedPlannedPeriods: parseCourseUnitPlannedPeriods(s.courseUnitId, s.plannedPeriods),
        rawData: s,
      }))

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
      {timelineCards.map((card) => (
        <section
          key={card.cardKey}
          className="rounded border border-neutral-200 bg-white p-3 shadow-sm"
        >
          <h2 className="mb-2 text-sm font-medium text-neutral-900">
            {card.season} {card.year}
          </h2>

          <ul className="space-y-2 flex gap-8">
            {card.periods.map((p) => (
              <li key={p.periodKey} className="flex flex-col gap-3 text-sm">
                <span className="w-14 shrink-0 text-neutral-500">{p.period}</span>
                <div className="min-w-0 flex-1 text-neutral-800">
                  {p.selections.length === 0 ? (
                    <span className="text-neutral-400">—</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {p.selections.map((s) => (
                        <li key={s.id}>{s.name}</li>
                      ))}
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
