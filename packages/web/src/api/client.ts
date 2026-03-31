import { NewReview, Review, ReviewAverages, ReviewsAndCount } from '../types'
import hashIt from 'hash-it'

const host = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

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
