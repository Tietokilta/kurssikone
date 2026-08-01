import { Link } from 'react-router-dom'
import { Course } from '@kurssikone/shared'

type Props = {
  course: Course
}

const formatCredits = (min: number | null, max: number | null): string => {
  if (min === null && max === null) return ''
  if (min === max || max === null) return `${min} cr`
  if (min === null) return `${max} cr`
  return `${min}-${max} cr`
}

const formatAvg = (value: number | null): string | null => {
  if (value == null || !Number.isFinite(value)) return null
  return value.toFixed(1)
}

const CourseCard = ({ course }: Props) => {
  const name = course.nameEn || course.nameFi || 'Unnamed course'
  const credits = formatCredits(course.creditsMin, course.creditsMax)
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
                <span className="text-gray-500">Quality</span>{' '}
                <span className="font-medium text-gray-800">{q}</span>
              </div>
              <div>
                <span className="text-gray-500">Workload</span>{' '}
                <span className="font-medium text-gray-800">{w}</span>
              </div>
              <div className="text-gray-400 mt-0.5">
                {course.reviewCount} {course.reviewCount === 1 ? 'review' : 'reviews'}
              </div>
            </div>
          ) : (
            <span className="text-xs text-gray-400">No reviews yet</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default CourseCard
