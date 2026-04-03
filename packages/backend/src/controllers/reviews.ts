import { Router } from 'express'
import { Review, User } from '../models'
import { sequelize } from '../utils/db'
import { Op } from 'sequelize'
import hashIt from 'hash-it'
import { refreshCourseReviewAggregates } from '../services/reviewAggregates'

const router = Router()

router.get('/', async (req, res) => {
  const secret = req.query.secret

  if (process.env.GET_ALL_SECRET && secret === process.env.GET_ALL_SECRET) {
    const reviews = await Review.findAll({ attributes: { exclude: ['userId'] } })
    const userCount = await User.count()
    res.json({ userCount, reviews })
  } else {
    res.status(404).end()
  }
})

router.post('/', async (req, res) => {
  try {
    const { hash, ...review } = req.body
    const correctHash = hashIt({ userId: review.userId, courseCode: review.courseCode })
    if (hash === correctHash) {
      const [newReview] = await Review.upsert({ ...review })
      await refreshCourseReviewAggregates(review.courseCode)
      res.json(newReview)
    } else {
      res.status(400).end()
    }
  } catch (error) {
    console.error(error)
    res.status(400).json({ error })
  }
})

router.delete('/:id', async (req, res) => {
  const { hash, ...review } = req.body
  const correctHash = hashIt({ userId: review.userId, id: review.id })
  const id = Number(req.params.id)
  if (hash === correctHash && req.params.id && review.id === id) {
    const existing = await Review.findByPk(id)
    if (!existing) {
      return res.status(400).end()
    }
    await Review.destroy({ where: { id: id } })
    await refreshCourseReviewAggregates(existing.courseCode)
    res.status(204).end()
  } else {
    res.status(400).end()
  }
})

router.get('/course/:courseCode/user/:userId', async (req, res) => {
  const courseCode = req.params.courseCode
  const userId = req.params.userId
  if (!courseCode || !userId) {
    res.status(400).end()
    return
  }
  const review = await Review.findOne({
    where: { courseCode, userId: userId },
    attributes: { exclude: ['userId'] },
  })
  if (review) {
    res.json(review)
  } else {
    res.status(404).end()
  }
})

router.get('/course/:courseCode/', async (req, res) => {
  const courseCode = req.params.courseCode
  const userIdToExclude = req.query.userIdToExclude

  if (!courseCode) {
    res.status(400).end()
    return
  }
  const query = {
    where: {
      courseCode: req.params.courseCode,
    },
    attributes: {
      exclude: ['userId'],
    },
  }

  if (userIdToExclude) {
    // @ts-expect-error - dynamically adding where clause
    query.where.userId = {
      [Op.not]: userIdToExclude,
    }
  }

  const reviews = await Review.findAndCountAll(query)
  if (reviews) {
    const { rows, count } = reviews
    res.json({ reviews: rows, count })
  } else {
    res.status(404).end()
  }
})

const getAverageScores = async (courseCode: string) => {
  return (await Review.findOne({
    where: { courseCode: courseCode },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('workload_score')), 'workloadAverage'],
      [sequelize.fn('AVG', sequelize.col('quality_score')), 'qualityAverage'],
    ],
  })) as unknown as {
    workLoadAverage: number
    qualityAverage: number
  } | null
}

router.get('/course/:courseCode/averages', async (req, res) => {
  const averages = await getAverageScores(req.params.courseCode)
  if (averages) {
    res.json(averages)
  } else {
    res.status(404).end()
  }
})

export default router
