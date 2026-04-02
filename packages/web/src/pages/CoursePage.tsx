import { useParams, Link } from 'react-router-dom'
import { CoursePageContent, useCoursePageData } from '@kurssikompassi/shared'
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

  const {
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
  } = useCoursePageData({
    courseCode,
    api: {
      getAveragesForCourse,
      getReviewsForCourseExcludingUserReview,
      getUserReviewForCourse,
    },
    storage: {
      getUserId,
      setUserId,
    },
  })

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

  return (
    <div>
      <div className="mb-4">
        <Link to="/" className="text-blue-600 underline hover:text-blue-800">
          &larr; Back to search
        </Link>
      </div>

      <h1 className="text-2xl font-medium mb-6">Course: {courseCode}</h1>

      <CoursePageContent
        courseCode={courseCode}
        userId={userId}
        otherReviewsAndCount={otherReviewsAndCount}
        averages={averages}
        isMakingNewReview={isMakingNewReview}
        userReview={userReview}
        setIsMakingNewReview={setIsMakingNewReview}
        fetchAndSetUserReview={fetchAndSetUserReview}
        fetchAndSetAverages={fetchAndSetAverages}
        refetchData={refetchData}
        setUserIdInStorage={setUserIdInStorage}
        getUser={getUser}
        makeUser={makeUser}
        makeOrEditReview={makeOrEditReview}
        deleteReview={deleteReview}
      />
    </div>
  )
}

export default CoursePage
