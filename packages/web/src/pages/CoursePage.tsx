import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CoursePageContent,
  ExamsContent,
  useCoursePageData,
  CourseWithRealisations,
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
  getExamsForCourse,
} from '../api/client'
import { getUserId, setUserId } from '../utils/userStorage'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import { deleteAdminReview } from '../api/adminClient'
import CourseInfo from '../components/CourseInfo'

type Tab = 'reviews' | 'exams'

const CoursePage = () => {
  const { courseCode } = useParams<{ courseCode: string }>()
  const { t } = useTranslation()
  const { token } = useAdminAuth()
  const [activeTab, setActiveTab] = useState<Tab>('reviews')
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
        <h2 className="text-xl font-medium mb-4">{t('web.courseCodeNotFound')}</h2>
        <Link
          to="/"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {t('web.goToHome')}
        </Link>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600">{t('shared.genericError')}</p>
      </div>
    )
  }

  if (isLoading || !otherReviewsAndCount || !averages) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600">{t('shared.loading')}</p>
      </div>
    )
  }

  const tabLabels: Record<Tab, string> = {
    reviews: t('shared.reviews'),
    exams: t('shared.exams'),
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/" className="text-blue-600 underline hover:text-blue-800">
          {t('web.backToCourses')}
        </Link>
      </div>

      <h1 className="text-2xl font-medium mb-6">{courseCode}</h1>

      {isCourseLoading ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <p className="text-gray-500">{t('web.loadingCourseInfo')}</p>
        </div>
      ) : hasCourseFetchError ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
          <p className="text-gray-600 text-sm">{t('shared.genericError')}</p>
        </div>
      ) : courseData ? (
        <CourseInfo course={courseData} />
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <p className="text-yellow-800 text-sm">
            {t('web.courseInfoUnavailable')}
          </p>
        </div>
      )}

      <div className="flex gap-0 mb-6 border-b border-gray-200">
        {(['reviews', 'exams'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'reviews' && (
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
          onAdminDelete={token ? async (reviewId: number) => {
            if (!window.confirm(t('web.deleteReviewConfirm'))) return
            await deleteAdminReview(token, reviewId)
            await refetchData()
          } : undefined}
        />
      )}

      {activeTab === 'exams' && (
        <ExamsContent courseCode={courseCode} getExams={getExamsForCourse} />
      )}
    </div>
  )
}

export default CoursePage
