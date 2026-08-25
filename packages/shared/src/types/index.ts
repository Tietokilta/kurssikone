export type Review = {
  id: number
  professor: string
  year: number
  learnings: string
  tasks: string
  otherInfo: string
  workloadScore: number
  qualityScore: number
  courseCode: string
  timestampCreated: number
  timestampLastEdit?: number
}

export interface NewReview extends Omit<Review, 'id'> {
  id: number | null
  userId: string
}

export type ReviewsAndCount = {
  reviews: Review[]
  count: number
}

export type ReviewAverages = {
  workloadAverage: number
  qualityAverage: number
}

export type CourseListSortBy = 'alphabetical' | 'credits' | 'quality' | 'workload'

export type ListSortOrder = 'asc' | 'desc'

/** Roman period labels within Autumn (I–II) or Spring (III–V), or Summer. */
export type CourseTeachingPeriodToken = 'I' | 'II' | 'III' | 'IV' | 'V' | 'Summer'

/** Timeline season (same encoding as the extension study-year grid). */
export type CourseTeachingTimelineSeason = 'Fall' | 'Spring' | 'Summer'

/**
 * A contiguous run of periods on the timeline (may be a single period or e.g. III–V).
 * `timelineYear` is the calendar year used on the timeline for that season (see extension study-year grid).
 */
export type CourseTeachingPeriodGroup = {
  timelineYear: number
  season: CourseTeachingTimelineSeason
  periodFrom: CourseTeachingPeriodToken
  periodTo: CourseTeachingPeriodToken
}

/** Academic years where Kori states there is no teaching (from `additional` text). */
export type CourseTeachingNoTeachingYear = {
  academicYearStart: number
}

export type Course = {
  id: string
  code: string
  groupId: string | null
  nameFi: string | null
  nameEn: string | null
  creditsMin: number | null
  creditsMax: number | null
  validityStart: string | null
  validityEnd: string | null
  avgQualityScore: number | null
  avgWorkloadScore: number | null
  reviewCount: number
  /** Period ranges from Kori `additional` (extension timeline). */
  teachingPeriodGroups?: CourseTeachingPeriodGroup[] | null
  /** Academic years listed as having no teaching in Kori `additional`. */
  teachingPeriodNoTeachingYears?: CourseTeachingNoTeachingYear[] | null
}

export type CourseRealisation = {
  id: string
  code: string
  nameFi: string | null
  nameEn: string | null
  startDate: string | null
  endDate: string | null
  creditsMin: number | null
  creditsMax: number | null
  contentEn: string | null
  contentFi: string | null
  learningOutcomesEn: string | null
  prerequisitesEn: string | null
  teachers: string[] | null
  teacherInCharge: string[] | null
  languageCodes: string[] | null
  organizationNameEn: string | null
  gradingScale: string | null
  level: string | null
}

export type CourseWithRealisations = Course & {
  courseRealisations: CourseRealisation[]
}

export type CoursesResponse = {
  courses: Course[]
  total: number
  limit: number
  offset: number
}

export type CoursesByIdsResponse = {
  courses: Course[]
}

export type CourseFilterOptions = {
  departments: string[]
  levels: string[]
  creditRange: { min: number; max: number }
  periods: string[]
  currentAcademicYear: number
}

export type CourseFilters = {
  creditsMin?: number
  creditsMax?: number
  periods?: string[]
  departments?: string[]
  levels?: string[]
  minRating?: number
  hasReviews?: boolean
  curriculumPeriods?: string[]
}

export type TenttiarkistoExamFile = { id: number; url: string }

export type TenttiarkistoExam = {
  id: number
  desc: string
  exam_date: string
  date_added: string
  lang: string
  files: TenttiarkistoExamFile[]
}

export type TenttiarkistoCourse = {
  id: number
  code: string
  name: string
  exams: TenttiarkistoExam[]
}
