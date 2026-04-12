import { useEffect, useState } from 'react'
import { getAveragesForCourse } from '../requestHandlers'
import { ReviewAverages, ScoreBar } from '@kurssikone/shared'

type Props = {
  courseCode: string
}

const SearchResultPage = ({ courseCode }: Props) => {
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
  ]

  return (
    <div>
      <span className="text-sm grid grid-cols-[auto_1fr]">
        {scoreTypes.map((score) => (
          <span key={score.name} className="contents">
            <span className="text-gray-600 pr-2">{score.name}</span>
            <span className="flex items-center">
              <ScoreBar score={score.value} maxValue={5} />
              {score.value.toFixed(1)}
            </span>
          </span>
        ))}
      </span>
    </div>
  )
}

export default SearchResultPage
