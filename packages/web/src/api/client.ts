import {
  NewReview,
  Review,
  ReviewAverages,
  ReviewsAndCount,
  CoursesResponse,
  CoursesByIdsResponse,
  Course,
  CourseListSortBy,
  ListSortOrder,
  CourseWithRealisations,
  CourseRealisation,
  TenttiarkistoCourse,
} from '@kurssikone/shared'
import hashIt from 'hash-it'

const host = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function toNumberOrNull(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizeCourseRecord(raw: Record<string, unknown>): Course {
  return {
    ...(raw as unknown as Course),
    avgQualityScore: toNumberOrNull(raw.avgQualityScore),
    avgWorkloadScore: toNumberOrNull(raw.avgWorkloadScore),
    reviewCount: Number(raw.reviewCount ?? 0),
  }
}

const get = async (
  pathParts: string[],
  query: { [key: string]: string | undefined | null } = {}
) => {
  let url = `${host}/${pathParts.join('/')}`

  for (const param in { ...query }) {
    if (query[param] === undefined || query[param] === null || query[param] === '') {
      delete query[param]
    }
  }

  const queryString = new URLSearchParams(query as { [key: string]: string }).toString()

  url += queryString ? `?${queryString}` : ''

  const response = await fetch(url)

  if (response.status === 404) {
    return null
  }

  return await response.json()
}

const post = async (pathParts: string[], body: { [key: string]: unknown }) => {
  const url = `${host}/${pathParts.join('/')}`

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

const del = async (pathParts: string[], body: { [key: string]: unknown }) => {
  const url = `${host}/${pathParts.join('/')}`

  await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

export const getReviewsForCourseExcludingUserReview = async (
  courseCode: string,
  userId?: string
) => {
  return (await get(['reviews', 'course', courseCode], {
    userIdToExclude: userId,
  })) as ReviewsAndCount | null
}

export const getAveragesForCourse = async (courseCode: string) => {
  const json = await get(['reviews', 'course', courseCode, 'averages'])

  if (!json) {
    return null
  }

  Object.entries(json).forEach(([key, value]) => {
    json[key] = Number(value)
  })

  return json as ReviewAverages
}

export const getUserReviewForCourse = async (courseCode: string, userId: string) => {
  return (await get(['reviews', 'course', courseCode, 'user', userId])) as Review | null
}

export const getUser = async (userId: string) => {
  return await get(['users', userId])
}

export const makeUser = async (userId: string) => {
  const hash = hashIt({ userId })
  await post(['users'], { id: userId, hash })
}

export const makeOrEditReview = async (newReview: NewReview) => {
  const { userId, courseCode } = newReview
  const hash = hashIt({ userId, courseCode })
  await post(['reviews'], { ...newReview, hash })
}

export const deleteReview = async (reviewId: number, userId: string) => {
  const body = { id: reviewId, userId }
  await del(['reviews', reviewId.toString()], {
    hash: hashIt(body),
    ...body,
  })
}

export const getCourses = async (
  search?: string,
  limit?: number,
  offset?: number,
  sortBy?: CourseListSortBy,
  sortOrder?: ListSortOrder
): Promise<CoursesResponse> => {
  const result = (await get(['courses'], {
    search: search || null,
    limit: limit?.toString() || null,
    offset: offset?.toString() || null,
    sortBy: sortBy || null,
    sortOrder: sortOrder || null,
  })) as CoursesResponse | null
  if (!result) {
    return { courses: [], total: 0, limit: limit ?? 50, offset: offset ?? 0 }
  }
  return {
    ...result,
    courses: result.courses.map((c) =>
      normalizeCourseRecord(c as unknown as Record<string, unknown>)
    ),
  }
}

export const getCoursesByIds = async (ids: string[]): Promise<Course[]> => {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return []

  const result = (await get(['courses'], {
    ids: unique.join(','),
  })) as CoursesByIdsResponse | null
  if (!result?.courses) return []
  return result.courses.map((c) => normalizeCourseRecord(c as unknown as Record<string, unknown>))
}

export const getCourseByCode = async (code: string): Promise<CourseWithRealisations[] | null> => {
  const rows = (await get(['courses', code])) as CourseWithRealisations[] | null
  if (!rows) return null
  return rows.map((c) => ({
    ...normalizeCourseRecord(c as unknown as Record<string, unknown>),
    courseRealisations: c.courseRealisations ?? [],
  }))
}

export const getCourseRealisations = async (code: string): Promise<CourseRealisation[]> => {
  const result = await get(['courses', code, 'realisations'])
  return (result || []) as CourseRealisation[]
}

export const getExamsForCourse = async (courseCode: string): Promise<TenttiarkistoCourse | null> =>
  get(['exams', courseCode]) as Promise<TenttiarkistoCourse | null>
