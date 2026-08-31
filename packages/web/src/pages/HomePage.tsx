import { useState, useEffect, useRef, useCallback } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  Course,
  CourseListSortBy,
  ListSortOrder,
  CourseFilterOptions,
  CourseFilters,
} from '@kurssikone/shared'
import { getCourses, getFilterOptions } from '../api/client'
import CourseCard from '../components/CourseCard'
import CourseFilterPanel from '../components/CourseFilterPanel'
import { isFirefox } from 'react-device-detect'

const COURSES_PER_PAGE = 20
const EXTENSION_ALERT_DISMISSED_KEY = 'kurssikone_extensionAlertDismissed'
const SESSION_SEARCH_KEY = 'kurssikone_searchSettings'

interface SearchSettings {
  searchQuery: string
  sortBy: CourseListSortBy
  sortOrder: ListSortOrder
  filters: CourseFilters
}

const loadSearchSettings = (): Partial<SearchSettings> => {
  try {
    const raw = sessionStorage.getItem(SESSION_SEARCH_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

const saveSearchSettings = (settings: SearchSettings) => {
  try {
    sessionStorage.setItem(SESSION_SEARCH_KEY, JSON.stringify(settings))
  } catch { /* ignore */ }
}

const HomePage = () => {
  const { t, i18n } = useTranslation()
  const savedSettings = useRef(loadSearchSettings()).current

  const [extensionAlertDismissed, setExtensionAlertDismissed] = useState(
    () => localStorage.getItem(EXTENSION_ALERT_DISMISSED_KEY) === 'true'
  )
  const [searchQuery, setSearchQuery] = useState(savedSettings.searchQuery ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(savedSettings.searchQuery ?? '')
  const [sortBy, setSortBy] = useState<CourseListSortBy>(savedSettings.sortBy ?? 'quality')
  const [sortOrder, setSortOrder] = useState<ListSortOrder>(savedSettings.sortOrder ?? 'desc')
  const [courses, setCourses] = useState<Course[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [filters, setFilters] = useState<CourseFilters>(savedSettings.filters ?? {})
  const [filterOptions, setFilterOptions] = useState<CourseFilterOptions | null>(null)

  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    saveSearchSettings({ searchQuery: debouncedSearch, sortBy, sortOrder, filters })
  }, [debouncedSearch, sortBy, sortOrder, filters])

  useEffect(() => {
    getFilterOptions().then(setFilterOptions).catch(console.error)
  }, [])

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
          sortOrder,
          filters
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
  }, [debouncedSearch, sortBy, sortOrder, filters])

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
        sortOrder,
        filters
      )
      setCourses((prev) => [...prev, ...result.courses])
      setOffset(newOffset)
    } catch (error) {
      console.error('Failed to load more courses:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, courses.length, total, offset, debouncedSearch, sortBy, sortOrder, filters])

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

  const isFi = i18n.language === 'fi'

  return (
    <div>
      <div className="flex items-center gap-1 mb-2">
        <img src="/icon-192x192.png" alt="KurssiKone logo" className="h-12 w-12" />
        <h1 className="text-2xl font-medium">KurssiKone</h1>
      </div>
      <p className="text-gray-600 mb-6">
        {t('web.siteDescription')}
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
            <Trans
              i18nKey="web.extensionBanner"
              components={{
                link: <a
                  href={
                    isFirefox
                      ? 'https://addons.mozilla.org/en-US/firefox/addon/kurssikone/'
                      : 'http://chromewebstore.google.com/detail/dfchpeehiilpkpikbmgkdfpenkdcpeim'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                />,
              }}
            />
          </p>

          <p>
            <Trans
              i18nKey="web.extensionTimeline"
              components={{ bold: <b /> }}
            />
          </p>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative w-full max-w-md">
          <label htmlFor="course-search" className="sr-only">
            {t('web.searchPlaceholder')}
          </label>
          <input
            id="course-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('web.searchPlaceholder')}
            className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              aria-label={t('web.clearSearch')}
            >
              &times;
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col text-sm text-gray-600 gap-1">
            <span>{t('web.sortBy')}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as CourseListSortBy)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 "
            >
              <option value="quality">{t('web.sortQuality')}</option>
              <option value="workload">{t('web.sortWorkload')}</option>
              <option value="alphabetical">{t('web.sortCourseCode')}</option>
              <option value="credits">{t('web.sortCredits')}</option>
            </select>
          </label>
          <label className="flex flex-col text-sm text-gray-600 gap-1">
            <span>{t('web.order')}</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as ListSortOrder)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 "
            >
              <option value="asc">↓</option>
              <option value="desc">↑</option>
            </select>
          </label>
        </div>
      </div>

      <CourseFilterPanel filters={filters} onChange={setFilters} filterOptions={filterOptions} />

      {isLoading ? (
        <div className="text-center py-10">
          <p className="text-gray-600">{t('web.loadingCourses')}</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-600">
            {debouncedSearch ? t('web.noCoursesFound') : t('web.noCoursesAvailable')}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {debouncedSearch
              ? t('web.foundCourses', { count: total })
              : t('web.courseCount', { count: total })}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} isFi={isFi} />
            ))}
          </div>

          <div ref={observerTarget} className="py-8 text-center">
            {isLoadingMore && <p className="text-gray-600">{t('web.loadingMore')}</p>}
            {!isLoadingMore && courses.length >= total && courses.length > 0 && (
              <p className="text-gray-400 text-sm">{t('web.allCoursesLoaded')}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default HomePage
