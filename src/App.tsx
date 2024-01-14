import { useEffect, useState } from 'react'
import { Style } from './Style'
import RoundMeter from './RoundMeter'
import { getReviewsForCouse } from './requestHandlers'

type Review = {
  id: number
  title: string
  content: string
  date: string
  workloadScore: number
  qualityScore: number
  difficultyScore: number
  courseCode: string
}

type ReviewResponse = {
  rows: Review[]
  count: number
  averages: {
    workloadAverage: number
    qualityAverage: number
    difficultyAverage: number
  }
}

const App = () => {
  const [userId, setUserId] = useState<string | null>(null)
  const [reviewResponse, setReviewResponse] = useState<ReviewResponse | null>(null)
  useEffect(() => {
    const inner = async () => {
      const newUserId = (await browser.storage.local.get('userId')).userId
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
      <h2 style={{ marginBottom: 28, marginTop: 28, fontSize: 24 }}>{reviewCount} Reviews</h2>
      <div className="divider" />
      <dl className="fill-by-column">
        {reviews.map((review) => {
          const scores = scoreTypes.map(({ name, field }) => {
            return {
              name,
              //@ts-ignore
              value: review[field],
            }
          })
          return (
            <>
              <div className="form-group-mimic">
                <dt className="label">
                  <h3>{review.title}</h3>
                </dt>
                <dd>
                  <span className="scoreList" style={{ fontSize: 14 }}>
                    {scores.map((score) => (
                      <span className="scoreListItem">
                        <dt className="smallScore">{score.name}:</dt>
                        <dd>{score.value}</dd>
                      </span>
                    ))}
                  </span>
                  {review.content}
                </dd>
              </div>
              <div className="divider" />
            </>
          )
        })}
      </dl>
    </>
  )
}
export default App
