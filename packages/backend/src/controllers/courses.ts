import express from 'express'
import { Op, literal, OrderItem } from 'sequelize'
import { Course, CourseRealisation } from '../models'
import { runFullSync } from '../services/sisuSync'

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

  const courses = await Course.findAll({
    where: { code },
    include: [{ model: CourseRealisation, as: 'courseRealisations' }],
    order: [['validityStart', 'DESC']],
  })

  if (courses.length === 0) {
    return res.status(404).json({ error: 'Course not found' })
  }

  return res.json(courses)
})

router.post('/sync', async (req, res) => {
  const authHeader = req.headers.authorization
  const expectedSecret = process.env.GET_ALL_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const result = await runFullSync()
    return res.json({
      message: 'Sync completed successfully',
      ...result,
    })
  } catch (error) {
    console.error('Manual sync failed:', error)
    return res.status(500).json({ error: 'Sync failed' })
  }
})

export default router
