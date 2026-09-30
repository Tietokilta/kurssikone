import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
  // Only one reaction per review: picking a new one replaces the previous one
  for (const previous of state.myReactions) {
    counts[previous] -= 1
  }
  const mine: ReactionType[] = state.myReactions.includes(type) ? [] : [type]
  if (mine.length > 0) {
    counts[type] += 1
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

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuListRef = useRef<HTMLDivElement>(null)
  const [openUpward, setOpenUpward] = useState(false)

  // Open the menu upward when it doesn't fit below the button but does fit above it
  useLayoutEffect(() => {
    if (!menuOpen || !menuRef.current || !menuListRef.current) return
    const anchor = menuRef.current.getBoundingClientRect()
    const menuHeight = menuListRef.current.offsetHeight
    const spaceBelow = window.innerHeight - anchor.bottom
    setOpenUpward(spaceBelow < menuHeight && anchor.top > spaceBelow)
  }, [menuOpen])

  // Close the menu on outside click or Escape. composedPath() is used because the
  // extension renders inside a shadow root, where event.target is retargeted.
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !event.composedPath().includes(menuRef.current)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

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

  const visibleReactions = reactionTypes.filter(({ type }) => state.reactionCounts[type] > 0)

  if (disabled && visibleReactions.length === 0) return null

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      title={isUserReview ? t('shared.cannotReactToOwnReview') : undefined}
    >
      {visibleReactions.map(({ type, icon, labelKey }) => {
        const isSelected = state.myReactions.includes(type)
        const count = state.reactionCounts[type]
        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            onClick={() => onClick(type)}
            title={t(labelKey)}
            aria-label={`${t(labelKey)} (${count})`}
            className={`flex flex-col items-center px-1 pt-1 rounded-[10px] border transition-colors ${
              isSelected
                ? 'border-blue-400 bg-blue-50 text-blue-800'
                : 'border-transparent text-gray-700'
            } ${disabled ? 'cursor-default opacity-70' : 'hover:bg-gray-100 cursor-pointer'}`}
          >
            <img src={icon} alt="" aria-hidden width={28} height={28} className="h-7 w-7" />
            <span className="text-xs font-semibold leading-4">{count}</span>
          </button>
        )
      })}
      {!disabled && (
        <div ref={menuRef} className="relative p-1">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            title={t('shared.addReaction')}
            aria-label={t('shared.addReaction')}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {menuOpen && (
            <div
              ref={menuListRef}
              role="menu"
              className={`absolute left-0 ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'} z-20 min-w-44 rounded-[10px] border border-gray-200 bg-white py-1 shadow-lg`}
            >
              {reactionTypes.map(({ type, icon, labelKey }) => {
                const isSelected = state.myReactions.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setMenuOpen(false)
                      onClick(type)
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50 text-blue-800' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <img src={icon} alt="" aria-hidden width={24} height={24} className="h-6 w-6" />
                    <span>{t(labelKey)}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ReviewReactions
