export type Review = {
  id: number
  title: string
  content: string
  date: string
  workloadScore: number
  qualityScore: number
  difficultyScore: number
  courseCode: string
}

export type ReviewResponse = {
  rows: Review[]
  count: number
  averages: {
    workloadAverage: number
    qualityAverage: number
    difficultyAverage: number
  }
}
