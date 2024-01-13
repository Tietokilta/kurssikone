import { useEffect, useState } from 'react'
import { Style } from './Style'
import RoundMeter from './RoundMeter'

const reviewCount = 3

const reviews = [
  {
    id: 1,
    title: 'Ihan sika vaikee',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla euismod, nisl eget ultricies ultrices, nunc nunc aliquam nunc, vitae aliquam nun',
    date: '2021-04-04',
    workloadScore: 5,
    qualityScore: 3,
    difficultyScore: 4,
    courseCode: 'CS-A1110',
  },
  {
    id: 2,
    title: 'Ihan sika vaikee',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla euismod, nisl eget ultricies ultrices, nunc nunc aliquam nunc, vitae aliquam nun',
    date: '2021-04-04',
    workloadScore: 5,
    qualityScore: 5,
    difficultyScore: 5,
    courseCode: 'CS-A1110',
  },
  {
    id: 3,
    title: 'Ihan sika vaikee',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla euismod, nisl eget ultricies ultrices, nunc nunc aliquam nunc, vitae aliquam nun',
    date: '2021-04-04',
    workloadScore: 1,
    qualityScore: 2,
    difficultyScore: 3,
    courseCode: 'CS-A1110',
  },
]

const App = () => {
  const [userId, setUserId] = useState<string | null>(null)
  const [courseCode, setCourseCode] = useState<string | null>(null)
  useEffect(() => {
    const inner = async () => {
      const newUserId = (await browser.storage.local.get('userId')).userId
      const newCourseCode = (await browser.storage.local.get('currentCourseCode')).currentCourseCode
      setUserId(newUserId)
      setCourseCode(newCourseCode)
    }
    inner()
  }, [])

  const scoreTypes = [
    { name: 'Quality', field: 'qualityScore', value: 0 },
    { name: 'Workload', field: 'workloadScore', value: 0 },
    { name: 'Difficulty', field: 'difficultyScore', value: 0 },
  ]
  scoreTypes.forEach((scoreType) => {
    scoreType.value =
      //@ts-ignore
      reviews.reduce((acc, review) => acc + review[scoreType.field], 0) / reviews.length
  })
  return (
    <>
      <Style />
      <h2 className="mt-0">Reviews ({reviewCount})</h2>
      <span className="scoreContainer" style={{ fontSize: 16 }}>
        {scoreTypes.map((scoreType) => (
          <>
            <span className="mainScore">{scoreType.name}</span>
            <meter max="5" min="0" value={scoreType.value}></meter>
            <span>{scoreType.value.toFixed(1)}</span>
          </>
        ))}
      </span>

      <div style={{ display: 'flex', gap: 40 }}>
        {scoreTypes.map((scoreType) => (
          <RoundMeter value={scoreType.value} title={scoreType.name} />
        ))}
      </div>
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
