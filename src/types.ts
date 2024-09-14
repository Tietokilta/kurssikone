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
