export type Review = {
  id: number
  title: string
  professor: string
  year: number
  content: string
  workloadScore: number
  qualityScore: number
  difficultyScore: number
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
  difficultyAverage: number
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
