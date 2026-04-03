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
      <div className="ml-4 max-w-[75%] mt-6">
        <header>
          <h3>
            {isUserReview && (
              <>
                <i className="text-sm">Your review:</i>
                <br />
              </>
            )}
            <i className="text-sm font-normal">
              Published {publishDate}{' '}
              {editDate && editDate !== publishDate && ` (Edited ${editDate})`}
            </i>
          </h3>
        </header>
        <div className="flex flex-col gap-4">
          <span className="text-sm flex gap-2.5">
            {scores.map((score) => (
              <span key={score.name} className="flex gap-0.5">
                <dt className="font-bold">{score.name}</dt>
                <dd className="flex items-center mr-2.5">
                  <ScoreBar score={score.value} maxValue={5} />
                  {score.value}
                </dd>
              </span>
            ))}
          </span>
          {(review.professor || review.year) && (
            <div className="flex gap-1.5 text-sm">
              {review.professor && (
                <>
                  <dt className="font-bold">Responsible teacher:</dt>
                  <dd>{review.professor}</dd>
                </>
              )}
              {review.year && (
                <>
                  <dt className="font-bold ml-2.5">Year:</dt>
                  <dd>{review.year}</dd>
                </>
              )}
            </div>
          )}
          {review.learnings && (
            <div>
              <dt className="font-bold text-sm">What you'll learn</dt>
              <dd className="whitespace-pre-line">{review.learnings}</dd>
            </div>
          )}
          {review.tasks && (
            <div>
              <dt className="font-bold text-sm">What you'll need to do</dt>
              <dd className="whitespace-pre-line">{review.tasks}</dd>
            </div>
          )}
          {review.otherInfo && (
            <div>
              <dt className="font-bold text-sm">Other info</dt>
              <dd className="whitespace-pre-line">{review.otherInfo}</dd>
            </div>
          )}
        </div>
      </div>
      <Divider />
    </>
  )
}

export default ReviewItem
