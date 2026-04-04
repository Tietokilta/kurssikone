import { useEffect, useState } from 'react'
import { fetchStudyPlans, getCoursesByIds } from '../requestHandlers'
import { SisuCourseUnitSelection } from '../utils/types'

type Props = {
  planId: string
}

const parsePlannedPeriods = (plannedPeriod: string | undefined) => {
  if (!plannedPeriod) {
    return null
  }

  const [_, year, seasonPart, periodPart] = plannedPeriod.split('/')
  const season = seasonPart === '1' ? 'Spring' : seasonPart === '0' ? 'Fall' : null

  if (!season || !year) {
    return null
  }

  if (season === 'Spring') {
    const period =
      periodPart === '0'
        ? 'III'
        : periodPart === '1'
          ? 'IV'
          : periodPart === '2'
            ? 'V'
            : periodPart === '3'
              ? 'Summer'
              : null

    if (!period) {
      return null
    }

    return { season, year, period }
  }

  if (season === 'Fall') {
    const period = periodPart === '1' ? 'I' : periodPart === '2' ? 'II' : null

    if (!period) {
      return null
    }

    return { season, year, period }
  }
}

const TimelinePage = ({ planId }: Props) => {
  const [courseUnitSelections, setCourseUnitSelections] = useState<
    SisuCourseUnitSelection[] | null
  >(null)
  const [nameByUnitId, setNameByUnitId] = useState<Record<string, string> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!planId) {
      setError('Could not read plan id from URL')
      setCourseUnitSelections(null)
      setNameByUnitId(null)
      return
    }

    setError(null)
    setCourseUnitSelections(null)
    setNameByUnitId(null)

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

      setCourseUnitSelections(selections)
      setNameByUnitId(names)
    })()

    return () => {
      cancelled = true
    }
  }, [planId])

  if (error) {
    return <div>{error}</div>
  }

  if (courseUnitSelections === null || nameByUnitId === null) {
    return <div>Loading…</div>
  }

  return (
    <ul>
      {courseUnitSelections.map((selection) => (
        <li key={selection.courseUnitId}>
          {nameByUnitId[selection.courseUnitId]}{' '}
          {selection.plannedPeriods
            .map(parsePlannedPeriods)
            .map((p) => `(${p?.season} ${p?.year} ${p?.period})`)
            .join(' ')}
        </li>
      ))}
    </ul>
  )
}

export default TimelinePage
