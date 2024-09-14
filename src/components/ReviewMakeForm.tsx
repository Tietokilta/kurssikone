import React from 'react'
import ScorePicker from './ScorePicker'
import { NewReview, Review } from '../types'
import { deleteReview, makeOrEditReview } from '../requestHandlers'
import Divider from './Divider'
import { scoreTypes } from '../utils/constants'

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
      professor: { value: string }
      year: { value: string }
      qualityScore: { value: number }
      workloadScore: { value: number }
      difficultyScore: { value: number }
    }
    const title = target.reviewTitle.value
    const content = target.content.value
    const professor = target.professor.value
    const year = Number(target.year.value)
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
      professor,
      year,
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

  const currentYear = new Date().getFullYear()
  const earliestYear = 2010
  const possibleYears = Array.from(
    { length: currentYear - earliestYear + 1 },
    (_, i) => currentYear - i
  )

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
          Title*
          <input
            name="reviewTitle"
            style={{ width: '90%' }}
            defaultValue={currentUserReview?.title ?? ''}
            placeholder="Title of the review"
            required
          />
        </label>
        <div style={{ width: '90%', display: 'flex', gap: 36 }}>
          <label style={{ display: 'flex', flexDirection: 'column', width: '30%' }}>
            Responsible teacher
            <input
              name="professor"
              defaultValue={currentUserReview?.professor ?? ''}
              placeholder="Name of the responsible teacher (optional)"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', width: '15%' }}>
            Year
            <select name="year" defaultValue={currentUserReview?.year} style={{ height: 30 }}>
              <option value={undefined}>Not specified</option>
              {possibleYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Content*
          <textarea
            name="content"
            rows={5}
            defaultValue={currentUserReview?.content ?? ''}
            placeholder="Write your review here. Possible questions to answer: How was the course implemented? Was there mandatory attendace? Could the course be completed remotely? Were the lectures, assignments, and materials engaging and effective? Was the workload manageable? What kind of and how many exercises did the course have? How was the exam? Share what you enjoyed, any challenges you faced, and tips for future students!"
            required
          />
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
