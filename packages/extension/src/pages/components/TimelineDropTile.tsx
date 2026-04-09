import { useDroppable } from '@dnd-kit/core'
import type { MouseEvent, ReactNode } from 'react'
import { type TimelineDroppableTone, timelineToneButtonClasses } from './timelineDropTones'

export type TimelineDropTileAction = 'move' | 'extend' | 'keep'

type Props = {
  id: string
  action: TimelineDropTileAction
  plannedPeriod: string
  label: string
  icon: ReactNode
  tone: TimelineDroppableTone
  layout?: 'half' | 'fill'
  onClick?: () => void
  clickActive?: boolean
}

const TimelineDropTile = ({
  id,
  action,
  plannedPeriod,
  label,
  icon,
  tone,
  layout = 'fill',
  onClick,
  clickActive = false,
}: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { plannedPeriod, action },
  })
  const active = isOver || clickActive

  return (
    <button
      type="button"
      ref={setNodeRef}
      data-timeline-drop-zone
      onClick={
        onClick
          ? (e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation()
              onClick()
            }
          : undefined
      }
      className={`flex flex-1 min-h-0 cursor-pointer flex-col items-center justify-center gap-1.5 px-2 py-2 text-center text-xs font-medium text-white drop-shadow-sm transition-[background-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
        layout === 'half' ? '' : 'min-h-full'
      } ${timelineToneButtonClasses(tone, active, !!onClick)}`}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default TimelineDropTile
