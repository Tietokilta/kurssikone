import { useState, useEffect, useRef, useCallback } from 'react'
import { Course } from '@kurssikompassi/shared'
import { getCourses } from '../api/client'
import CourseCard from '../components/CourseCard'

const COURSES_PER_PAGE = 20

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
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
        const result = await getCourses(debouncedSearch || undefined, COURSES_PER_PAGE, 0)
        setCourses(result.courses)
        setTotal(result.total)
      } catch (error) {
        console.error('Failed to fetch courses:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitial()
  }, [debouncedSearch])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || courses.length >= total) return

    setIsLoadingMore(true)
    const newOffset = offset + COURSES_PER_PAGE

    try {
      const result = await getCourses(debouncedSearch || undefined, COURSES_PER_PAGE, newOffset)
      setCourses((prev) => [...prev, ...result.courses])
      setOffset(newOffset)
    } catch (error) {
      console.error('Failed to load more courses:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, courses.length, total, offset, debouncedSearch])

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

  return (
    <div>
      <h1 className="text-2xl font-medium mb-2">Kurssikompassi</h1>
      <p className="text-gray-600 mb-6">
        Find and share course reviews & information for Aalto University courses
      </p>

      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search courses by code or name..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
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
              : `Showing ${courses.length} of ${total} courses`}
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
