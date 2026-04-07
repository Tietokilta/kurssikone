import type { ReactNode } from 'react'

type TimelineCourseCardVariant = 'scheduled' | 'unscheduled' | 'completed' | 'dragPreview'

type Props = {
  name: string
  plannedCredits: number
  creditsMin: number
  creditsMax: number
  minHeight?: number
  variant: TimelineCourseCardVariant
  isDragging?: boolean
  actionButtons?: ReactNode
  highlightActive?: boolean
}

const TimelineCourseCard = ({
  name,
  plannedCredits,
  creditsMin,
  creditsMax,
  minHeight,
  variant,
  isDragging = false,
  actionButtons,
  highlightActive = false,
}: Props) => {
  const completed = variant === 'completed'
  const preview = variant === 'dragPreview'
  const rootClassName = completed
    ? 'cursor-default bg-timeline-surface text-neutral-700'
    : `bg-timeline-surface ${preview ? 'cursor-grabbing shadow-lg ring-1 ring-neutral-900/15' : isDragging ? 'cursor-grabbing opacity-60' : 'cursor-grab'}`

  return (
    <div
      style={minHeight ? { minHeight } : undefined}
      className={`group box-border flex h-full w-full min-w-0 ${rootClassName} ${highlightActive ? 'ring-2 ring-inset ring-timeline-move/80' : ''}`}
    >
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
        {actionButtons ? (
          <div className="pointer-events-none absolute top-1 right-1 z-10 flex flex-row gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            {actionButtons}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default TimelineCourseCard
