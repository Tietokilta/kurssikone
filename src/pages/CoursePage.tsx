import { useEffect, useState } from 'react'
import RoundMeter from '../components/RoundMeter'
import {
  getAveragesForCourse,
  getReviewsForCourseExcludingUserReview,
  getUserReviewForCourse,
} from '../requestHandlers'
import { Review, ReviewAverages, ReviewsAndCount } from '../types'
import ReviewMakeForm from '../components/ReviewMakeForm'
import ReviewItem from '../components/ReviewItem'
import Divider from '../components/Divider'
import NewAccountNotification from '../components/NewAccountNotification'

const CoursePage = () => {
  const [userId, setUserId] = useState<string | null>(null)
  const [courseCode, setCourseCode] = useState<string | null>(null)
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

  const setUserIdAndCourseCode = async () => {
    const newUserId: string | undefined = (await chrome.storage.sync.get('userId')).userId
    const newCourseCode: string | undefined = (await chrome.storage.sync.get('currentCourseCode'))
      .currentCourseCode as string

    if (!newCourseCode) {
      throw new Error('No course code')
    }

    if (newUserId) {
      await fetchAndSetUserReview(newCourseCode, newUserId)
      setUserId(newUserId)
    }

    await fetchAndSetOtherReviews(newCourseCode, newUserId)
    await fetchAndSetAverages(newCourseCode)

    setCourseCode(newCourseCode)
  }

  useEffect(() => {
    setUserIdAndCourseCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!otherReviewsAndCount || !averages) {
    return <div>Loading...</div>
  }

  const { reviews, count: otherReviewCount } = otherReviewsAndCount

  const reviewCount = otherReviewCount + (userReview ? 1 : 0)

  const scoreTypes = [
    { name: 'Quality', field: 'qualityScore', value: averages.qualityAverage },
    { name: 'Workload', field: 'workloadScore', value: averages.workloadAverage },
    {
      name: 'Difficulty',
      field: 'difficultyScore',
      value: averages.difficultyAverage,
    },
  ]

  let buttonText = '+ Write a Review'

  if (IsMakingNewReview) {
    buttonText = '- Cancel'
  } else if (userReview) {
    buttonText = '+ Edit your review'
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 40 }}>
        {scoreTypes.map((scoreType) => (
          <RoundMeter value={scoreType.value} title={scoreType.name} />
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
          />
        ) : (
          <>
            <NewAccountNotification
              updateLocalState={setUserIdAndCourseCode}
              setIsMakingNewReview={setIsMakingNewReview}
            />
            <Divider />
          </>
        ))}
      <dl className="fill-by-column">
        {userReview && (
          <>
            <ReviewItem review={userReview} scoreTypes={scoreTypes} isUserReview />
          </>
        )}
        {reviews.map((review) => (
          <ReviewItem review={review} scoreTypes={scoreTypes} />
        ))}
      </dl>
    </>
  )
}
export default CoursePage
