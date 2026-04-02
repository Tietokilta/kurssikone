import { NewReview, Review, ReviewAverages, ReviewsAndCount } from '@kurssikompassi/shared'
import hashIt from 'hash-it'

const get = async (
  pathParts: string[],
  query: { [key: string]: string | undefined | null } = {}
) => {
  const res = await chrome.runtime.sendMessage({ type: 'get', pathParts, query })
  return res as { [key: string]: any } | null
}

const post = async (pathParts: string[], body: { [key: string]: any }) => {
  await chrome.runtime.sendMessage({ type: 'post', pathParts, body })
}

const del = async (pathParts: string[], body: { [key: string]: any }) => {
  await chrome.runtime.sendMessage({ type: 'delete', pathParts, body })
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
