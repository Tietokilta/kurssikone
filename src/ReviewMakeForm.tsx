import React from 'react'
import ScorePicker from './ScorePicker'
import { Review } from './types'

type Props = {
  userId: number
  courseCode: string | null
  currentUserReview: Review | null
  refetchUserReview: (courseCode: string, userId: number) => Promise<void>
  setIsMakingNewReview: (isMakingNewReview: boolean) => void
}

const ReviewMakeForm = ({
  userId,
  courseCode,
  currentUserReview,
  refetchUserReview,
  setIsMakingNewReview,
}: Props) => {
  const isEditingOldReview = currentUserReview !== null

  const makeReview = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    const target = e.target as typeof e.target & {
      reviewTitle: { value: string }
      content: { value: string }
      qualityScore: { value: number }
      workloadScore: { value: number }
      difficultyScore: { value: number }
    }
    const title = target.reviewTitle.value
    const content = target.content.value
    const qualityScore = Number(target.qualityScore.value)
    const workloadScore = Number(target.workloadScore.value)
    const difficultyScore = Number(target.difficultyScore.value)
    const id = currentUserReview ? currentUserReview.id : null
    if (!courseCode) return
    const userRes = await fetch(`http://localhost:3001/api/users/${userId}`)
    if (userRes.status === 404) {
      await fetch('http://localhost:3001/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: userId }),
      })
    }
    await fetch('http://localhost:3001/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        userId,
        title,
        content,
        qualityScore,
        workloadScore,
        difficultyScore,
        courseCode,
        timestampCreated: new Date().getTime(),
      }),
    })
    await refetchUserReview(courseCode, userId)
    setIsMakingNewReview(false)
  }

  return (
    <div>
      <form
        style={{
          display: 'flex',
          gap: 24,
          flexDirection: 'column',
          marginTop: 24,
        }}
        onSubmit={makeReview}
      >
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          Title
          <input
            name="reviewTitle"
            style={{ width: '90%' }}
            defaultValue={currentUserReview?.title ?? ''}
          />
        </label>
        <label>
          Content
          <textarea name="content" rows={5} defaultValue={currentUserReview?.content ?? ''} />
        </label>
        <ScorePicker
          name="qualityScore"
          label="Quality"
          defaultValue={currentUserReview?.qualityScore}
          minText="Bad"
          maxText="Amazing"
        />
        <ScorePicker
          name="workloadScore"
          label="Workload"
          defaultValue={currentUserReview?.workloadScore}
          minText="Negligible"
          maxText="Massive"
        />
        <ScorePicker
          name="difficultyScore"
          label="Difficulty"
          defaultValue={currentUserReview?.difficultyScore}
          minText="Very easy"
          maxText="Very hard"
        />
        <button
          type="submit"
          className="btn btn-secondary btn-hollow btn-sm"
          style={{ width: 'fit-content' }}
        >
          {isEditingOldReview ? 'Publish edit' : 'Publish review'}
        </button>
      </form>
    </div>
  )
}

export default ReviewMakeForm
