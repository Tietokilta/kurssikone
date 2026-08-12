import { useState } from 'react'
import DOMPurify from 'dompurify'
import { CourseWithRealisations, CourseRealisation } from '@kurssikone/shared'

type Props = {
  course: CourseWithRealisations
}

const formatCredits = (min: number | null, max: number | null): string => {
  if (min === null && max === null) return ''
  if (min === max || max === null) return `${min} cr`
  if (min === null) return `${max} cr`
  return `${min}-${max} cr`
}

const formatLanguages = (codes: string[] | null): string => {
  if (!codes || codes.length === 0) return ''
  const languageMap: Record<string, string> = {
    en: 'English',
    fi: 'Finnish',
    sv: 'Swedish',
  }
  return codes.map((code) => languageMap[code] || code).join(', ')
}

const getLatestRealisation = (realisations: CourseRealisation[]): CourseRealisation | null => {
  if (!realisations || realisations.length === 0) return null
  return realisations.reduce((latest, current) => {
    if (!latest.startDate) return current
    if (!current.startDate) return latest
    return current.startDate > latest.startDate ? current : latest
  })
}

const CourseInfo = ({ course }: Props) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  const latestRealisation = getLatestRealisation(course.courseRealisations)

  const name =
    course.nameEn || course.nameFi || latestRealisation?.nameEn || latestRealisation?.nameFi
  const credits = formatCredits(course.creditsMin, course.creditsMax)
  const description = latestRealisation?.contentEn || latestRealisation?.contentFi
  const teachers = latestRealisation?.teacherInCharge || latestRealisation?.teachers
  const prerequisites = latestRealisation?.prerequisitesEn
  const learningOutcomes = latestRealisation?.learningOutcomesEn
  const languages = formatLanguages(latestRealisation?.languageCodes || null)
  const organization = latestRealisation?.organizationNameEn
  const level = latestRealisation?.level
  const gradingScale = latestRealisation?.gradingScale
  const sisuUrl = `https://sisu.aalto.fi/student/courseunit/${course.id}/brochure`

  const sanitize = (html: string) => DOMPurify.sanitize(html)

  const descriptionTruncateLength = 300
  const getTextLength = (html: string) => {
    const div = document.createElement('div')
    div.innerHTML = DOMPurify.sanitize(html)
    return div.textContent?.length || 0
  }
  const shouldTruncateDescription = description && getTextLength(description) > descriptionTruncateLength

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          {name && <h2 className="text-xl font-medium text-gray-900">{name}</h2>}
          <a
            href={sisuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 text-sm hover:underline"
          >
            View in Sisu
          </a>
        </div>
        {credits && (
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium shrink-0">
            {credits}
          </span>
        )}
      </div>

      {description && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
          <div
            className={`text-gray-600 text-sm course-html-content ${shouldTruncateDescription && !isDescriptionExpanded ? 'line-clamp-4' : ''}`}
            dangerouslySetInnerHTML={{ __html: sanitize(description) }}
          />
          {shouldTruncateDescription && (
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="text-blue-600 text-sm mt-1 hover:underline"
            >
              {isDescriptionExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {learningOutcomes && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Learning Outcomes</h3>
          <div
            className="text-gray-600 text-sm course-html-content"
            dangerouslySetInnerHTML={{ __html: sanitize(learningOutcomes) }}
          />
        </div>
      )}

      {prerequisites && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Prerequisites</h3>
          <div
            className="text-gray-600 text-sm course-html-content"
            dangerouslySetInnerHTML={{ __html: sanitize(prerequisites) }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        {teachers && teachers.length > 0 && (
          <div>
            <span className="font-medium text-gray-700">Teachers: </span>
            <span className="text-gray-600">{teachers.join(', ')}</span>
          </div>
        )}

        {languages && (
          <div>
            <span className="font-medium text-gray-700">Language: </span>
            <span className="text-gray-600">{languages}</span>
          </div>
        )}

        {organization && (
          <div>
            <span className="font-medium text-gray-700">Department: </span>
            <span className="text-gray-600">{organization}</span>
          </div>
        )}

        {level && (
          <div>
            <span className="font-medium text-gray-700">Level: </span>
            <span className="text-gray-600 capitalize">{level.replace(/-/g, ' ')}</span>
          </div>
        )}

        {gradingScale && (
          <div>
            <span className="font-medium text-gray-700">Grading: </span>
            <span className="text-gray-600">{gradingScale}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default CourseInfo
