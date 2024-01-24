import { Review } from './types'

type Props = {
  review: Review
  scoreTypes: { name: string; field: string }[]
  isUserReview?: boolean
}

const ReviewItem = ({ review, scoreTypes, isUserReview }: Props) => {
  const scores = scoreTypes.map(({ name, field }) => {
    return {
      name,
      //@ts-ignore
      value: review[field],
    }
  })
  return (
    <>
      <div className="form-group-mimic" style={{ marginLeft: 16, maxWidth: '75%' }}>
        <header className="label">
          <h3>
            {isUserReview && (
              <>
                <i style={{ fontSize: 14 }}>Your review:</i>
                <br />
              </>
            )}
            {review.title}
          </h3>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', rowGap: 24 }}>
          <span className="scoreList" style={{ fontSize: 14 }}>
            {scores.map((score) => (
              <span className="scoreListItem">
                <dt className="smallScore">{score.name}</dt>
                <dd>
                  <meter
                    max="5"
                    value={score.value}
                    style={{ marginRight: 4, marginLeft: 4, width: 50 }}
                  />
                  {score.value}
                </dd>
              </span>
            ))}
          </span>
          <text style={{ whiteSpace: 'pre-line' }}>{review.content}</text>
        </div>
      </div>
      <div className="divider" />
    </>
  )
}

export default ReviewItem
