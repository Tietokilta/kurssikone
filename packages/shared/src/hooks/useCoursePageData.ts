import { useEffect, useRef, useState } from 'react'
import { Review, ReviewAverages, ReviewsAndCount } from '../types'

export type CoursePageApiHandlers = {
  getAveragesForCourse: (courseCode: string) => Promise<ReviewAverages | null>
  getReviewsForCourseExcludingUserReview: (
    courseCode: string,
    userId?: string
  ) => Promise<ReviewsAndCount | null>
  getUserReviewForCourse: (courseCode: string, userId: string) => Promise<Review | null>
}

export type CoursePageStorageHandlers = {
  getUserId: () => Promise<string | null> | string | null
  setUserId: (id: string) => Promise<void> | void
}

type UseCoursePageDataParams = {
  courseCode: string | undefined
  api: CoursePageApiHandlers
  storage: CoursePageStorageHandlers
}

export type UseCoursePageDataResult = {
  userId: string | null
  otherReviewsAndCount: ReviewsAndCount | null
  averages: ReviewAverages | null
  isLoading: boolean
  hasError: boolean
  isMakingNewReview: boolean
  userReview: Review | null
  setIsMakingNewReview: (value: boolean) => void
  fetchAndSetUserReview: (courseCode: string, userId: string) => Promise<void>
  fetchAndSetAverages: (courseCode: string) => Promise<void>
  refetchData: () => Promise<void>
  setUserIdInStorage: (id: string) => Promise<void>
}

export const useCoursePageData = ({
  courseCode,
  api,
  storage,
}: UseCoursePageDataParams): UseCoursePageDataResult => {
  const [userId, setUserId] = useState<string | null>(null)
  const [otherReviewsAndCount, setOtherReviewsAndCount] = useState<ReviewsAndCount | null>(null)
  const [averages, setAverages] = useState<ReviewAverages | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isMakingNewReview, setIsMakingNewReview] = useState(false)
  const [userReview, setUserReview] = useState<Review | null>(null)

  const apiRef = useRef(api)
  const storageRef = useRef(storage)

  useEffect(() => {
    apiRef.current = api
    storageRef.current = storage
  })

  const fetchAndSetUserReview = async (code: string, uid: string) => {
    const newUserReview = await apiRef.current.getUserReviewForCourse(code, uid)
    setUserReview(newUserReview)
  }

  const fetchAndSetOtherReviews = async (code: string, uid?: string) => {
    const reviewsAndCount = await apiRef.current.getReviewsForCourseExcludingUserReview(code, uid)
    setOtherReviewsAndCount(reviewsAndCount)
  }

  const fetchAndSetAverages = async (code: string) => {
    const newAverages = await apiRef.current.getAveragesForCourse(code)
    setAverages(newAverages)
  }

  const getUserIdAndFetchData = async () => {
    const storedUserId = await Promise.resolve(storageRef.current.getUserId())

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

  const setUserIdInStorage = async (id: string) => {
    await Promise.resolve(storageRef.current.setUserId(id))
  }

  const refetchData = async () => {
    if (!courseCode) {
      return
    }

    try {
      await getUserIdAndFetchData()
      setHasError(false)
    } catch (error) {
      console.error('Failed to refetch course page data:', error)
      setHasError(true)
    }
  }

  useEffect(() => {
    if (!courseCode) {
      setIsLoading(false)
      setHasError(false)
      return
    }

    setIsLoading(true)
    setHasError(false)

    const load = async () => {
      try {
        await getUserIdAndFetchData()
      } catch (error) {
        console.error('Failed to fetch course page data:', error)
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseCode])

  return {
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
  }
}
