import type { ReactNode } from 'react'

type TimelineCourseCardVariant = 'scheduled' | 'unscheduled' | 'completed' | 'dragPreview'

type Props = {
  name: string
  plannedCredits: number
  creditsMin: number
  creditsMax: number
  minHeight?: number
  /** Stretch to parent height (e.g. grid row span) instead of min-height from credits. */
  fillContainer?: boolean
  variant: TimelineCourseCardVariant
  isDragging?: boolean
  actionButtons?: ReactNode
  /** Full-card translucent overlay with remove actions (edit mode). */
  editModeRemoveStrip?: ReactNode
  highlightActive?: boolean
}

const TimelineCourseCard = ({
  name,
  plannedCredits,
  creditsMin,
  creditsMax,
  minHeight,
  fillContainer = false,
  variant,
  isDragging = false,
  actionButtons,
  editModeRemoveStrip,
  highlightActive = false,
}: Props) => {
  const completed = variant === 'completed'
  const preview = variant === 'dragPreview'
  const rootClassName = completed
    ? 'cursor-default bg-timeline-surface text-neutral-700'
    : `bg-timeline-surface ${preview ? 'cursor-grabbing shadow-lg ring-1 ring-neutral-900/15' : isDragging ? 'cursor-grabbing opacity-60' : 'cursor-grab'}`

  return (
    <div
      style={!fillContainer && minHeight ? { minHeight } : undefined}
      className={`group relative box-border flex w-full min-w-0 ${fillContainer ? 'h-full min-h-0' : 'h-full'} ${rootClassName} ${highlightActive ? 'ring-2 ring-inset ring-timeline-move/80' : ''}`}
    >
      <div className="flex min-h-0 w-full flex-1">
        <div
          className={`flex w-12 shrink-0 flex-col items-center justify-center px-1 py-2 text-center text-white ${
            completed ? 'bg-neutral-500' : 'bg-timeline-accent'
          }`}
        >
          <i>{plannedCredits.toFixed(1)}</i>
          {creditsMax === creditsMin ? creditsMax : `${creditsMin}-${creditsMax}`}
        </div>

        <div className="relative min-w-0 flex-1 p-2">
          {name}
          {completed ? (
            <span className="mt-0.5 block text-xs text-neutral-600">Completed</span>
          ) : null}
        </div>
      </div>

      {editModeRemoveStrip ? (
        <div className="pointer-events-auto absolute inset-0 z-10 flex min-h-0 min-w-0 flex-col">
          {editModeRemoveStrip}
        </div>
      ) : null}

      {actionButtons ? (
        <div
          className={`pointer-events-none absolute top-1 right-1 z-20 flex flex-row gap-1 transition-opacity duration-150 ${
            highlightActive
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}
        >
          {actionButtons}
        </div>
      ) : null}
    </div>
  )
}

export default TimelineCourseCard
