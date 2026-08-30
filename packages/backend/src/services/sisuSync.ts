import { SISU_COURSE_API_KEY } from '../utils/config'
import { Course, CourseRealisation } from '../models'

const SISU_API_BASE = 'https://course.api.aalto.fi/api/sisu/v1'

interface SisuCourseUnit {
  id: string
  code: string
  groupId: string
  name: { fi?: string; en?: string }
  credits: { min: number; max: number }
  'validityPeriod.startDate': string | null
  'validityPeriod.endDate': string | null
  curriculumPeriodIds: string[]
}

interface SisuCourseRealisation {
  id: string
  code: string
  courseUnitId?: string
  name: { fi?: string; en?: string; sv?: string }
  startDate: string | null
  endDate: string | null
  credits: { min: number; max: number }
  summary: {
    content?: { fi?: string; en?: string }
    learningOutcomes?: { fi?: string; en?: string }
    prerequisites?: { fi?: string; en?: string }
    teacherInCharge?: string[]
    gradingScale?: { en?: string }
    level?: { en?: string }
  }
  teachers?: string[]
  languageOfInstructionCodes?: string[]
  organizationId?: string
  organizationName?: { fi?: string; en?: string }
  enrolmentStartDate?: string
  enrolmentEndDate?: string
}

async function fetchCourseUnits(): Promise<SisuCourseUnit[]> {
  const url = `${SISU_API_BASE}/courseunits?user_key=${SISU_COURSE_API_KEY}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch course units: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

async function fetchCourseRealisations(): Promise<SisuCourseRealisation[]> {
  const url = `${SISU_API_BASE}/courseunitrealisations?user_key=${SISU_COURSE_API_KEY}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch course realisations: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export function parseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null
  return dateStr.split('T')[0]
}

async function syncCourses(): Promise<number> {
  console.log('Fetching course units from Sisu API...')
  const courseUnits = await fetchCourseUnits()
  console.log(`Fetched ${courseUnits.length} course units`)

  const now = new Date()
  let upsertCount = 0

  for (const unit of courseUnits) {
    await Course.upsert(
      {
        id: unit.id,
        code: unit.code,
        groupId: unit.groupId,
        nameFi: unit.name?.fi || null,
        nameEn: unit.name?.en || null,
        creditsMin: unit.credits?.min ?? null,
        creditsMax: unit.credits?.max ?? null,
        validityStart: parseDate(unit['validityPeriod.startDate']),
        validityEnd: parseDate(unit['validityPeriod.endDate']),
        curriculumPeriodIds: unit.curriculumPeriodIds || null,
        updatedAt: now,
      },
      {
        fields: [
          'id',
          'code',
          'groupId',
          'nameFi',
          'nameEn',
          'creditsMin',
          'creditsMax',
          'validityStart',
          'validityEnd',
          'curriculumPeriodIds',
          'updatedAt',
        ],
      }
    )
    upsertCount++
  }

  console.log(`Upserted ${upsertCount} courses`)
  return upsertCount
}

async function syncRealisations(): Promise<number> {
  console.log('Fetching course realisations from Sisu API...')
  const realisations = await fetchCourseRealisations()
  console.log(`Fetched ${realisations.length} course realisations`)

  const existingCourseIds = new Set(
    (await Course.findAll({ attributes: ['id'] })).map((c) => c.id)
  )

  const now = new Date()
  let upsertCount = 0

  for (const realisation of realisations) {
    const courseId = realisation.courseUnitId && existingCourseIds.has(realisation.courseUnitId)
      ? realisation.courseUnitId
      : null

    await CourseRealisation.upsert({
      id: realisation.id,
      courseId,
      code: realisation.code,
      nameFi: realisation.name?.fi || null,
      nameEn: realisation.name?.en || null,
      nameSv: realisation.name?.sv || null,
      startDate: parseDate(realisation.startDate),
      endDate: parseDate(realisation.endDate),
      creditsMin: realisation.credits?.min ?? null,
      creditsMax: realisation.credits?.max ?? null,
      contentFi: realisation.summary?.content?.fi || null,
      contentEn: realisation.summary?.content?.en || null,
      learningOutcomesEn: realisation.summary?.learningOutcomes?.en || null,
      learningOutcomesFi: realisation.summary?.learningOutcomes?.fi || null,
      prerequisitesEn: realisation.summary?.prerequisites?.en || null,
      prerequisitesFi: realisation.summary?.prerequisites?.fi || null,
      teachers: realisation.teachers || null,
      teacherInCharge: realisation.summary?.teacherInCharge || null,
      languageCodes: realisation.languageOfInstructionCodes || null,
      organizationId: realisation.organizationId || null,
      organizationNameEn: realisation.organizationName?.en || null,
      organizationNameFi: realisation.organizationName?.fi || null,
      gradingScale: realisation.summary?.gradingScale?.en || null,
      level: realisation.summary?.level?.en || null,
      enrolmentStart: parseDate(realisation.enrolmentStartDate),
      enrolmentEnd: parseDate(realisation.enrolmentEndDate),
      updatedAt: now,
    })
    upsertCount++
  }

  console.log(`Upserted ${upsertCount} course realisations`)
  return upsertCount
}

export async function runFullSync(): Promise<{ courses: number; realisations: number }> {
  const startTime = Date.now()
  console.log('Starting full Sisu course sync...')

  try {
    const courses = await syncCourses()
    const realisations = await syncRealisations()

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`Sisu sync completed in ${duration}s - ${courses} courses, ${realisations} realisations`)

    return { courses, realisations }
  } catch (error) {
    console.error('Sisu sync failed:', error)
    throw error
  }
}
