import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Course } from '@kurssikone/shared'

type Props = {
  course: Course
  isFi?: boolean
}

const formatCredits = (min: number | null, max: number | null, unit: string): string => {
  if (min === null && max === null) return ''
  if (min === max || max === null) return `${min} ${unit}`
  if (min === null) return `${max} ${unit}`
  return `${min}-${max} ${unit}`
}

const formatAvg = (value: number | null): string | null => {
  if (value == null || !Number.isFinite(value)) return null
  return value.toFixed(1)
}

const CourseCard = ({ course, isFi = false }: Props) => {
  const { t } = useTranslation()
  const name = isFi
    ? (course.nameFi || course.nameEn || t('web.unnamedCourse'))
    : (course.nameEn || course.nameFi || t('web.unnamedCourse'))
  const credits = formatCredits(course.creditsMin, course.creditsMax, t('shared.cr'))
  const hasReviews = (course.reviewCount ?? 0) > 0
  const q = formatAvg(course.avgQualityScore)
  const w = formatAvg(course.avgWorkloadScore)

  return (
    <Link
      to={`/course/${encodeURIComponent(course.code)}`}
      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all bg-white"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-blue-600">{course.code}</div>
          <div className="text-gray-700 text-sm mt-1 line-clamp-2">{name}</div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
          {credits ? (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{credits}</span>
          ) : null}
          {hasReviews && q != null && w != null ? (
            <div className="text-xs text-gray-600 tabular-nums leading-tight">
              <div>
                <span className="text-gray-500">{t('shared.quality')}</span>{' '}
                <span className="font-medium text-gray-800">{q}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('shared.workload')}</span>{' '}
                <span className="font-medium text-gray-800">{w}</span>
              </div>
              <div className="text-gray-400 mt-0.5">
                {t('web.reviewCount', { count: course.reviewCount })}
              </div>
            </div>
          ) : (
            <span className="text-xs text-gray-400">{t('web.noReviewsYetCard')}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default CourseCard
