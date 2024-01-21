import { useEffect, useState } from 'react'
import { Style } from './Style'
import RoundMeter from './RoundMeter'
import { getReviewsForCouse } from './requestHandlers'
import { ReviewResponse } from './types'
import ReviewList from './ReviewList'

const App = () => {
  const [userId, setUserId] = useState<string | null>(null)
  const [reviewResponse, setReviewResponse] = useState<ReviewResponse | null>(null)

  useEffect(() => {
    const inner = async () => {
      const newUserId = (await browser.storage?.local.get('userId')).userId
      const newCourseCode = (await browser.storage.local.get('currentCourseCode')).currentCourseCode
      const newReviewResponse = await getReviewsForCouse(newCourseCode)
      setReviewResponse(newReviewResponse)
      setUserId(newUserId)
    }
    inner()
  }, [])

  if (!reviewResponse || !userId) {
    return <div>Loading...</div>
  }

  const { rows: reviews, averages, count: reviewCount } = reviewResponse

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
    <>
      <Style />
      <div style={{ display: 'flex', gap: 40 }}>
        {scoreTypes.map((scoreType) => (
          <RoundMeter value={scoreType.value} title={scoreType.name} />
        ))}
      </div>
      <span style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
        <h2 style={{ marginBottom: 28, marginTop: 28, fontSize: 24 }}>{reviewCount} Reviews</h2>
        <button className="btn btn-secondary btn-hollow btn-sm">Make new review</button>
      </span>
      <div className="divider" />
      <ReviewList reviews={reviews} scoreTypes={scoreTypes} />
    </>
  )
}
export default App
