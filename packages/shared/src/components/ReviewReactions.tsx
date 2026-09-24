import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { reactionTypes } from '../constants'
import { ReactionState, ReactionType, Review } from '../types'

export type ReactionHandlers = {
  addReaction: (
    reviewId: number,
    reactorId: string,
    type: ReactionType
  ) => Promise<ReactionState | null>
  removeReaction: (
    reviewId: number,
    reactorId: string,
    type: ReactionType
  ) => Promise<ReactionState | null>
}

type Props = ReactionHandlers & {
  review: Review
  reactorId: string | null
  isUserReview?: boolean
}

// Mutually exclusive pairs: agree/disagree and helpful/outdated
const oppositeReaction: Partial<Record<ReactionType, ReactionType>> = {
  agree: 'disagree',
  disagree: 'agree',
  helpful: 'outdated',
  outdated: 'helpful',
}

const stateFromReview = (review: Review): ReactionState => ({
  reactionCounts: review.reactionCounts ?? {
    helpful: 0,
    agree: 0,
    disagree: 0,
    funny: 0,
    outdated: 0,
  },
  myReactions: review.myReactions ?? [],
})

const toggleReaction = (state: ReactionState, type: ReactionType): ReactionState => {
  const counts = { ...state.reactionCounts }
  let mine = [...state.myReactions]

  if (mine.includes(type)) {
    counts[type] -= 1
    mine = mine.filter((t) => t !== type)
  } else {
    const opposite = oppositeReaction[type]
    if (opposite && mine.includes(opposite)) {
      counts[opposite] -= 1
      mine = mine.filter((t) => t !== opposite)
    }
    counts[type] += 1
    mine.push(type)
  }
  return { reactionCounts: counts, myReactions: mine }
}

const ReviewReactions = ({
  review,
  reactorId,
  isUserReview,
  addReaction,
  removeReaction,
}: Props) => {
  const { t } = useTranslation()
  const [state, setState] = useState<ReactionState>(() => stateFromReview(review))

  useEffect(() => {
    setState(stateFromReview(review))
  }, [review])

  const disabled = isUserReview || !reactorId

  const onClick = async (type: ReactionType) => {
    if (isUserReview || !reactorId) return
    const previous = state
    const isRemoving = state.myReactions.includes(type)
    setState(toggleReaction(state, type))
    try {
      const handler = isRemoving ? removeReaction : addReaction
      const result = await handler(review.id, reactorId, type)
      if (result) {
        setState(result)
      }
    } catch (error) {
      console.error('Failed to update reaction:', error)
      setState(previous)
    }
  }

  return (
    <div
      className="flex flex-wrap gap-2"
      title={isUserReview ? t('shared.cannotReactToOwnReview') : undefined}
    >
      {reactionTypes.map(({ type, emoji, labelKey }) => {
        const isSelected = state.myReactions.includes(type)
        const count = state.reactionCounts[type]
        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            onClick={() => onClick(type)}
            className={`flex items-center gap-1 px-2.5 py-1 text-sm rounded-full border transition-colors ${
              isSelected
                ? 'border-blue-400 bg-blue-50 text-blue-800'
                : 'border-gray-300 text-gray-700'
            } ${disabled ? 'cursor-default opacity-70' : 'hover:bg-gray-100 cursor-pointer'}`}
          >
            <span aria-hidden>{emoji}</span>
            <span>{t(labelKey)}</span>
            {count > 0 && <span className="font-medium">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export default ReviewReactions
