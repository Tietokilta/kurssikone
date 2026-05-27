import RoundMeter from './RoundMeter'
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
}: CoursePageContentProps) => {
  const { reviews, count: otherReviewCount } = otherReviewsAndCount

  const reviewCount = otherReviewCount + (userReview ? 1 : 0)

  const scoreTypesWithValues = scoreTypes.map((scoreType) => {
    let average = 0
    if (scoreType.label === 'Quality') {
      average = averages.qualityAverage
    } else if (scoreType.label === 'Workload') {
      average = averages.workloadAverage
    }

    return {
      name: scoreType.label,
      field: scoreType.name,
      minText: scoreType.minText,
      maxText: scoreType.maxText,
      value: average,
    }
  })

  let buttonText = '+ Write a Review'

  if (isMakingNewReview) {
    buttonText = '- Cancel'
  } else if (userReview) {
    buttonText = '+ Edit your review'
  }

  return (
    <>
      <div className="flex gap-8 flex-wrap mb-6">
        {scoreTypesWithValues.map((scoreType) => (
          <RoundMeter
            key={scoreType.name}
            value={scoreType.value}
            title={scoreType.name}
            minText={scoreType.minText}
            maxText={scoreType.maxText}
          />
        ))}
      </div>

      <div className="flex gap-6 items-center mb-4">
        <h2 className="text-xl font-medium">{reviewCount} Reviews</h2>
        <button
          className="px-3 py-1.5 text-sm bg-gray-200 text-gray-900 border border-gray-300 rounded-md hover:bg-gray-300 transition-colors"
          onClick={() => setIsMakingNewReview(!isMakingNewReview)}
        >
          {buttonText}
        </button>
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
          <ReviewItem review={userReview} scoreTypes={scoreTypesWithValues} isUserReview />
        )}
        {reviews.map((review) => (
          <ReviewItem key={review.id} review={review} scoreTypes={scoreTypesWithValues} />
        ))}
      </dl>

      {reviewCount === 0 && (
        <p className="text-gray-600 mt-4">No reviews yet. Be the first to write one!</p>
      )}
    </>
  )
}

export default CoursePageContent
