import express from 'express'
import { Op, literal, OrderItem, QueryTypes } from 'sequelize'
import { Course, CourseRealisation } from '../models'
import { sequelize } from '../utils/db'

const router = express.Router()

const SORT_BY_VALUES = ['alphabetical', 'credits', 'quality', 'workload'] as const
type SortBy = (typeof SORT_BY_VALUES)[number]

const SORT_ORDER_VALUES = ['asc', 'desc'] as const
type SortOrder = (typeof SORT_ORDER_VALUES)[number]

function parseSortBy(value: unknown): SortBy {
  return typeof value === 'string' && SORT_BY_VALUES.includes(value as SortBy)
    ? (value as SortBy)
    : 'quality'
}

function parseSortOrder(value: unknown): SortOrder {
  return typeof value === 'string' && SORT_ORDER_VALUES.includes(value as SortOrder)
    ? (value as SortOrder)
    : 'desc'
}

function buildCourseListOrder(sortBy: SortBy, sortOrder: SortOrder): OrderItem[] {
  const dir = sortOrder === 'desc' ? 'DESC' : 'ASC'
  switch (sortBy) {
    case 'quality':
      return [literal(`avg_quality_score ${dir} NULLS LAST, code ASC`)]
    case 'workload':
      return [literal(`avg_workload_score ${dir} NULLS LAST, code ASC`)]
    case 'credits':
      return [literal(`COALESCE(credits_max, credits_min) ${dir} NULLS LAST, code ASC`)]
    default:
      return [['code', dir] as OrderItem]
  }
}

const MAX_IDS_PER_REQUEST = 100

function parseIdsQuery(raw: unknown): string[] {
  if (raw == null) return []
  const parts: string[] = []
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') parts.push(...item.split(','))
    }
  } else if (typeof raw === 'string') {
    parts.push(...raw.split(','))
  }
  const trimmed = parts.map((s) => s.trim()).filter(Boolean)
  return [...new Set(trimmed)].slice(0, MAX_IDS_PER_REQUEST)
}

function parseIdsFromRequestUrl(req: express.Request): string[] | null {
  const q = req.originalUrl.indexOf('?')
  if (q === -1) return null
  const sp = new URLSearchParams(req.originalUrl.slice(q + 1))
  if (!sp.has('ids')) return null
  const chunks = sp.getAll('ids').flatMap((s) => s.split(','))
  return parseIdsQuery(chunks)
}

function parseCommaSeparated(raw: unknown): string[] {
  if (typeof raw !== 'string' || raw === '') return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

const PERIOD_MONTH_RANGES: Record<string, [number, number]> = {
  I: [9, 10],
  II: [10, 12],
  III: [1, 2],
  IV: [3, 4],
  V: [4, 5],
  Summer: [6, 8],
}

const VALID_PERIODS = Object.keys(PERIOD_MONTH_RANGES)

function getCurrentAcademicYear(): number {
  const now = new Date()
  const month = now.getMonth() + 1
  return month >= 8 ? now.getFullYear() : now.getFullYear() - 1
}

function buildRealisationFilterSubquery(
  periods: string[],
  departments: string[],
  levels: string[]
): string | null {
  const conditions: string[] = []

  if (periods.length > 0) {
    const periodClauses = periods.map((p) => {
      const [mStart, mEnd] = PERIOD_MONTH_RANGES[p]
      return `(
        EXTRACT(MONTH FROM cr.start_date::date) BETWEEN ${mStart} AND ${mEnd}
        OR EXTRACT(MONTH FROM cr.end_date::date) BETWEEN ${mStart} AND ${mEnd}
        OR (EXTRACT(MONTH FROM cr.start_date::date) < ${mStart} AND EXTRACT(MONTH FROM cr.end_date::date) > ${mEnd})
      )`
    })
    conditions.push(`(${periodClauses.join(' OR ')})`)
  }

  if (departments.length > 0) {
    const escaped = departments.map((d) => sequelize.escape(d)).join(',')
    conditions.push(`cr.organization_name_en IN (${escaped})`)
  }

  if (levels.length > 0) {
    const escaped = levels.map((l) => sequelize.escape(l)).join(',')
    conditions.push(`cr.level IN (${escaped})`)
  }

  if (conditions.length === 0) return null

  return `EXISTS (
    SELECT 1 FROM course_realisations cr
    WHERE cr.code = "course".code
    AND cr.start_date IS NOT NULL
    AND ${conditions.join(' AND ')}
  )`
}

router.get('/filter-options', async (_req, res) => {
  const [departmentRows, levelRows, creditRows] = await Promise.all([
    sequelize.query<{ department: string }>(
      `SELECT DISTINCT organization_name_en AS department
       FROM course_realisations
       WHERE organization_name_en IS NOT NULL AND organization_name_en != ''
       ORDER BY department`,
      { type: QueryTypes.SELECT }
    ),
    sequelize.query<{ level: string }>(
      `SELECT DISTINCT level
       FROM course_realisations
       WHERE level IS NOT NULL AND level != ''
       ORDER BY level`,
      { type: QueryTypes.SELECT }
    ),
    sequelize.query<{ min_credits: number; max_credits: number }>(
      `SELECT
         MIN(LEAST(COALESCE(credits_min, credits_max), COALESCE(credits_max, credits_min))) AS min_credits,
         MAX(GREATEST(COALESCE(credits_max, credits_min), COALESCE(credits_min, credits_max))) AS max_credits
       FROM courses
       WHERE credits_min IS NOT NULL OR credits_max IS NOT NULL`,
      { type: QueryTypes.SELECT }
    ),
  ])

  const currentAcademicYear = getCurrentAcademicYear()

  res.json({
    departments: departmentRows.map((r) => r.department),
    levels: levelRows.map((r) => r.level),
    creditRange: creditRows[0]
      ? { min: creditRows[0].min_credits, max: creditRows[0].max_credits }
      : { min: 0, max: 15 },
    periods: VALID_PERIODS,
    currentAcademicYear,
  })
})

router.get('/', async (req, res) => {
  const idsFromUrl = parseIdsFromRequestUrl(req)

  if (idsFromUrl !== null) {
    if (idsFromUrl.length === 0) {
      return res.json({ courses: [] })
    }

    const courses = await Course.findAll({
      where: { id: { [Op.in]: idsFromUrl } },
    })
    return res.json({ courses })
  }

  const {
    search,
    limit = '50',
    offset = '0',
    sortBy: sortByParam,
    sortOrder: sortOrderParam,
    creditsMin: creditsMinParam,
    creditsMax: creditsMaxParam,
    periods: periodsParam,
    departments: departmentsParam,
    levels: levelsParam,
    minRating: minRatingParam,
    hasReviews: hasReviewsParam,
    curriculumPeriods: curriculumPeriodsParam,
  } = req.query

  const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100)
  const offsetNum = parseInt(offset as string, 10) || 0
  const sortBy = parseSortBy(sortByParam)
  const sortOrder = parseSortOrder(sortOrderParam)

  const where: Record<string, unknown> = {}
  if (search && typeof search === 'string') {
    where[Op.or as unknown as string] = [
      { code: { [Op.iLike]: `%${search}%` } },
      { nameEn: { [Op.iLike]: `%${search}%` } },
      { nameFi: { [Op.iLike]: `%${search}%` } },
    ]
  }

  where.id = {
    [Op.in]: literal(`(
      SELECT DISTINCT ON (code) id
      FROM courses
      ORDER BY code, validity_start DESC NULLS LAST
    )`),
  }

  const andConditions: unknown[] = []

  const creditsMin = creditsMinParam ? parseInt(creditsMinParam as string, 10) : null
  const creditsMax = creditsMaxParam ? parseInt(creditsMaxParam as string, 10) : null

  if (creditsMin != null && !isNaN(creditsMin)) {
    andConditions.push(literal(`COALESCE(credits_max, credits_min, 0) >= ${Number(creditsMin)}`))
  }
  if (creditsMax != null && !isNaN(creditsMax)) {
    andConditions.push(literal(`COALESCE(credits_min, credits_max, 0) <= ${Number(creditsMax)}`))
  }

  const minRating = minRatingParam ? parseFloat(minRatingParam as string) : null
  if (minRating != null && !isNaN(minRating)) {
    andConditions.push(literal(`avg_quality_score >= ${Number(minRating)}`))
  }

  if (hasReviewsParam === 'true') {
    where.reviewCount = { [Op.gt]: 0 }
  }

  const periods = parseCommaSeparated(periodsParam).filter((p) => VALID_PERIODS.includes(p))
  const departments = parseCommaSeparated(departmentsParam)
  const levels = parseCommaSeparated(levelsParam)

  const realisationSubquery = buildRealisationFilterSubquery(periods, departments, levels)
  if (realisationSubquery) {
    andConditions.push(literal(realisationSubquery))
  }

  const curriculumPeriods = parseCommaSeparated(curriculumPeriodsParam)
  if (curriculumPeriods.length > 0) {
    const currentAcademicYear = getCurrentAcademicYear()
    const validityClauses: string[] = []

    for (const period of curriculumPeriods) {
      if (period === 'current') {
        const start = `${currentAcademicYear}-08-01`
        const end = `${currentAcademicYear + 1}-07-31`
        validityClauses.push(
          `(validity_start <= '${end}' AND (validity_end IS NULL OR validity_end >= '${start}'))`
        )
      } else if (period === 'future') {
        const start = `${currentAcademicYear + 1}-08-01`
        validityClauses.push(
          `(validity_end IS NULL OR validity_end >= '${start}')`
        )
      } else if (period === 'past') {
        const end = `${currentAcademicYear}-07-31`
        validityClauses.push(
          `(validity_start IS NOT NULL AND validity_start <= '${end}' AND validity_end IS NOT NULL AND validity_end <= '${end}')`
        )
      }
    }

    if (validityClauses.length > 0) {
      andConditions.push(literal(`(${validityClauses.join(' OR ')})`))
    }
  }

  if (andConditions.length > 0) {
    where[Op.and as unknown as string] = andConditions
  }

  const { count, rows: courses } = await Course.findAndCountAll({
    where,
    limit: limitNum,
    offset: offsetNum,
    order: buildCourseListOrder(sortBy, sortOrder),
  })

  res.json({
    courses,
    total: count,
    limit: limitNum,
    offset: offsetNum,
  })
})

router.get('/:code/realisations', async (req, res) => {
  const { code } = req.params

  const realisations = await CourseRealisation.findAll({
    where: { code },
    order: [['startDate', 'DESC']],
  })

  res.json(realisations)
})

router.get('/:code', async (req, res) => {
  const { code } = req.params

  const [courses, realisations] = await Promise.all([
    Course.findAll({
      where: { code },
      order: [['validityStart', 'DESC']],
    }),
    CourseRealisation.findAll({
      where: { code },
      order: [['startDate', 'DESC']],
    }),
  ])

  if (courses.length === 0) {
    return res.status(404).json({ error: 'Course not found' })
  }

  const result = courses.map((c) => ({
    ...c.toJSON(),
    courseRealisations: realisations,
  }))

  return res.json(result)
})

export default router
