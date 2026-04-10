import { useDroppable } from '@dnd-kit/core'
import type { MouseEvent, ReactNode } from 'react'
import { type TimelineDroppableTone, timelineToneButtonClasses } from './timelineDropTones'

export type TimelineDropTileAction = 'move' | 'extend' | 'keep' | 'designated'

type Props = {
  id: string
  action: TimelineDropTileAction
  /** Anchor locator for dnd-kit; for designated span, first period in the span. */
  plannedPeriod: string
  /** When action is `designated`, full span passed to drop resolution. */
  spanLocators?: string[]
  label: string
  /** Overrides visible `label` for screen readers when set. */
  ariaLabel?: string
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
  spanLocators,
  label,
  ariaLabel,
  icon,
  tone,
  layout = 'fill',
  onClick,
  clickActive = false,
}: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data:
      action === 'designated' && spanLocators?.length
        ? { plannedPeriod, action, spanLocators }
        : { plannedPeriod, action },
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
      aria-label={ariaLabel ?? label}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default TimelineDropTile
