/** User-visible copy for timeline period placement actions (drop tiles, edit strip). */
export const TIMELINE_PLACEMENT_LABELS = {
  keepInCurrentPeriod: 'Keep in current period',
  moveToPeriod: 'Move to period',
  extendToPeriod: 'Extend to period',
  removeFromPeriod: 'Remove from period',
  removeFromThisPeriodAria: 'Remove from this period',
} as const

export function formatMoveAndExpandTo(optionLabel: string): string {
  return `Move and expand to ${optionLabel}`
}
