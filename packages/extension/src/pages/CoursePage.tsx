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
    return <div>Course code not found</div>
  }

  if (!otherReviewsAndCount || !averages) {
    return <div>Loading...</div>
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
      <div style={{ display: 'flex', gap: 40 }}>
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
      <span style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
        <h2 style={{ marginBottom: 28, marginTop: 28, fontSize: 24 }}>{reviewCount} Reviews</h2>

        <button
          className="btn btn-secondary btn-hollow btn-sm"
          onClick={() => setIsMakingNewReview((oldVal) => !oldVal)}
        >
          {buttonText}
        </button>
      </span>
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
      <dl className="fill-by-column">
        {userReview && (
          <>
            <ReviewItem review={userReview} scoreTypes={scoreTypesWithValues} isUserReview />
          </>
        )}
        {reviews.map((review) => (
          <ReviewItem key={review.id} review={review} scoreTypes={scoreTypesWithValues} />
        ))}
      </dl>
    </>
  )
}
export default CoursePage
