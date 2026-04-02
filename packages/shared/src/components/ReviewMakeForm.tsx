import React from 'react'
import ScorePicker from './ScorePicker'
import { NewReview, Review } from '../types'
import Divider from './Divider'
import { scoreTypes } from '../constants'

type Props = {
  userId: string
  courseCode: string | null
  currentUserReview: Review | null
  refetchUserReview: (courseCode: string, userId: string) => Promise<void>
  refetchAverages: (courseCode: string) => Promise<void>
  setIsMakingNewReview: (isMakingNewReview: boolean) => void
  makeOrEditReview: (review: NewReview) => Promise<void>
  deleteReview: (reviewId: number, userId: string) => Promise<void>
}

const ReviewMakeForm = ({
  userId,
  courseCode,
  currentUserReview,
  refetchUserReview,
  setIsMakingNewReview,
  refetchAverages,
  makeOrEditReview,
  deleteReview,
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
      <h4 className="mt-3">{isEditingOldReview ? 'Edit review' : 'New review'}</h4>
      <form className="flex gap-6 flex-col mt-4 mb-6" onSubmit={makeReview}>
        <label className="flex flex-col">
          Title*
          <input
            name="reviewTitle"
            className="w-[90%] max-w-[500px] px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            defaultValue={currentUserReview?.title ?? ''}
            placeholder="Title of the review"
            required
          />
        </label>
        <div className="w-[90%] flex gap-9 flex-wrap">
          <label className="flex flex-col min-w-[200px]">
            Responsible teacher
            <input
              name="professor"
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              defaultValue={currentUserReview?.professor ?? ''}
              placeholder="Name of the responsible teacher (optional)"
            />
          </label>
          <label className="flex flex-col min-w-[120px]">
            Year
            <select
              name="year"
              defaultValue={currentUserReview?.year}
              className="h-[38px] px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value={undefined}>Not specified</option>
              {possibleYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col">
          Content*
          <textarea
            name="content"
            rows={5}
            className="max-w-[700px] px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            defaultValue={currentUserReview?.content ?? ''}
            placeholder="Write your review here. Possible questions to answer: How was the course implemented? Was there mandatory attendace? Could the course be completed remotely? Were the lectures, assignments, and materials engaging and effective? Was the workload manageable? What kind of and how many exercises did the course have? How was the exam? Share what you enjoyed, any challenges you faced, and tips for future students!"
            required
          />
        </label>
        {scoreTypes.map((scoreType) => (
          <ScorePicker
            key={scoreType.name}
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
            className="w-fit px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {isEditingOldReview ? 'Publish edit' : 'Publish review'}
          </button>
          {isEditingOldReview && (
            <button
              type="button"
              className="w-fit ml-3 px-3 py-2 bg-gray-200 border border-gray-300 rounded hover:bg-gray-300"
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
