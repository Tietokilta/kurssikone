export const GENERIC_ERROR_MESSAGE =
  'Something went wrong. Please contact the developers if the issue persists.'

export const scoreTypes = [
  {
    name: 'qualityScore',
    label: 'Quality',
    labels: ['Poor', 'Below Average', 'Average', 'Good', 'Excellent'],
  },
  {
    name: 'workloadScore',
    label: 'Workload',
    labels: ['Very Light', 'Light', 'Moderate', 'Heavy', 'Very Heavy'],
  },
] as const

export const getScoreLabel = (
  labels: readonly string[],
  value: number
): string => {
  const index = Math.round(Math.min(Math.max(value - 1, 0), labels.length - 1))
  return labels[index]
}
