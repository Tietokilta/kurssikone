import { useEffect, useState } from 'react'
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
} from '../requestHandlers'

type Props = {
  courseCode?: string
}

const CoursePage = ({ courseCode }: Props) => {
  const [userId, setUserId] = useState<string | null>(null)
  const [otherReviewsAndCount, setOtherReviewsAndCount] = useState<ReviewsAndCount | null>(null)
  const [averages, setAverages] = useState<ReviewAverages | null>(null)
  const [IsMakingNewReview, setIsMakingNewReview] = useState(false)
  const [userReview, setUserReview] = useState<Review | null>(null)

  const fetchAndSetUserReview = async (courseCode: string, userId: string) => {
    const newUserReview = await getUserReviewForCourse(courseCode, userId)
    setUserReview(newUserReview)
  }

  const fetchAndSetOtherReviews = async (courseCode: string, userId?: string) => {
    const reviewsAndCount = await getReviewsForCourseExcludingUserReview(courseCode, userId)
    setOtherReviewsAndCount(reviewsAndCount)
  }

  const fetchAndSetAverages = async (courseCode: string) => {
    const newAverages = await getAveragesForCourse(courseCode)
    setAverages(newAverages)
  }

  const getUserIdAndFetchData = async () => {
    const newUserId: string | undefined = (await chrome.storage.sync.get('userId')).userId

    if (!courseCode) {
      return
    }

    if (newUserId) {
      await fetchAndSetUserReview(courseCode, newUserId)
      setUserId(newUserId)
    }

    await fetchAndSetOtherReviews(courseCode, newUserId)
    await fetchAndSetAverages(courseCode)
  }

  const setUserIdInStorage = async (id: string) => {
    await chrome.storage.sync.set({ userId: id })
  }

  useEffect(() => {
    getUserIdAndFetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!courseCode) {
    return <div className="p-4 text-gray-600">Course code not found</div>
  }

  if (!otherReviewsAndCount || !averages) {
    return <div className="p-4 text-gray-600">Loading...</div>
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
    <>
      <div className="flex gap-10 flex-wrap">
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
      <div className="flex gap-9 items-center my-7">
        <h2 className="text-2xl">{reviewCount} Reviews</h2>
        <button
          className="px-3 py-1.5 text-sm bg-gray-200 border border-gray-300 rounded hover:bg-gray-300"
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
    </>
  )
}

export default CoursePage
