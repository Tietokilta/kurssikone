import { useEffect, useState } from 'react'
import { Style } from '../Style'
import RoundMeter from '../components/RoundMeter'
import {
  getAveragesForCourse,
  getReviewsForCourseExcludingUserReview,
  getUserReviewForCourse,
} from '../requestHandlers'
import { Review, ReviewAverages, ReviewsAndCount } from '../types'
import ReviewMakeForm from '../components/ReviewMakeForm'
import ReviewItem from '../components/ReviewItem'

const CoursePage = () => {
  const [userId, setUserId] = useState<string | null>(null)
  const [courseCode, setCourseCode] = useState<string | null>(null)
  const [otherReviewsAndCount, setOtherReviewsAndCount] = useState<ReviewsAndCount | null>(null)
  const [averages, setAverages] = useState<ReviewAverages | null>(null)
  const [isMakingNewReview, setIsMakingNewReview] = useState(false)
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

  useEffect(() => {
    const inner = async () => {
      const newUserId: string | undefined = (await chrome.storage?.local.get('userId')).userId
      const newCourseCode: string | undefined = (
        await chrome.storage.local.get('currentCourseCode')
      ).currentCourseCode as string

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
    inner()
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
  let buttonEnabled = true

  if (isMakingNewReview) {
    buttonText = '- Cancel'
  } else if (userReview) {
    buttonText = '+ Edit your review'
  } else if (!userId) {
    buttonText = 'Log in to write a review'
    buttonEnabled = false
  }

  return (
    <>
      <Style />
      <div style={{ display: 'flex', gap: 40 }}>
        {scoreTypes.map((scoreType) => (
          <RoundMeter value={scoreType.value} title={scoreType.name} />
        ))}
      </div>
      <span style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
        <h2 style={{ marginBottom: 28, marginTop: 28, fontSize: 24 }}>{reviewCount} Reviews</h2>

        <button
          className="btn btn-secondary btn-hollow btn-sm"
          disabled={!buttonEnabled}
          onClick={() => setIsMakingNewReview((oldVal) => !oldVal)}
        >
          {buttonText}
        </button>
      </span>
      <div className="divider" />
      {isMakingNewReview && userId ? (
        <ReviewMakeForm
          userId={userId}
          courseCode={courseCode}
          currentUserReview={userReview}
          refetchUserReview={fetchAndSetUserReview}
          refetchAverages={fetchAndSetAverages}
          setIsMakingNewReview={setIsMakingNewReview}
        />
      ) : (
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
      )}
    </>
  )
}
export default CoursePage
