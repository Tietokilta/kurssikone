import { useEffect, useState, type MouseEvent } from 'react'
import DOMPurify from 'dompurify'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Course,
  CourseWithRealisations,
  CourseRealisation,
  translateLevel,
  formatCredits,
  COURSE_CODE_REGEX,
  findCourseCodes,
} from '@kurssikone/shared'
import { getCoursesByCodes } from '../api/client'

type Props = {
  course: CourseWithRealisations
}

const getLatestRealisation = (realisations: CourseRealisation[]): CourseRealisation | null => {
  if (!realisations || realisations.length === 0) return null
  return realisations.reduce((latest, current) => {
    if (!latest.startDate) return current
    if (!current.startDate) return latest
    return current.startDate > latest.startDate ? current : latest
  })
}

const PERIOD_DEFINITIONS: { label: string; positive: number[]; negative: number[] }[] = [
  { label: 'I', positive: [9, 10], negative: [11] },
  { label: 'II', positive: [11, 12], negative: [] },
  { label: 'III', positive: [1, 2], negative: [] },
  { label: 'IV', positive: [3, 4], negative: [5] },
  { label: 'V', positive: [5, 6], negative: [7] },
  { label: 'Summer', positive: [7], negative: [] },
]

function realisationCoversMonth(startMonth: number, endMonth: number, month: number): boolean {
  if (startMonth <= endMonth) return month >= startMonth && month <= endMonth
  return month >= startMonth || month <= endMonth
}

type YearPeriods = { yearLabel: string; sortKey: number; periods: string[] }

// Sisu realisation names end with the type, e.g. "Course name, Exam" / "Kurssin nimi, Tentti"
function isExamRealisation(r: CourseRealisation): boolean {
  return /,\s*Exam\b/i.test(r.nameEn ?? '') || /,[^,]*tentti/i.test(r.nameFi ?? '')
}

function getPeriodsGroupedByYear(allRealisations: CourseRealisation[]): YearPeriods[] {
  const grouped = new Map<string, { sortKey: number; periods: Set<string> }>()

  // Exams don't define teaching periods, unless the course only has exams (e.g. exam-only courses)
  const nonExam = allRealisations.filter((r) => !isExamRealisation(r))
  const realisations = nonExam.length > 0 ? nonExam : allRealisations

  for (const r of realisations) {
    if (!r.startDate || !r.endDate) continue
    if (r.nameEn?.includes('Retake')) continue
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

    for (const { label, positive } of PERIOD_DEFINITIONS) {
      const pStart = positive[0]
      const pEnd = positive[positive.length - 1]
      const startIn = startMonth >= pStart && startMonth <= pEnd
      const endIn = endMonth >= pStart && endMonth <= pEnd
      const spans = positive.every((m) => realisationCoversMonth(startMonth, endMonth, m)) && !startIn && !endIn
      const excludeByStart = startMonth === pEnd && endMonth > pEnd
      const excludeByEnd = endMonth === pStart && startMonth < pStart - 2
      if ((startIn && !excludeByStart) || (endIn && !excludeByEnd) || spans) entry.periods.add(label)
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

const sanitize = (html: string) => DOMPurify.sanitize(html)

// Turns course codes in the text of the (sanitized) HTML into links to the courses' pages.
// `courseNames` holds the codes that exist in the database, mapped to their names.
function linkifyCourseCodes(html: string, courseNames: Map<string, string>): string {
  const container = document.createElement('div')
  container.innerHTML = sanitize(html)
  if (courseNames.size === 0) return container.innerHTML

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    if (!node.parentElement?.closest('a')) textNodes.push(node)
  }

  for (const node of textNodes) {
    const text = node.data
    const fragment = document.createDocumentFragment()
    let lastIndex = 0
    for (const match of text.matchAll(COURSE_CODE_REGEX)) {
      const code = courseNames.has(match[0]) ? match[0] : match[0].replace(/\.$/, '')
      if (!courseNames.has(code)) continue
      fragment.append(text.slice(lastIndex, match.index))
      const link = document.createElement('a')
      link.href = `/course/${encodeURIComponent(code)}`
      link.dataset.courseCode = code
      link.title = courseNames.get(code) ?? ''
      link.className = 'text-blue-600 hover:underline'
      link.textContent = code
      fragment.append(link)
      lastIndex = match.index + code.length
    }
    if (lastIndex === 0) continue
    fragment.append(text.slice(lastIndex))
    node.replaceWith(fragment)
  }

  return container.innerHTML
}

const CourseInfo = ({ course }: Props) => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isFi = i18n.language === 'fi'
  const latestRealisation = getLatestRealisation(course.courseRealisations)

  const name = isFi
    ? (course.nameFi || course.nameEn || latestRealisation?.nameFi || latestRealisation?.nameEn)
    : (course.nameEn || course.nameFi || latestRealisation?.nameEn || latestRealisation?.nameFi)
  const credits = formatCredits(course.creditsMin, course.creditsMax, t('shared.cr'))
  const description = isFi
    ? (latestRealisation?.contentFi || latestRealisation?.contentEn)
    : (latestRealisation?.contentEn || latestRealisation?.contentFi)
  const teachers = latestRealisation?.teacherInCharge || latestRealisation?.teachers
  const prerequisites = isFi
    ? (latestRealisation?.prerequisitesFi || latestRealisation?.prerequisitesEn)
    : (latestRealisation?.prerequisitesEn || latestRealisation?.prerequisitesFi)
  const learningOutcomes = isFi
    ? (latestRealisation?.learningOutcomesFi || latestRealisation?.learningOutcomesEn)
    : (latestRealisation?.learningOutcomesEn || latestRealisation?.learningOutcomesFi)
  const languageMap: Record<string, string> = {
    en: t('web.english'),
    fi: t('web.finnish'),
    sv: t('web.swedish'),
  }
  const languages = (latestRealisation?.languageCodes || [])
    .map((code) => languageMap[code] || code)
    .join(', ')
  const organization = isFi
    ? (latestRealisation?.organizationNameFi || latestRealisation?.organizationNameEn)
    : (latestRealisation?.organizationNameEn || latestRealisation?.organizationNameFi)
  const level = latestRealisation?.level
  const gradingScale = latestRealisation?.gradingScale
  const sisuUrl = `https://sisu.aalto.fi/student/courseunit/${course.id}/brochure`

  // Only codes of courses that exist in the database are linked
  const [prerequisiteCourses, setPrerequisiteCourses] = useState<Map<string, Course>>(new Map())
  // Keyed by the codes rather than the text, so switching language doesn't refetch the same courses
  const prerequisiteCodesKey = prerequisites
    ? findCourseCodes(prerequisites)
        .filter((code) => code !== course.code)
        .sort()
        .join(',')
    : ''

  useEffect(() => {
    if (!prerequisiteCodesKey) {
      setPrerequisiteCourses(new Map())
      return
    }
    let cancelled = false
    getCoursesByCodes(prerequisiteCodesKey.split(','))
      .then((courses) => {
        if (cancelled) return
        // Courses are ordered newest first, so keep the first one seen for each code
        const byCode = new Map<string, Course>()
        for (const c of courses) {
          if (!byCode.has(c.code)) byCode.set(c.code, c)
        }
        setPrerequisiteCourses(byCode)
      })
      .catch((error) => console.error('Failed to fetch prerequisite courses:', error))
    return () => {
      cancelled = true
    }
  }, [prerequisiteCodesKey])

  const prerequisiteCourseNames = new Map(
    [...prerequisiteCourses].map(([code, c]) => [code, (isFi ? c.nameFi || c.nameEn : c.nameEn || c.nameFi) ?? '']),
  )

  // Navigate client-side, but let modified clicks (e.g. open in new tab) through
  const handleCourseLinkClick = (e: MouseEvent<HTMLDivElement>) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-course-code]')
    if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(`/course/${encodeURIComponent(link.dataset.courseCode!)}`)
  }

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
            {t('web.viewInSisu')}
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
          <h3 className="text-sm font-medium text-gray-700 mb-1">{t('web.description')}</h3>
          <div
            className="text-gray-600 text-sm course-html-content"
            dangerouslySetInnerHTML={{ __html: sanitize(description) }}
          />
        </div>
      )}

      {learningOutcomes && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-1">{t('web.learningOutcomes')}</h3>
          <div
            className="text-gray-600 text-sm course-html-content"
            dangerouslySetInnerHTML={{ __html: sanitize(learningOutcomes) }}
          />
        </div>
      )}

      {prerequisites && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-1">{t('web.prerequisites')}</h3>
          <div
            className="text-gray-600 text-sm course-html-content"
            onClick={handleCourseLinkClick}
            dangerouslySetInnerHTML={{ __html: linkifyCourseCodes(prerequisites, prerequisiteCourseNames) }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        {teachers && teachers.length > 0 && (
          <div>
            <span className="font-medium text-gray-700">{t('web.teachers')} </span>
            <span className="text-gray-600">{teachers.join(', ')}</span>
          </div>
        )}

        {languages && (
          <div>
            <span className="font-medium text-gray-700">{t('web.language')} </span>
            <span className="text-gray-600">{languages}</span>
          </div>
        )}

        {organization && (
          <div>
            <span className="font-medium text-gray-700">{t('web.departmentLabel')} </span>
            <span className="text-gray-600">{organization}</span>
          </div>
        )}

        {level && (
          <div>
            <span className="font-medium text-gray-700">{t('web.levelLabel')} </span>
            <span className="text-gray-600 capitalize">{translateLevel(level, isFi)}</span>
          </div>
        )}

        {gradingScale && (
          <div>
            <span className="font-medium text-gray-700">{t('web.grading')} </span>
            <span className="text-gray-600">{gradingScale}</span>
          </div>
        )}

        {course.courseRealisations.length > 0 && (() => {
          const groups = getPeriodsGroupedByYear(course.courseRealisations)
          const translatePeriod = (s: string) => isFi ? s.replace(/Summer/g, t('web.summer')) : s
          return groups.length > 0 ? (
            <div>
              <span className="font-medium text-gray-700">{t('web.teachingPeriods')} </span>
              <div className="text-gray-600">
                {groups.map((g) => (
                  <div key={g.yearLabel}>{g.yearLabel} {translatePeriod(formatPeriodRange(g.periods))}</div>
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
