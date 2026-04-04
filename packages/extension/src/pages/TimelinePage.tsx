import { useEffect, useState } from 'react'
import { fetchStudyPlans } from '../requestHandlers'
import { SisuCourseUnitSelection } from '../utils/types'

type Props = {
  planId: string
}

const TimelinePage = ({ planId }: Props) => {
  const [courseUnitSelections, setCourseUnitSelections] = useState<
    SisuCourseUnitSelection[] | null
  >(null)
  const [error, setError] = useState<string | null>(null)

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

      setCourseUnitSelections(plan.courseUnitSelections)
    })()

    return () => {
      cancelled = true
    }
  }, [planId])

  if (error) {
    return <div>{error}</div>
  }

  if (courseUnitSelections === null) {
    return <div>Loading…</div>
  }

  return (
    <ul>
      {courseUnitSelections.map((selection) => (
        <li key={selection.courseUnitId}>{selection.courseUnitId}</li>
      ))}
    </ul>
  )
}

export default TimelinePage
