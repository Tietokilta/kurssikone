import React from 'react'
import ScorePicker from './ScorePicker'

type Props = {
  userId: number
  courseCode: string | null
}

const ReviewMakeForm = ({ userId, courseCode }: Props) => {
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
          <input name="reviewTitle" style={{ width: '90%' }} />
        </label>
        <label>
          Content
          <textarea name="content" rows={5} />
        </label>
        <ScorePicker name="qualityScore" label="Quality" />
        <ScorePicker name="workloadScore" label="Workload" />
        <ScorePicker name="difficultyScore" label="Difficulty" />
        <button
          type="submit"
          className="btn btn-secondary btn-hollow btn-sm"
          style={{ width: 'fit-content' }}
        >
          Publish review
        </button>
      </form>
    </div>
  )
}

export default ReviewMakeForm
