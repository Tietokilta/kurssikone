import React from 'react'
import ScorePicker from './ScorePicker'
import { NewReview, Review } from '../types'
import { deleteReview, makeOrEditReview } from '../requestHandlers'
import Divider from './Divider'
import { scoreTypes } from '../utils/contants'

type Props = {
  userId: string
  courseCode: string | null
  currentUserReview: Review | null
  refetchUserReview: (courseCode: string, userId: string) => Promise<void>
  refetchAverages: (courseCode: string) => Promise<void>
  setIsMakingNewReview: (isMakingNewReview: boolean) => void
}

const ReviewMakeForm = ({
  userId,
  courseCode,
  currentUserReview,
  refetchUserReview,
  setIsMakingNewReview,
  refetchAverages,
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
    const timeStamp = new Date().getTime()
    const newReview: NewReview = {
      id,
      userId,
      title,
      content,
      qualityScore,
      workloadScore,
      difficultyScore,
      courseCode,
      timestampCreated: currentUserReview?.timestampCreated || timeStamp,
    }
    if (isEditingOldReview) {
      newReview.timestampLastEdit = timeStamp
    }
    await makeOrEditReview(newReview)
    await refetchUserReview(courseCode, userId)
    await refetchAverages(courseCode)
    setIsMakingNewReview(false)
  }

  const handleDelete = async () => {
    if (!currentUserReview || !courseCode) return
    if (window.confirm('Are you sure you want to delete your review?')) {
      await deleteReview(currentUserReview.id, userId)
      await refetchUserReview(courseCode, userId)
      await refetchAverages(courseCode)
      setIsMakingNewReview(false)
    }
  }

  return (
    <div>
      <h4 style={{ marginTop: 12 }}>{isEditingOldReview ? 'Edit review' : 'New review'}</h4>
      <form
        style={{
          display: 'flex',
          gap: 24,
          flexDirection: 'column',
          marginTop: 16,
          marginBottom: 24,
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
        {scoreTypes.map((scoreType) => (
          <ScorePicker
            name={scoreType.name}
            label={scoreType.label}
            defaultValue={currentUserReview ? currentUserReview[scoreType.name] : 3}
            minText={scoreType.minText}
            maxText={scoreType.maxText}
          />
        ))}
        <div>
          <button
            type="submit"
            className="btn btn-secondary btn-hollow btn-sm"
            style={{ width: 'fit-content' }}
          >
            {isEditingOldReview ? 'Publish edit' : 'Publish review'}
          </button>
          {isEditingOldReview && (
            <button
              type="button"
              className="btn btn-secondary btn-hollow btn-sm"
              style={{ width: 'fit-content', marginLeft: 12 }}
              onClick={handleDelete}
            >
              Delete review
            </button>
          )}
        </div>
      </form>
      <Divider />
    </div>
  )
}

export default ReviewMakeForm
