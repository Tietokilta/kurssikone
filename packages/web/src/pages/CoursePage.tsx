import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  CoursePageContent,
  useCoursePageData,
  CourseWithRealisations,
  GENERIC_ERROR_MESSAGE,
} from '@kurssikone/shared'
import {
  getAveragesForCourse,
  getReviewsForCourseExcludingUserReview,
  getUserReviewForCourse,
  getUser,
  makeUser,
  makeOrEditReview,
  deleteReview,
  getCourseByCode,
} from '../api/client'
import { getUserId, setUserId } from '../utils/userStorage'
import CourseInfo from '../components/CourseInfo'

const CoursePage = () => {
  const { courseCode } = useParams<{ courseCode: string }>()
  const [courseData, setCourseData] = useState<CourseWithRealisations | null>(null)
  const [isCourseLoading, setIsCourseLoading] = useState(true)
  const [hasCourseFetchError, setHasCourseFetchError] = useState(false)

  const {
    userId,
    otherReviewsAndCount,
    averages,
    isLoading,
    hasError,
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

  useEffect(() => {
    if (!courseCode) return

    const fetchCourseData = async () => {
      setIsCourseLoading(true)
      setHasCourseFetchError(false)
      try {
        const courses = await getCourseByCode(courseCode)
        if (courses && courses.length > 0) {
          // Merge all realisations from all course versions into the first course
          const allRealisations = courses.flatMap((c) => c.courseRealisations || [])
          const mergedCourse = {
            ...courses[0],
            courseRealisations: allRealisations,
          }
          setCourseData(mergedCourse)
        } else {
          setCourseData(null)
        }
      } catch (error) {
        console.error('Failed to fetch course data:', error)
        setCourseData(null)
        setHasCourseFetchError(true)
      } finally {
        setIsCourseLoading(false)
      }
    }

    fetchCourseData()
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

  if (hasError) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600">{GENERIC_ERROR_MESSAGE}</p>
      </div>
    )
  }

  if (isLoading || !otherReviewsAndCount || !averages) {
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
          &larr; Back to courses
        </Link>
      </div>

      <h1 className="text-2xl font-medium mb-6">{courseCode}</h1>

      {isCourseLoading ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <p className="text-gray-500">Loading course information...</p>
        </div>
      ) : hasCourseFetchError ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
          <p className="text-gray-600 text-sm">{GENERIC_ERROR_MESSAGE}</p>
        </div>
      ) : courseData ? (
        <CourseInfo course={courseData} />
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <p className="text-yellow-800 text-sm">
            Course information not available. This course may not be in the Sisu system.
          </p>
        </div>
      )}

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
