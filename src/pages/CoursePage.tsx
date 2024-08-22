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
  const [userId, setUserId] = useState<number | null>(null)
  const [courseCode, setCourseCode] = useState<string | null>(null)
  const [otherReviewsAndCount, setOtherReviewsAndCount] = useState<ReviewsAndCount | null>(null)
  const [averages, setAverages] = useState<ReviewAverages | null>(null)
  const [isMakingNewReview, setIsMakingNewReview] = useState(false)
  const [userReview, setUserReview] = useState<Review | null>(null)

  const fetchAndSetUserReview = async (courseCode: string, userId: number) => {
    const newUserReview = await getUserReviewForCourse(courseCode, userId)
    setUserReview(newUserReview)
  }

  const fetchAndSetOtherReviews = async (courseCode: string, userId: number) => {
    const reviewsAndCount = await getReviewsForCourseExcludingUserReview(courseCode, userId)
    setOtherReviewsAndCount(reviewsAndCount)
  }

  const fetchAndSetAverages = async (courseCode: string) => {
    const newAverages = await getAveragesForCourse(courseCode)
    setAverages(newAverages)
  }

  useEffect(() => {
    const inner = async () => {
      const newUserId = Number((await browser.storage?.local.get('userId')).userId)
      const newCourseCode = (await browser.storage.local.get('currentCourseCode'))
        .currentCourseCode as string
      await fetchAndSetUserReview(newCourseCode, newUserId)
      await fetchAndSetOtherReviews(newCourseCode, newUserId)
      await fetchAndSetAverages(newCourseCode)
      setUserId(newUserId)
      setCourseCode(newCourseCode)
    }
    inner()
  }, [])

  if (!otherReviewsAndCount || !userId || !averages) {
    return <div>Loading...</div>
  }

  const { reviews, count: reviewCount } = otherReviewsAndCount

  const scoreTypes = [
    { name: 'Quality', field: 'qualityScore', value: averages.qualityAverage },
    { name: 'Workload', field: 'workloadScore', value: averages.workloadAverage },
    {
      name: 'Difficulty',
      field: 'difficultyScore',
      value: averages.difficultyAverage,
    },
  ]

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
          onClick={() => setIsMakingNewReview((oldVal) => !oldVal)}
        >
          {isMakingNewReview ? '- Cancel' : userReview ? '+ Edit your review' : '+ Write a Review'}
        </button>
      </span>
      <div className="divider" />
      {isMakingNewReview ? (
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
