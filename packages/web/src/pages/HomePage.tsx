import { useState, useEffect, useRef, useCallback } from 'react'
import { Course, CourseListSortBy, ListSortOrder } from '@kurssikone/shared'
import { getCourses } from '../api/client'
import CourseCard from '../components/CourseCard'
import AdminBar from '../components/AdminBar'
import { isFirefox } from 'react-device-detect'

const COURSES_PER_PAGE = 20
const EXTENSION_ALERT_DISMISSED_KEY = 'kurssikone_extensionAlertDismissed'

const HomePage = () => {
  const [extensionAlertDismissed, setExtensionAlertDismissed] = useState(
    () => localStorage.getItem(EXTENSION_ALERT_DISMISSED_KEY) === 'true'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState<CourseListSortBy>('quality')
  const [sortOrder, setSortOrder] = useState<ListSortOrder>('desc')
  const [courses, setCourses] = useState<Course[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setOffset(0)
    setCourses([])
    setIsLoading(true)

    const fetchInitial = async () => {
      try {
        const result = await getCourses(
          debouncedSearch || undefined,
          COURSES_PER_PAGE,
          0,
          sortBy,
          sortOrder
        )
        setCourses(result.courses)
        setTotal(result.total)
      } catch (error) {
        console.error('Failed to fetch courses:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitial()
  }, [debouncedSearch, sortBy, sortOrder])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || courses.length >= total) return

    setIsLoadingMore(true)
    const newOffset = offset + COURSES_PER_PAGE

    try {
      const result = await getCourses(
        debouncedSearch || undefined,
        COURSES_PER_PAGE,
        newOffset,
        sortBy,
        sortOrder
      )
      setCourses((prev) => [...prev, ...result.courses])
      setOffset(newOffset)
    } catch (error) {
      console.error('Failed to load more courses:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, courses.length, total, offset, debouncedSearch, sortBy, sortOrder])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && !isLoadingMore && courses.length < total) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const target = observerTarget.current
    if (target) {
      observer.observe(target)
    }

    return () => {
      if (target) {
        observer.unobserve(target)
      }
    }
  }, [loadMore, isLoading, isLoadingMore, courses.length, total])

  const dismissExtensionAlert = () => {
    localStorage.setItem(EXTENSION_ALERT_DISMISSED_KEY, 'true')
    setExtensionAlertDismissed(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-medium">KurssiKone</h1>
        <AdminBar />
      </div>
      <p className="text-gray-600 mb-6">
        Find and share course reviews, exams & information for Aalto University courses
      </p>

      {!extensionAlertDismissed && (
        <div className="relative mb-4 bg-gray-300 p-4 pr-10 rounded-lg">
          <button
            type="button"
            onClick={dismissExtensionAlert}
            className="absolute top-1 right-2 p-1 text-gray-600 hover:text-gray-900 leading-none"
            aria-label="Dismiss notification"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
          <p>
            KurssiKone is also available as a{' '}
            <a
              href={
                isFirefox
                  ? 'https://addons.mozilla.org/en-US/firefox/addon/kurssikone/'
                  : 'http://chromewebstore.google.com/detail/dfchpeehiilpkpikbmgkdfpenkdcpeim'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              browser extension
            </a>{' '}
            for Firefox & Chrome.
          </p>

          <p>
            The extension also features a more user friendly <b>Timeline</b> view (<b>Ajoitus</b>
            -näkymä).
          </p>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full max-w-md">
          <label htmlFor="course-search" className="sr-only">
            Search courses
          </label>
          <input
            id="course-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses by code or name..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col text-sm text-gray-600 gap-1">
            <span>Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as CourseListSortBy)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[11rem]"
            >
              <option value="quality">Quality</option>
              <option value="workload">Workload</option>
              <option value="alphabetical">Course code</option>
              <option value="credits">Credits</option>
            </select>
          </label>
          <label className="flex flex-col text-sm text-gray-600 gap-1">
            <span>Order</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as ListSortOrder)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[9rem]"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10">
          <p className="text-gray-600">Loading courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-600">
            {debouncedSearch ? 'No courses found matching your search.' : 'No courses available.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {debouncedSearch
              ? `Found ${total} course${total !== 1 ? 's' : ''}`
              : `${total} courses`}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          <div ref={observerTarget} className="py-8 text-center">
            {isLoadingMore && <p className="text-gray-600">Loading more...</p>}
            {!isLoadingMore && courses.length >= total && courses.length > 0 && (
              <p className="text-gray-400 text-sm">All courses loaded</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default HomePage
