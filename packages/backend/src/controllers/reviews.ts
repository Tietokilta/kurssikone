import { Router } from 'express'
import { Review, ReviewReaction } from '../models'
import { ReactionType } from '../models/reviewReaction'
import { sequelize } from '../utils/db'
import { Op } from 'sequelize'
import hashIt from 'hash-it'
import { refreshCourseReviewAggregates } from '../services/reviewAggregates'
import { hashUserId } from '../utils/hashUserId'
import {
  compareReviews,
  getReactionCounts,
  getReactionsByReactor,
  isReactionType,
  reviewHasText,
} from '../services/reviewReactions'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const { hash, ...review } = req.body
    const correctHash = hashIt({ userId: review.userId, courseCode: review.courseCode })
    if (hash === correctHash) {
      const [newReview] = await Review.upsert({ ...review, userId: hashUserId(review.userId) })
      await refreshCourseReviewAggregates(review.courseCode)
      const reviewResponse = newReview.toJSON()
      delete (reviewResponse as Record<string, unknown>).userId
      res.json(reviewResponse)
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
    where: { courseCode, userId: hashUserId(userId) },
    attributes: { exclude: ['userId'] },
  })
  if (review) {
    const reactionCounts = await getReactionCounts([review.id])
    res.json({ ...review.toJSON(), reactionCounts: reactionCounts.get(review.id) })
  } else {
    res.status(404).end()
  }
})

router.get('/course/:courseCode/', async (req, res) => {
  const courseCode = req.params.courseCode
  const userIdToExclude = req.query.userIdToExclude
  const reactorId = req.query.reactorId

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
      [Op.not]: hashUserId(userIdToExclude as string),
    }
  }

  const reviews = await Review.findAndCountAll(query)
  if (reviews) {
    const { rows, count } = reviews
    const reviewIds = rows.map((review) => review.id)
    const reactionCounts = await getReactionCounts(reviewIds)
    const myReactions =
      typeof reactorId === 'string' && reactorId
        ? await getReactionsByReactor(reviewIds, reactorId)
        : null
    const reviewsWithReactions = rows
      .map((review) => ({
        ...(review.toJSON() as { id: number; timestampCreated: number }),
        reactionCounts: reactionCounts.get(review.id)!,
        ...(myReactions && { myReactions: myReactions.get(review.id) }),
      }))
      .sort(compareReviews)
    res.json({ reviews: reviewsWithReactions, count })
  } else {
    res.status(404).end()
  }
})

const parseReactionRequest = (reviewIdParam: string, body: Record<string, unknown>) => {
  const { reactorId, type, hash } = body
  const reviewId = Number(reviewIdParam)
  if (
    !Number.isInteger(reviewId) ||
    typeof reactorId !== 'string' ||
    !reactorId ||
    !isReactionType(type) ||
    hash !== hashIt({ reactorId, reviewId, type })
  ) {
    return null
  }
  return { reviewId, reactorHash: hashUserId(reactorId), type }
}

const reactionsResponse = async (reviewId: number, reactorHash: string) => {
  const [reactionCounts, myReactions] = await Promise.all([
    getReactionCounts([reviewId]),
    ReviewReaction.findAll({ where: { reviewId, reactorId: reactorHash }, attributes: ['type'] }),
  ])
  return {
    reactionCounts: reactionCounts.get(reviewId),
    myReactions: myReactions.map((reaction) => reaction.type),
  }
}

// Mutually exclusive pairs: agree/disagree and helpful/outdated
const oppositeReaction: Partial<Record<ReactionType, ReactionType>> = {
  agree: 'disagree',
  disagree: 'agree',
  helpful: 'outdated',
  outdated: 'helpful',
}

router.post('/:id/reactions', async (req, res) => {
  const request = parseReactionRequest(req.params.id, req.body)
  if (!request) {
    return res.status(400).end()
  }
  const { reviewId, reactorHash, type } = request

  const review = await Review.findByPk(reviewId)
  if (!review) {
    return res.status(404).end()
  }
  if (!reviewHasText(review.toJSON())) {
    return res.status(400).json({ error: 'Cannot react to a review without text' })
  }
  if (review.get('userId') === reactorHash) {
    return res.status(403).json({ error: 'Cannot react to own review' })
  }

  await sequelize.transaction(async (transaction) => {
    const opposite = oppositeReaction[type]
    if (opposite) {
      await ReviewReaction.destroy({
        where: { reviewId, reactorId: reactorHash, type: opposite },
        transaction,
      })
    }
    await ReviewReaction.findOrCreate({
      where: { reviewId, reactorId: reactorHash, type },
      defaults: { timestampCreated: Date.now() },
      transaction,
    })
  })

  res.json(await reactionsResponse(reviewId, reactorHash))
})

router.delete('/:id/reactions', async (req, res) => {
  const request = parseReactionRequest(req.params.id, req.body)
  if (!request) {
    return res.status(400).end()
  }
  const { reviewId, reactorHash, type } = request

  await ReviewReaction.destroy({ where: { reviewId, reactorId: reactorHash, type } })

  res.json(await reactionsResponse(reviewId, reactorHash))
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
