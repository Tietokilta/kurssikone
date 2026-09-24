import { describe, it, expect } from 'vitest'
import { compareReviews, emptyReactionCounts, reviewHasText, SortableReview } from './reviewReactions'

const review = (
  id: number,
  overrides: Partial<Omit<SortableReview, 'reactionCounts'>> & {
    reactionCounts?: Partial<SortableReview['reactionCounts']>
  } = {}
): SortableReview => ({
  id,
  learnings: 'text',
  tasks: null,
  otherInfo: null,
  year: 2024,
  timestampCreated: 1000,
  ...overrides,
  reactionCounts: { ...emptyReactionCounts(), ...overrides.reactionCounts },
})

const sortedIds = (reviews: SortableReview[]) => [...reviews].sort(compareReviews).map((r) => r.id)

describe('reviewHasText', () => {
  it('treats whitespace-only fields as empty', () => {
    expect(reviewHasText({ learnings: '  ', tasks: '\n', otherInfo: null })).toBe(false)
    expect(reviewHasText({ learnings: null, tasks: null, otherInfo: 'x' })).toBe(true)
  })
})

describe('compareReviews', () => {
  it('puts reviews with text first, even over more helpful ones', () => {
    const noText = review(1, { learnings: null, reactionCounts: { helpful: 10 } })
    const withText = review(2)
    expect(sortedIds([noText, withText])).toEqual([2, 1])
  })

  it('sorts by helpful, then agree', () => {
    const agreed = review(1, { reactionCounts: { agree: 5 } })
    const helpful = review(2, { reactionCounts: { helpful: 1 } })
    const both = review(3, { reactionCounts: { helpful: 1, agree: 1 } })
    expect(sortedIds([agreed, helpful, both])).toEqual([3, 2, 1])
  })

  it('then by year (missing year last), then recency, then funny', () => {
    const noYear = review(1, { year: null, timestampCreated: 9999 })
    const older = review(2, { year: 2023, timestampCreated: 9999 })
    const newerYearOld = review(3, { year: 2025, timestampCreated: 1 })
    const newerYearRecent = review(4, { year: 2025, timestampCreated: 2 })
    const newerYearRecentFunny = review(5, {
      year: 2025,
      timestampCreated: 2,
      reactionCounts: { funny: 3 },
    })
    expect(sortedIds([noYear, older, newerYearOld, newerYearRecent, newerYearRecentFunny])).toEqual(
      [5, 4, 3, 2, 1]
    )
  })

  it('subtracts disagree from agree and outdated from both, capped at 0', () => {
    // Agree score 3 - 1 = 2, ties with review 2
    const agreedButDisagreed = review(1, { reactionCounts: { agree: 3, disagree: 1 } })
    const agreed = review(2, { reactionCounts: { agree: 2 } })
    // Helpful score 2 - 1 = 1 and agree score 1 - 1 = 0, ties with review 4
    const helpfulButOutdated = review(3, { reactionCounts: { helpful: 2, outdated: 1, agree: 1 } })
    const helpful = review(4, { reactionCounts: { helpful: 1 } })
    expect(sortedIds([agreedButDisagreed, agreed, helpfulButOutdated, helpful])).toEqual([
      4, 3, 2, 1,
    ])
  })

  it('does not let heavily disagreed or outdated reviews drop below zero-reaction ones', () => {
    const disagreed = review(1, { timestampCreated: 2, reactionCounts: { disagree: 10 } })
    const outdated = review(2, { timestampCreated: 3, reactionCounts: { outdated: 10 } })
    const plain = review(3, { timestampCreated: 1 })
    expect(sortedIds([disagreed, outdated, plain])).toEqual([2, 1, 3])
  })

  it('ignores disagree and funny counts above recency', () => {
    const disagreed = review(1, { timestampCreated: 1, reactionCounts: { disagree: 9, funny: 9 } })
    const recent = review(2, { timestampCreated: 2 })
    expect(sortedIds([disagreed, recent])).toEqual([2, 1])
  })
})
