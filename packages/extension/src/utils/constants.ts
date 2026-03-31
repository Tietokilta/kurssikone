export const scoreTypes = [
  {
    name: 'qualityScore',
    label: 'Quality',
    minText: 'Horrible',
    maxText: 'Amazing',
  },
  {
    name: 'workloadScore',
    label: 'Workload',
    minText: 'Trivial',
    maxText: 'Massive',
  },
  {
    name: 'difficultyScore',
    label: 'Difficulty',
    minText: 'Very easy',
    maxText: 'Very hard',
  },
] as const
