import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  RoundMeter,
  ReviewMakeForm,
  ReviewItem,
  Divider,
  NewAccountNotification,
  scoreTypes,
  Review,
  ReviewAverages,
  ReviewsAndCount,
} from '@kurssikompassi/shared'
import {
  getAveragesForCourse,
  getReviewsForCourseExcludingUserReview,
  getUserReviewForCourse,
  getUser,
  makeUser,
  makeOrEditReview,
  deleteReview,
} from '../api/client'
import { getUserId, setUserId } from '../utils/userStorage'

const CoursePage = () => {
  const { courseCode } = useParams<{ courseCode: string }>()
  const [userId, setUserIdState] = useState<string | null>(null)
  const [otherReviewsAndCount, setOtherReviewsAndCount] = useState<ReviewsAndCount | null>(null)
  const [averages, setAverages] = useState<ReviewAverages | null>(null)
  const [IsMakingNewReview, setIsMakingNewReview] = useState(false)
  const [userReview, setUserReview] = useState<Review | null>(null)

  const fetchAndSetUserReview = async (code: string, uid: string) => {
    const newUserReview = await getUserReviewForCourse(code, uid)
    setUserReview(newUserReview)
  }

  const fetchAndSetOtherReviews = async (code: string, uid?: string) => {
    const reviewsAndCount = await getReviewsForCourseExcludingUserReview(code, uid)
    setOtherReviewsAndCount(reviewsAndCount)
  }

  const fetchAndSetAverages = async (code: string) => {
    const newAverages = await getAveragesForCourse(code)
    setAverages(newAverages)
  }

  const getUserIdAndFetchData = async () => {
    const storedUserId = getUserId()

    if (!courseCode) {
      return
    }

    if (storedUserId) {
      await fetchAndSetUserReview(courseCode, storedUserId)
      setUserIdState(storedUserId)
    }

    await fetchAndSetOtherReviews(courseCode, storedUserId ?? undefined)
    await fetchAndSetAverages(courseCode)
  }

  useEffect(() => {
    getUserIdAndFetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseCode])

  if (!courseCode) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-medium mb-4">Course code not found</h2>
        <Link
          to="/"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go to Home
        </Link>
      </div>
    )
  }

  if (!otherReviewsAndCount || !averages) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  const { reviews, count: otherReviewCount } = otherReviewsAndCount

  const reviewCount = otherReviewCount + (userReview ? 1 : 0)

  const scoreTypesWithValues = scoreTypes.map((scoreType) => {
    let average = 0
    if (scoreType.label === 'Quality') {
      average = averages.qualityAverage
    } else if (scoreType.label === 'Workload') {
      average = averages.workloadAverage
    } else {
      average = averages.difficultyAverage
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

  if (IsMakingNewReview) {
    buttonText = '- Cancel'
  } else if (userReview) {
    buttonText = '+ Edit your review'
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/" className="text-blue-600 underline hover:text-blue-800">
          &larr; Back to search
        </Link>
      </div>

      <h1 className="text-2xl font-medium mb-6">Course: {courseCode}</h1>

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
          onClick={() => setIsMakingNewReview((oldVal) => !oldVal)}
        >
          {buttonText}
        </button>
      </div>

      <Divider />

      {IsMakingNewReview &&
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
              updateLocalState={getUserIdAndFetchData}
              setIsMakingNewReview={setIsMakingNewReview}
              setUserId={setUserId}
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
        <p className="text-gray-600">No reviews yet. Be the first to write a review!</p>
      )}
    </div>
  )
}

export default CoursePage
