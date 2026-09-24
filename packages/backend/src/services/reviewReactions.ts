import { Op } from 'sequelize'
import { ReviewReaction, REACTION_TYPES, ReactionType } from '../models/reviewReaction'
import { hashUserId } from '../utils/hashUserId'

export type ReactionCounts = Record<ReactionType, number>

export type SortableReview = {
  id: number
  learnings?: string | null
  tasks?: string | null
  otherInfo?: string | null
  year?: number | null
  timestampCreated: number
  reactionCounts: ReactionCounts
}

export const emptyReactionCounts = (): ReactionCounts => ({
  helpful: 0,
  agree: 0,
  disagree: 0,
  funny: 0,
  outdated: 0,
})

export const isReactionType = (value: unknown): value is ReactionType =>
  typeof value === 'string' && (REACTION_TYPES as readonly string[]).includes(value)

export const reviewHasText = (review: {
  learnings?: string | null
  tasks?: string | null
  otherInfo?: string | null
}): boolean =>
  [review.learnings, review.tasks, review.otherInfo].some((text) => !!text && text.trim() !== '')

/** Outdated counts against helpful; never below 0. */
const helpfulScore = ({ helpful, outdated }: ReactionCounts) => Math.max(0, helpful - outdated)

/** Disagree and outdated count against agree; never below 0. */
const agreeScore = ({ agree, disagree, outdated }: ReactionCounts) =>
  Math.max(0, agree - disagree - outdated)

/**
 * Sort priority (highest first): has text, helpful score, agree score, latest year,
 * most recent, funniest.
 */
export const compareReviews = (a: SortableReview, b: SortableReview): number =>
  Number(reviewHasText(b)) - Number(reviewHasText(a)) ||
  helpfulScore(b.reactionCounts) - helpfulScore(a.reactionCounts) ||
  agreeScore(b.reactionCounts) - agreeScore(a.reactionCounts) ||
  (b.year ?? -Infinity) - (a.year ?? -Infinity) ||
  Number(b.timestampCreated) - Number(a.timestampCreated) ||
  b.reactionCounts.funny - a.reactionCounts.funny ||
  b.id - a.id

export const getReactionCounts = async (
  reviewIds: number[]
): Promise<Map<number, ReactionCounts>> => {
  const counts = new Map<number, ReactionCounts>(
    reviewIds.map((id) => [id, emptyReactionCounts()])
  )
  if (reviewIds.length === 0) return counts

  const rows = (await ReviewReaction.count({
    where: { reviewId: { [Op.in]: reviewIds } },
    group: ['reviewId', 'type'],
  })) as unknown as { reviewId: number; type: string; count: number }[]

  for (const { reviewId, type, count } of rows) {
    const reviewCounts = counts.get(reviewId)
    if (reviewCounts && isReactionType(type)) {
      reviewCounts[type] = Number(count)
    }
  }
  return counts
}

export const getReactionsByReactor = async (
  reviewIds: number[],
  rawReactorId: string
): Promise<Map<number, ReactionType[]>> => {
  const result = new Map<number, ReactionType[]>(reviewIds.map((id) => [id, []]))
  if (reviewIds.length === 0) return result

  const rows = await ReviewReaction.findAll({
    where: { reviewId: { [Op.in]: reviewIds }, reactorId: hashUserId(rawReactorId) },
    attributes: ['reviewId', 'type'],
  })
  for (const { reviewId, type } of rows) {
    result.get(reviewId)?.push(type)
  }
  return result
}
