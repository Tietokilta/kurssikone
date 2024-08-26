import { NewReview } from './types'
import hashIt from 'hash-it'

const isProduction = false

const host = isProduction
  ? 'https://sisu-course-reviewer-api.otju.dev/api'
  : 'http://localhost:3001/api'

const get = async (
  pathParts: string[],
  query: { [key: string]: string | undefined | null } = {}
) => {
  let url = `${host}/${pathParts.join('/')}`

  for (let param in { ...query }) {
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

export const getReviewsForCourseExcludingUserReview = async (
  courseCode: string,
  userId?: string
) => {
  return await get(['reviews', 'course', courseCode], { userIdToExclude: userId })
}

export const getAveragesForCourse = async (courseCode: string) => {
  const json = await get(['reviews', 'course', courseCode, 'averages'])
  Object.entries(json).forEach(([key, value]) => {
    json[key] = Number(value)
  })
  return json
}

export const getUserReviewForCourse = async (courseCode: string, userId: string) => {
  return await get(['reviews', 'course', courseCode, 'user', userId])
}

export const getUser = async (userId: string) => {
  return await get(['users', userId])
}

export const makeUser = async (userId: string) => {
  const hash = hashIt({ userId })
  await fetch(`${host}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: userId, hash }),
  })
}

export const makeOrEditReview = async (newReview: NewReview) => {
  const { userId, courseCode } = newReview
  const hash = hashIt({ userId, courseCode })
  await fetch(`${host}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...newReview, hash }),
  })
}
