import { Component, ErrorInfo, ReactNode } from 'react'
import { CoursePageContent, useCoursePageData } from '@kurssikompassi/shared'
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

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CoursePage Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-600">
          Error: {this.state.error?.message || 'Something went wrong'}
        </div>
      )
    }
    return this.props.children
  }
}

const getUserIdFromStorage = async (): Promise<string | null> => {
  const result = await chrome.storage.sync.get('userId')
  return result.userId ?? null
}

const setUserIdInStorageFunc = async (id: string): Promise<void> => {
  await chrome.storage.sync.set({ userId: id })
}

const CoursePageInner = ({ courseCode }: Props) => {
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
      getUserId: getUserIdFromStorage,
      setUserId: setUserIdInStorageFunc,
    },
  })

  if (!courseCode) {
    return <div className="p-4 text-gray-600">Course code not found</div>
  }

  if (!otherReviewsAndCount || !averages) {
    return <div className="p-4 text-gray-600">Loading...</div>
  }

  return (
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
  )
}

const CoursePage = ({ courseCode }: Props) => {
  return (
    <ErrorBoundary>
      <CoursePageInner courseCode={courseCode} />
    </ErrorBoundary>
  )
}

export default CoursePage
