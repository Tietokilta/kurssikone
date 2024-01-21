import { Review } from './types'

type Props = {
  reviews: Review[]
  scoreTypes: { name: string; field: string }[]
}

const ReviewList = ({ reviews, scoreTypes }: Props) => {
  return (
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
  )
}

export default ReviewList
