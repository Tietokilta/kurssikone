import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import RoundMeter from '../components/RoundMeter'
import {
  getAveragesForCourse,
  getReviewsForCourseExcludingUserReview,
  getUserReviewForCourse,
} from '../api/client'
import { Review, ReviewAverages, ReviewsAndCount } from '../types'
import ReviewMakeForm from '../components/ReviewMakeForm'
import ReviewItem from '../components/ReviewItem'
import Divider from '../components/Divider'
import NewAccountNotification from '../components/NewAccountNotification'
import { scoreTypes } from '../utils/constants'
import { getUserId } from '../utils/userStorage'

const CoursePage = () => {
  const { courseCode } = useParams<{ courseCode: string }>()
  const [userId, setUserId] = useState<string | null>(null)
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
      setUserId(storedUserId)
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
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Course code not found</h2>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 20 }}>
          Go to Home
        </Link>
      </div>
    )
  }

  if (!otherReviewsAndCount || !averages) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>Loading...</p>
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
      <div style={{ marginBottom: 20 }}>
        <Link to="/" style={{ fontSize: 14 }}>
          &larr; Back to search
        </Link>
      </div>

      <h1 style={{ marginBottom: 30, fontSize: 28 }}>Course: {courseCode}</h1>

      <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBottom: 30 }}>
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
          className="btn btn-secondary btn-sm"
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
              updateLocalState={getUserIdAndFetchData}
              setIsMakingNewReview={setIsMakingNewReview}
            />
            <Divider />
          </>
        ))}

      <dl className="fill-by-column">
        {userReview && (
          <ReviewItem review={userReview} scoreTypes={scoreTypesWithValues} isUserReview />
        )}
        {reviews.map((review) => (
          <ReviewItem key={review.id} review={review} scoreTypes={scoreTypesWithValues} />
        ))}
      </dl>

      {reviewCount === 0 && (
        <p style={{ padding: 20, color: '#666' }}>
          No reviews yet. Be the first to write a review!
        </p>
      )}
    </div>
  )
}

export default CoursePage
