import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'

type TimelineDropAction = 'move' | 'extend'
type TimelineDropTone = 'move' | 'extend'

type Props = {
  id: string
  action: TimelineDropAction
  plannedPeriod: string
  label: string
  icon: ReactNode
  tone: TimelineDropTone
  layout?: 'half' | 'fill'
  onClick?: () => void
  clickActive?: boolean
}

const toneClassName: Record<TimelineDropTone, { base: string; active: string; hover: string }> = {
  move: {
    base: 'bg-timeline-move/50 ring-0 ring-transparent',
    active:
      'bg-timeline-move/95 ring-4 ring-inset ring-white shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_28px_rgba(59,130,246,0.75)]',
    hover:
      'hover:bg-timeline-move/95 hover:ring-4 hover:ring-inset hover:ring-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_28px_rgba(59,130,246,0.75)]',
  },
  extend: {
    base: 'bg-timeline-extend/55 ring-0 ring-transparent',
    active:
      'bg-timeline-extend/95 ring-4 ring-inset ring-white shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_28px_rgba(16,185,129,0.75)]',
    hover:
      'hover:bg-timeline-extend/95 hover:ring-4 hover:ring-inset hover:ring-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_28px_rgba(16,185,129,0.75)]',
  },
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
      onClick={onClick}
      className={`flex flex-1 min-h-0 cursor-pointer flex-col items-center justify-center gap-1.5 px-2 py-2 text-center text-xs font-medium text-white drop-shadow-sm transition-[background-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
        layout === 'half' ? '' : 'min-h-full'
      } ${active ? toneClassName[tone].active : toneClassName[tone].base} ${
        onClick ? toneClassName[tone].hover : ''
      }`}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default TimelineDropTile
