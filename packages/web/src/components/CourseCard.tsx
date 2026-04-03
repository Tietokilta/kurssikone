import { Link } from 'react-router-dom'
import { Course } from '@kurssikompassi/shared'

type Props = {
  course: Course
}

const formatCredits = (min: number | null, max: number | null): string => {
  if (min === null && max === null) return ''
  if (min === max || max === null) return `${min} cr`
  if (min === null) return `${max} cr`
  return `${min}-${max} cr`
}

const CourseCard = ({ course }: Props) => {
  const name = course.nameEn || course.nameFi || 'Unnamed course'
  const credits = formatCredits(course.creditsMin, course.creditsMax)

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
        {credits && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded shrink-0">
            {credits}
          </span>
        )}
      </div>
    </Link>
  )
}

export default CourseCard
