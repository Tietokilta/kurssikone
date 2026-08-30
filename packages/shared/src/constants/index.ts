export const GENERIC_ERROR_MESSAGE_KEY = 'shared.genericError'

export const GENERIC_ERROR_MESSAGE =
  'Something went wrong. Please contact the developers if the issue persists.'

export const scoreTypes = [
  {
    name: 'qualityScore',
    label: 'Quality',
    labelKey: 'shared.quality',
    labels: ['Poor', 'Below Average', 'Average', 'Good', 'Excellent'],
    labelsKey: 'shared.qualityLabels',
  },
  {
    name: 'workloadScore',
    label: 'Workload',
    labelKey: 'shared.workload',
    labels: ['Very Light', 'Light', 'Moderate', 'Heavy', 'Very Heavy'],
    labelsKey: 'shared.workloadLabels',
  },
] as const

export const getScoreLabel = (
  labels: readonly string[],
  value: number
): string => {
  const index = Math.round(Math.min(Math.max(value - 1, 0), labels.length - 1))
  return labels[index]
}
