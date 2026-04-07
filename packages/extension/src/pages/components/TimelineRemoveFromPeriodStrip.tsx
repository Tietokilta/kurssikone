import type { MouseEvent } from 'react'
import { IconScissors } from './TimelineIcons'

/** Column hit targets on top of full-card red wash; hover matches {@link TimelineDropTile} intensity. */
const cellTone =
  'bg-transparent text-white drop-shadow-sm transition-[background-color,box-shadow] duration-150 ease-out hover:bg-timeline-unschedule/95 hover:ring-4 hover:ring-inset hover:ring-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_28px_rgba(220,38,38,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'

type Props = {
  columnPlannedPeriods: string[]
  onRemove: (plannedPeriod: string) => void
}

const TimelineRemoveFromPeriodStrip = ({ columnPlannedPeriods, onRemove }: Props) => {
  const n = columnPlannedPeriods.length
  if (n === 0) {
    return null
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-timeline-unschedule/50">
      <div
        className="grid h-full min-h-0 flex-1 gap-px bg-white/25"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {columnPlannedPeriods.map((plannedPeriod, i) => (
          <button
            key={`${plannedPeriod}-${i}`}
            type="button"
            className={`flex h-full min-h-0 w-full cursor-pointer flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[10px] font-medium leading-snug ${cellTone}`}
            aria-label="Remove from this period"
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation()
              onRemove(plannedPeriod)
            }}
          >
            <IconScissors className="size-4 shrink-0 opacity-95" />
            <span className="leading-tight">Remove from period</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default TimelineRemoveFromPeriodStrip
