export const GENERIC_ERROR_MESSAGE =
  'Something went wrong. Please contact the developers if the issue persists.'

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
] as const
