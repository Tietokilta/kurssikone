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

const PERIOD_DEFINITIONS: { label: string; months: number[]; mode: 'all' | 'any' }[] = [
  { label: 'I', months: [9, 10], mode: 'all' },
  { label: 'II', months: [10, 11], mode: 'all' },
  { label: 'III', months: [1, 2], mode: 'all' },
  { label: 'IV', months: [3, 4], mode: 'all' },
  { label: 'V', months: [5], mode: 'all' },
  { label: 'Summer', months: [7, 8], mode: 'any' },
]

function realisationCoversMonth(startMonth: number, endMonth: number, month: number): boolean {
  if (startMonth <= endMonth) return month >= startMonth && month <= endMonth
  return month >= startMonth || month <= endMonth
}

type YearPeriods = { yearLabel: string; sortKey: number; periods: string[] }

function getPeriodsGroupedByYear(realisations: CourseRealisation[]): YearPeriods[] {
  const grouped = new Map<string, { sortKey: number; periods: Set<string> }>()

  for (const r of realisations) {
    if (!r.startDate || !r.endDate) continue
    const start = new Date(r.startDate)
    const end = new Date(r.endDate)
    const startYear = start.getFullYear()
    const endYear = end.getFullYear()
    const startMonth = start.getMonth() + 1
    const endMonth = end.getMonth() + 1

    const yearLabel = startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`

    if (!grouped.has(yearLabel)) {
      grouped.set(yearLabel, { sortKey: startYear, periods: new Set() })
    }
    const entry = grouped.get(yearLabel)!

    for (const { label, months, mode } of PERIOD_DEFINITIONS) {
      const check = mode === 'all'
        ? months.every((m) => realisationCoversMonth(startMonth, endMonth, m))
        : months.some((m) => realisationCoversMonth(startMonth, endMonth, m))
      if (check) entry.periods.add(label)
    }
  }

  const currentYear = new Date().getFullYear()

  return Array.from(grouped.entries())
    .map(([yearLabel, { sortKey, periods }]) => ({
      yearLabel,
      sortKey,
      periods: PERIOD_DEFINITIONS.filter(({ label }) => periods.has(label)).map(({ label }) => label),
    }))
    .filter((g) => g.periods.length > 0)
    .filter((g) => g.sortKey >= currentYear)
    .sort((a, b) => a.sortKey - b.sortKey)
}

function formatPeriodRange(periods: string[]): string {
  if (periods.length === 0) return ''
  if (periods.length === 1) return periods[0]

  const indices = periods.map((p) => PERIOD_DEFINITIONS.findIndex(({ label }) => label === p))
  let rangeStart = 0
  const ranges: string[] = []
  for (let i = 1; i <= indices.length; i++) {
    if (i < indices.length && indices[i] === indices[i - 1] + 1) continue
    const from = periods[rangeStart]
    const to = periods[i - 1]
    ranges.push(from === to ? from : `${from}–${to}`)
    rangeStart = i
  }
  return ranges.join(', ')
}

const CourseInfo = ({ course }: Props) => {
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
            className="text-gray-600 text-sm course-html-content"
            dangerouslySetInnerHTML={{ __html: sanitize(description) }}
          />
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

        {course.courseRealisations.length > 0 && (() => {
          const groups = getPeriodsGroupedByYear(course.courseRealisations)
          return groups.length > 0 ? (
            <div>
              <span className="font-medium text-gray-700">Teaching periods: </span>
              <div className="text-gray-600">
                {groups.map((g) => (
                  <div key={g.yearLabel}>{g.yearLabel} {formatPeriodRange(g.periods)}</div>
                ))}
              </div>
            </div>
          ) : null
        })()}
      </div>
    </div>
  )
}

export default CourseInfo
