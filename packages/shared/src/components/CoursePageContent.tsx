import { useTranslation } from 'react-i18next'
import ScoreDisplay from './ScoreDisplay'
import ReviewMakeForm from './ReviewMakeForm'
import ReviewItem from './ReviewItem'
import Divider from './Divider'
import NewAccountNotification from './NewAccountNotification'
import { scoreTypes } from '../constants'
import { NewReview, Review, ReviewAverages, ReviewsAndCount } from '../types'

export type CoursePageContentProps = {
  courseCode: string
  userId: string | null
  otherReviewsAndCount: ReviewsAndCount
  averages: ReviewAverages
  isMakingNewReview: boolean
  userReview: Review | null
  setIsMakingNewReview: (value: boolean) => void
  fetchAndSetUserReview: (courseCode: string, userId: string) => Promise<void>
  fetchAndSetAverages: (courseCode: string) => Promise<void>
  refetchData: () => Promise<void>
  setUserIdInStorage: (id: string) => Promise<void>
  getUser: (userId: string) => Promise<unknown>
  makeUser: (userId: string) => Promise<void>
  makeOrEditReview: (review: NewReview) => Promise<void>
  deleteReview: (reviewId: number, userId: string) => Promise<void>
  onAdminDelete?: (reviewId: number) => void
}

const CoursePageContent = ({
  courseCode,
  userId,
  otherReviewsAndCount,
  averages,
  isMakingNewReview,
  userReview,
  setIsMakingNewReview,
  fetchAndSetUserReview,
  fetchAndSetAverages,
  refetchData,
  setUserIdInStorage,
  getUser,
  makeUser,
  makeOrEditReview,
  deleteReview,
  onAdminDelete,
}: CoursePageContentProps) => {
  const { t } = useTranslation()
  const { reviews, count: otherReviewCount } = otherReviewsAndCount

  const reviewCount = otherReviewCount + (userReview ? 1 : 0)

  const scoreTypesWithValues = scoreTypes.map((scoreType) => {
    let average = 0
    if (scoreType.name === 'qualityScore') {
      average = averages.qualityAverage
    } else if (scoreType.name === 'workloadScore') {
      average = averages.workloadAverage
    }

    return {
      name: t(scoreType.labelKey),
      field: scoreType.name,
      labels: t(scoreType.labelsKey, { returnObjects: true }) as string[],
      value: average,
    }
  })

  let buttonText = t('shared.writeReview')

  if (isMakingNewReview) {
    buttonText = t('shared.cancelReview')
  } else if (userReview) {
    buttonText = t('shared.editReview')
  }

  return (
    <>
      <div className="flex gap-6 items-center mb-4">
        <h2 className="text-xl font-medium">{t('shared.reviewCount', { count: reviewCount })}</h2>
        <button
          className={isMakingNewReview ? 'btn-secondary' : 'btn-primary'}
          onClick={() => setIsMakingNewReview(!isMakingNewReview)}
        >
          {buttonText}
        </button>
      </div>

      <div className="flex gap-4 sm:gap-8 mb-4">
        {scoreTypesWithValues.map((scoreType) => (
          <ScoreDisplay
            key={scoreType.name}
            value={scoreType.value}
            title={scoreType.name}
            labels={scoreType.labels}
          />
        ))}
      </div>

      <Divider />

      {isMakingNewReview &&
        (userId ? (
          <ReviewMakeForm
            userId={userId}
            courseCode={courseCode}
            currentUserReview={userReview}
            refetchUserReview={fetchAndSetUserReview}
            refetchAverages={fetchAndSetAverages}
            setIsMakingNewReview={setIsMakingNewReview}
            makeOrEditReview={makeOrEditReview}
            deleteReview={deleteReview}
          />
        ) : (
          <>
            <NewAccountNotification
              updateLocalState={refetchData}
              setIsMakingNewReview={setIsMakingNewReview}
              setUserId={setUserIdInStorage}
              getUser={getUser}
              makeUser={makeUser}
            />
            <Divider />
          </>
        ))}

      <dl className="flex flex-col gap-4">
        {userReview && (
          <ReviewItem
            review={userReview}
            scoreTypes={scoreTypesWithValues}
            isUserReview
            onAdminDelete={onAdminDelete}
          />
        )}
        {reviews.map((review) => (
          <ReviewItem
            key={review.id}
            review={review}
            scoreTypes={scoreTypesWithValues}
            onAdminDelete={onAdminDelete}
          />
        ))}
      </dl>

      {reviewCount === 0 && (
        <p className="text-gray-600 mt-4 mb-12">{t('shared.noReviewsYet')}</p>
      )}
    </>
  )
}

export default CoursePageContent
