import type { MouseEvent } from 'react'
import {
  formatKeepInPeriod,
  formatMoveToPeriod,
  formatRemoveFromPeriod,
} from './timelineActionLabels'
import { IconKeepInPeriod, IconMoveToPeriod, IconScissors } from './TimelineIcons'
import { timelineToneButtonClasses, type TimelineDropTone } from './timelineDropTones'
import VariableCreditsEditPopup from './VariableCreditsEditPopup'

/** Matches {@link TimelineDropTile} `layout="half"` — vertical split, fills parent (overlay column). */
const stripHalfShell =
  'flex flex-1 min-h-0 w-full cursor-pointer flex-col items-center justify-center gap-1.5 px-2 py-2 text-center text-xs font-medium text-white drop-shadow-sm transition-[background-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'

export type TimelineVariableCreditsEdit = {
  min: number
  max: number
  value: number
  onChange: (credits: number) => void
  idSuffix: string
}

export type TimelineEditColumnStripProps = {
  plannedPeriod: string
  /** Semester + period column label for actions (e.g. `Spring 2025 — P3`). */
  periodDisplayName: string
  /** When false, the move action is `Move to {column}` without “start from” (single-period row). */
  moveLabelLongForm?: boolean
  isAnchorColumn: boolean
  onRemove: (plannedPeriod: string) => void
  onMoveToPeriod?: (plannedPeriod: string) => void
  onExitEditMode: () => void
  variableCreditsEdit?: TimelineVariableCreditsEdit | null
}

/** One period column: keep | move (top) + remove (bottom). Parent should use same shell as drop overlays (`absolute inset-0 flex flex-col`). */
const TimelineEditColumnStrip = ({
  plannedPeriod,
  periodDisplayName,
  moveLabelLongForm = true,
  isAnchorColumn,
  onRemove,
  onMoveToPeriod,
  onExitEditMode,
  variableCreditsEdit = null,
}: TimelineEditColumnStripProps) => {
  const secondaryTone: TimelineDropTone = isAnchorColumn ? 'keep' : 'move'
  const secondaryLabel = isAnchorColumn
    ? formatKeepInPeriod(periodDisplayName)
    : formatMoveToPeriod(periodDisplayName, moveLabelLongForm)
  const secondaryIcon = isAnchorColumn ? (
    <IconKeepInPeriod className="size-5 shrink-0 opacity-95" />
  ) : (
    <IconMoveToPeriod className="size-5 shrink-0 opacity-95" />
  )

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col">
      {variableCreditsEdit ? (
        <VariableCreditsEditPopup
          min={variableCreditsEdit.min}
          max={variableCreditsEdit.max}
          value={variableCreditsEdit.value}
          onChange={variableCreditsEdit.onChange}
          idSuffix={variableCreditsEdit.idSuffix}
          className="absolute bottom-full left-0 right-0 mb-1"
        />
      ) : null}
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
        aria-label={formatRemoveFromPeriod(periodDisplayName)}
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation()
          onRemove(plannedPeriod)
        }}
      >
        <IconScissors className="size-5 shrink-0 opacity-95" />
        <span>{formatRemoveFromPeriod(periodDisplayName)}</span>
      </button>
    </div>
  )
}

export default TimelineEditColumnStrip
