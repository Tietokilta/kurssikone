import type { MouseEvent } from 'react'
import { IconKeepInPeriod, IconMoveToPeriod, IconScissors } from './TimelineIcons'
import { timelineToneButtonClasses, type TimelineDropTone } from './timelineDropTones'

/** Matches {@link TimelineDropTile} `layout="half"` — vertical split, fills parent (overlay column). */
const stripHalfShell =
  'flex flex-1 min-h-0 w-full cursor-pointer flex-col items-center justify-center gap-1.5 px-2 py-2 text-center text-xs font-medium text-white drop-shadow-sm transition-[background-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'

export type TimelineEditColumnStripProps = {
  plannedPeriod: string
  isAnchorColumn: boolean
  onRemove: (plannedPeriod: string) => void
  onMoveToPeriod?: (plannedPeriod: string) => void
  onExitEditMode: () => void
}

/** One period column: keep | move (top) + remove (bottom). Parent should use same shell as drop overlays (`absolute inset-0 flex flex-col`). */
const TimelineEditColumnStrip = ({
  plannedPeriod,
  isAnchorColumn,
  onRemove,
  onMoveToPeriod,
  onExitEditMode,
}: TimelineEditColumnStripProps) => {
  const secondaryTone: TimelineDropTone = isAnchorColumn ? 'keep' : 'move'
  const secondaryLabel = isAnchorColumn ? 'Keep in current period' : 'Move to period'
  const secondaryIcon = isAnchorColumn ? (
    <IconKeepInPeriod className="size-5 shrink-0 opacity-95" />
  ) : (
    <IconMoveToPeriod className="size-5 shrink-0 opacity-95" />
  )

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <button
        type="button"
        className={`${stripHalfShell} ${timelineToneButtonClasses(secondaryTone, false, true)}`}
        aria-label={secondaryLabel}
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation()
          if (isAnchorColumn) {
            onExitEditMode()
          } else {
            onMoveToPeriod?.(plannedPeriod)
          }
        }}
      >
        {secondaryIcon}
        <span>{secondaryLabel}</span>
      </button>
      <button
        type="button"
        className={`${stripHalfShell} ${timelineToneButtonClasses('unschedule', false, true)}`}
        aria-label="Remove from this period"
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation()
          onRemove(plannedPeriod)
        }}
      >
        <IconScissors className="size-5 shrink-0 opacity-95" />
        <span>Remove from period</span>
      </button>
    </div>
  )
}

export default TimelineEditColumnStrip
