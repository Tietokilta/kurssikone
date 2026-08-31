import { useTranslation } from 'react-i18next'
import { Review } from '../types'
import dayjs from 'dayjs'
import Divider from './Divider'
import ScoreBar from './ScoreBar'

type Props = {
  review: Review
  scoreTypes: { name: string; field: string }[]
  isUserReview?: boolean
  onAdminDelete?: (reviewId: number) => void
}

const ReviewItem = ({ review, scoreTypes, isUserReview, onAdminDelete }: Props) => {
  const { t } = useTranslation()
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
        <header className="flex items-start justify-between">
          <h3>
            {isUserReview && (
              <>
                <i className="text-sm">{t('shared.yourReview')}</i>
                <br />
              </>
            )}
            <i className="text-sm font-normal">
              {t('shared.published', { date: publishDate })}{' '}
              {editDate && editDate !== publishDate && ` ${t('shared.edited', { date: editDate })}`}
            </i>
          </h3>
          {onAdminDelete && (
            <button
              onClick={() => onAdminDelete(review.id)}
              className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 ml-4 shrink-0"
            >
              {t('shared.delete')}
            </button>
          )}
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
                  <dt className="font-bold">{t('shared.responsibleTeacher')}</dt>
                  <dd>{review.professor}</dd>
                </>
              )}
              {review.year && (
                <>
                  <dt className="font-bold ml-2.5">{t('shared.year')}</dt>
                  <dd>{review.year}</dd>
                </>
              )}
            </div>
          )}
          {review.learnings && (
            <div>
              <dt className="font-bold text-sm">{t('shared.whatYoullLearn')}</dt>
              <dd className="whitespace-pre-line">{review.learnings}</dd>
            </div>
          )}
          {review.tasks && (
            <div>
              <dt className="font-bold text-sm">{t('shared.whatYoullDo')}</dt>
              <dd className="whitespace-pre-line">{review.tasks}</dd>
            </div>
          )}
          {review.otherInfo && (
            <div>
              <dt className="font-bold text-sm">{t('shared.otherInfo')}</dt>
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
