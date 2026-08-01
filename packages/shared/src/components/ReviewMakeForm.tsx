import React from 'react'
import FormTextField from './FormTextField'
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
      learnings: { value: string }
      tasks: { value: string }
      otherInfo: { value: string }
      professor: { value: string }
      year: { value: string }
      qualityScore: { value: number }
      workloadScore: { value: number }
    }
    const learnings = target.learnings.value
    const tasks = target.tasks.value
    const otherInfo = target.otherInfo.value
    const professor = target.professor.value
    const year = Number(target.year.value)
    const qualityScore = Number(target.qualityScore.value)
    const workloadScore = Number(target.workloadScore.value)
    const id = currentUserReview ? currentUserReview.id : null
    if (!courseCode) return
    const timeStamp = new Date().getTime()
    const newReview: NewReview = {
      id,
      userId,
      professor,
      year,
      learnings,
      tasks,
      otherInfo,
      qualityScore,
      workloadScore,
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
        <div className="w-[90%] flex gap-9 flex-wrap">
          <div className="flex flex-col gap-6 w-full">
            {scoreTypes.map((scoreType) => (
              <ScorePicker
                key={scoreType.name}
                name={scoreType.name}
                label={scoreType.label}
                defaultValue={currentUserReview ? currentUserReview[scoreType.name] : 3}
                labels={scoreType.labels}
              />
            ))}
          </div>

          <FormTextField
            label="Responsible teacher"
            name="professor"
            hint="Name of the responsible teacher (optional)"
            defaultValue={currentUserReview?.professor ?? ''}
            className="min-w-[200px] w-[400px]"
          />
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
        <FormTextField
          label="What you'll learn"
          name="learnings"
          hint="What skills, concepts, or knowledge did you gain from this course? (optional)"
          multiline
          rows={3}
          inputClassName="max-w-[700px]"
          defaultValue={currentUserReview?.learnings ?? ''}
        />
        <FormTextField
          label="What you'll need to do"
          name="tasks"
          hint="What kind of assignments, exercises, exams, or projects did the course have? (optional)"
          multiline
          rows={3}
          inputClassName="max-w-[700px]"
          defaultValue={currentUserReview?.tasks ?? ''}
        />
        <FormTextField
          label="Other info"
          name="otherInfo"
          hint="Any other information, tips, or comments about the course? (optional)"
          multiline
          rows={3}
          inputClassName="max-w-[700px]"
          defaultValue={currentUserReview?.otherInfo ?? ''}
        />

        <div>
          <button
            type="submit"
            className="btn-primary w-fit px-4 py-2"
          >
            {isEditingOldReview ? 'Publish edit' : 'Publish review'}
          </button>
          {isEditingOldReview && (
            <button
              type="button"
              className="btn-secondary w-fit ml-3 py-2"
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
