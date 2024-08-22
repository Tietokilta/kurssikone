import { useEffect, useState } from 'react'
import { getAveragesForCourse } from './requestHandlers'
import { ReviewAverages } from './types'
import { Style } from './Style'

type Props = {
  courseCode: string
}

const SearchResult = ({ courseCode }: Props) => {
  const [averages, setAverages] = useState<ReviewAverages | null>(null)

  const fetchAndSetAverages = async (courseCode: string) => {
    const newAverages = await getAveragesForCourse(courseCode)
    setAverages(newAverages)
  }

  useEffect(() => {
    const inner = async () => {
      await fetchAndSetAverages(courseCode)
    }
    inner()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!averages) {
    return null
  }

  const scoreTypes = [
    { name: 'Quality', field: 'qualityScore', value: averages.qualityAverage },
    { name: 'Workload', field: 'workloadScore', value: averages.workloadAverage },
    {
      name: 'Difficulty',
      field: 'difficultyScore',
      value: averages.difficultyAverage,
    },
  ]

  return (
    <div className="review-root">
      <Style />
      <span style={{ fontSize: 14, display: 'grid', gridTemplateColumns: 'auto 1fr' }}>
        {scoreTypes.map((score) => (
          <>
            <span className="tiny-static-form-group">{score.name}</span>
            <span>
              <meter
                max="5"
                value={score.value}
                style={{ marginLeft: 10, marginRight: 6, width: 50 }}
              />
              {score.value}
            </span>
          </>
        ))}
      </span>
    </div>
  )
}
export default SearchResult
