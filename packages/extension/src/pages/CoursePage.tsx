import { Component, ErrorInfo, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CoursePageContent, useCoursePageData } from '@kurssikone/shared'
import {
  getAveragesForCourse,
  getReviewsForCourseExcludingUserReview,
  getUserReviewForCourse,
  getUser,
  makeUser,
  makeOrEditReview,
  deleteReview,
  addReaction,
  removeReaction,
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
          {this.state.error?.message || 'Something went wrong'}
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

const getAnonymousReactorId = async (): Promise<string> => {
  const result = await chrome.storage.sync.get('anonymousReactorId')
  if (result.anonymousReactorId) {
    return result.anonymousReactorId
  }
  const id = crypto.randomUUID()
  await chrome.storage.sync.set({ anonymousReactorId: id })
  return id
}

const CoursePageInner = ({ courseCode }: Props) => {
  const { t } = useTranslation()
  const {
    userId,
    reactorId,
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
      getUserId: getUserIdFromStorage,
      setUserId: setUserIdInStorageFunc,
      getAnonymousReactorId,
    },
  })

  if (!courseCode) {
    return <div className="p-4 text-gray-600">{t('extension.courseCodeNotFound')}</div>
  }

  if (hasError) {
    return <div className="p-4 text-gray-600">{t('shared.genericError')}</div>
  }

  if (isLoading || !otherReviewsAndCount || !averages) {
    return <div className="p-4 text-gray-600">{t('shared.loading')}</div>
  }

  return (
    <CoursePageContent
      courseCode={courseCode}
      userId={userId}
      reactorId={reactorId}
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
      addReaction={addReaction}
      removeReaction={removeReaction}
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
