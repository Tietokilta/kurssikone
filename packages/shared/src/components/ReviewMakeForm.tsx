import React from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
    if (window.confirm(t('shared.confirmDeleteReview'))) {
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
      <h4 className="mt-3">{isEditingOldReview ? t('shared.editReviewTitle') : t('shared.newReview')}</h4>
      <form className="flex gap-6 flex-col mt-4 mb-6" onSubmit={makeReview}>
        <div className="w-[90%] flex gap-9 flex-wrap">
          <div className="flex flex-col gap-6 w-full">
            {scoreTypes.map((scoreType) => (
              <ScorePicker
                key={scoreType.name}
                name={scoreType.name}
                label={t(scoreType.labelKey)}
                defaultValue={currentUserReview ? currentUserReview[scoreType.name] : 3}
                labels={t(scoreType.labelsKey, { returnObjects: true }) as string[]}
              />
            ))}
          </div>

          <FormTextField
            label={t('shared.responsibleTeacherLabel')}
            name="professor"
            hint={t('shared.responsibleTeacherHint')}
            defaultValue={currentUserReview?.professor ?? ''}
            className="min-w-[200px] w-[400px]"
          />
          <label className="flex flex-col min-w-[120px]">
            {t('shared.yearLabel')}
            <select
              name="year"
              defaultValue={currentUserReview?.year}
              className="h-[38px] px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value={undefined}>{t('shared.notSpecified')}</option>
              {possibleYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
        <FormTextField
          label={t('shared.whatYoullLearn')}
          name="learnings"
          hint={t('shared.learningsHint')}
          multiline
          rows={3}
          inputClassName="max-w-[700px]"
          defaultValue={currentUserReview?.learnings ?? ''}
        />
        <FormTextField
          label={t('shared.whatYoullDo')}
          name="tasks"
          hint={t('shared.tasksHint')}
          multiline
          rows={3}
          inputClassName="max-w-[700px]"
          defaultValue={currentUserReview?.tasks ?? ''}
        />
        <FormTextField
          label={t('shared.otherInfo')}
          name="otherInfo"
          hint={t('shared.otherInfoHint')}
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
            {isEditingOldReview ? t('shared.publishEdit') : t('shared.publishReview')}
          </button>
          {isEditingOldReview && (
            <button
              type="button"
              className="btn-secondary w-fit ml-3 py-2"
              onClick={handleDelete}
            >
              {t('shared.deleteReview')}
            </button>
          )}
        </div>
      </form>
      <Divider />
    </div>
  )
}

export default ReviewMakeForm
