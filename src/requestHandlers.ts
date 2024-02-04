import { NewReview } from './types'
import hashIt from 'hash-it'

export const getReviewsForCourseExcludingUserReview = async (
  courseCode: string,
  userId: number
) => {
  const response = await fetch(
    `http://localhost:3001/api/reviews/course/${courseCode}/notUser/${userId}`
  )
  const json = await response.json()
  return json
}

export const getAveragesForCourse = async (courseCode: string) => {
  const response = await fetch(`http://localhost:3001/api/reviews/course/${courseCode}/averages`)
  const json = await response.json()
  Object.entries(json).forEach(([key, value]) => {
    json[key] = Number(value)
  })
  return json
}

export const getUserReviewForCourse = async (courseCode: string, userId: number) => {
  const response = await fetch(
    `http://localhost:3001/api/reviews/course/${courseCode}/user/${userId}`
  )
  if (response.status === 404) {
    return null
  }
  const json = await response.json()
  return json
}

export const getUser = async (userId: number) => {
  return await fetch(`http://localhost:3001/api/users/${userId}`)
}

export const makeUser = async (userId: number) => {
  const hash = hashIt({ userId })
  await fetch('http://localhost:3001/api/users', {
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
  await fetch('http://localhost:3001/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...newReview, hash }),
  })
}
