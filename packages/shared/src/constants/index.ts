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

const LEVEL_NAMES_FI: [string, string][] = [
  ['basic', 'Perusopinnot'],
  ['intermediate', 'Aineopinnot'],
  ['advanced', 'Syventävät opinnot'],
  ['doctoral', 'Jatko-opinnot'],
  ['postgraduate', 'Jatko-opinnot'],
  ['other', 'Muut opinnot'],
]

export function formatLevel(raw: string): string {
  return raw
    .replace(/[-_]/g, ' ')
    .replace(/\bstudies\b/gi, '')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(And|Or|Of|In)\b/g, (w) => w.toLowerCase())
}

export function formatLevelFi(raw: string): string {
  const lower = raw.toLowerCase()
  for (const [keyword, fi] of LEVEL_NAMES_FI) {
    if (lower.includes(keyword)) return fi
  }
  return formatLevel(raw)
}

export function translateLevel(raw: string, isFi: boolean): string {
  return isFi ? formatLevelFi(raw) : formatLevel(raw)
}

export const getScoreLabel = (
  labels: readonly string[],
  value: number
): string => {
  const index = Math.round(Math.min(Math.max(value - 1, 0), labels.length - 1))
  return labels[index]
}
