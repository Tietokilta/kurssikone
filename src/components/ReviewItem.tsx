import { Review } from '../types'
import dayjs from 'dayjs'
import Divider from './Divider'
import ScoreBar from './ScoreBar'

type Props = {
  review: Review
  scoreTypes: { name: string; field: string }[]
  isUserReview?: boolean
}

const ReviewItem = ({ review, scoreTypes, isUserReview }: Props) => {
  const scores = scoreTypes.map(({ name, field }) => {
    return {
      name,
      value: review[field as keyof Review] as number,
    }
  })
  const timeFormat = 'DD/MM/YYYY'
  const publishDate = dayjs(review.timestampCreated).format(timeFormat)
  const editDate = review.timestampLastEdit
    ? dayjs(review.timestampLastEdit).format(timeFormat)
    : null
  return (
    <>
      <div className="form-group-mimic" style={{ marginLeft: 16, maxWidth: '75%', marginTop: 24 }}>
        <header className="label">
          <h3>
            {isUserReview && (
              <>
                <i style={{ fontSize: 14 }}>Your review:</i>
                <br />
              </>
            )}
            {review.title}
            <i style={{ fontSize: 14, marginLeft: 16, fontWeight: 'normal' }}>
              Published {publishDate}{' '}
              {editDate && editDate !== publishDate && ` (Edited ${editDate})`}
            </i>
          </h3>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', rowGap: 24 }}>
          <span style={{ fontSize: 14, display: 'flex', gap: 10 }}>
            {scores.map((score) => (
              <span style={{ display: 'flex', gap: 2 }}>
                <dt style={{ fontWeight: 'bold' }}>{score.name}</dt>
                <dd style={{ display: 'flex', alignItems: 'center', marginRight: 10 }}>
                  <ScoreBar score={score.value} maxValue={5} />
                  {score.value}
                </dd>
              </span>
            ))}
          </span>
          <text style={{ whiteSpace: 'pre-line' }}>{review.content}</text>
        </div>
      </div>
      <Divider />
    </>
  )
}

export default ReviewItem
