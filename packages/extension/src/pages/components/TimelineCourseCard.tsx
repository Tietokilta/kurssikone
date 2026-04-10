import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { IconEdit } from './TimelineIcons'

type TimelineCourseCardVariant = 'scheduled' | 'unscheduled' | 'completed' | 'dragPreview'

type Props = {
  name: string
  /** Total planned credits for the course (display only; row height still follows per-period layout in the grid). */
  plannedCredits: number
  /** Kori min/max; when they differ, shown as small italic “min–max” under the credits in the colored strip. */
  creditsMin?: number
  creditsMax?: number
  minHeight?: number
  /** Stretch to parent height (e.g. grid row span) instead of min-height from credits. */
  fillContainer?: boolean
  variant: TimelineCourseCardVariant
  isDragging?: boolean
  actionButtons?: ReactNode
  highlightActive?: boolean
  /** Enter edit mode (click / keyboard); shows blue hover overlay + pen when set. */
  onEditActivate?: () => void
  /** `cover` = full-card overlay (e.g. exit move mode); `corner` = top-right chip row. */
  actionButtonsLayout?: 'corner' | 'cover'
  /** Variable-credit course with no user-picked value yet (show ? after the estimate). */
  creditUncertain?: boolean
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
  highlightActive = false,
  onEditActivate,
  actionButtonsLayout = 'corner',
  creditUncertain = false,
}: Props) => {
  const completed = variant === 'completed'
  const preview = variant === 'dragPreview'
  const showVariableRange =
    creditsMin != null &&
    creditsMax != null &&
    creditsMax !== creditsMin
  const rootClassName = completed
    ? 'cursor-default bg-timeline-surface text-neutral-700'
    : `bg-timeline-surface ${preview ? 'cursor-grabbing shadow-lg ring-1 ring-neutral-900/15' : isDragging ? 'cursor-grabbing opacity-60' : 'cursor-grab'}`

  const editActivateProps =
    onEditActivate !== undefined
      ? {
          role: 'button' as const,
          tabIndex: 0 as const,
          'aria-label': 'Enter edit mode' as const,
          // Document listener in TimelinePage exits edit mode on any click outside drop zones;
          // stop propagation so this activation click does not immediately reset.
          onClick: (e: MouseEvent<HTMLDivElement>) => {
            e.stopPropagation()
            onEditActivate()
          },
          onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              onEditActivate()
            }
          },
        }
      : {}

  return (
    <div
      style={!fillContainer && minHeight ? { minHeight } : undefined}
      className={`group relative box-border flex w-full min-w-0 ${fillContainer ? 'h-full min-h-0' : 'h-full'} ${rootClassName} ${highlightActive ? 'ring-2 ring-inset ring-timeline-move/80' : ''}`}
      {...editActivateProps}
    >
      <div className="flex min-h-0 w-full flex-1">
        <div
          className={`flex w-12 shrink-0 flex-col items-center justify-center px-1 py-2 text-center text-white ${
            completed ? 'bg-neutral-500' : 'bg-timeline-accent'
          }`}
        >
          <span className="text-sm font-medium leading-tight tabular-nums">
            {plannedCredits % 1 === 0 ? plannedCredits : plannedCredits.toFixed(1)}
            {creditUncertain ? '?' : ''}
          </span>
          {showVariableRange ? (
            <span className="mt-0.5 block max-w-full break-all text-[10px] italic leading-tight text-white/85">
              {creditsMin}-{creditsMax}
            </span>
          ) : null}
        </div>

        <div className="relative min-w-0 flex-1 p-2">
          {name}
          {completed ? (
            <span className="mt-0.5 block text-xs text-neutral-600">Completed</span>
          ) : null}
        </div>
      </div>

      {onEditActivate ? (
        <div
          className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center bg-timeline-move/70 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          aria-hidden
        >
          <IconEdit className="size-8 text-white" />
        </div>
      ) : null}

      {actionButtons ? (
        <div
          className={
            actionButtonsLayout === 'cover'
              ? `pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-150 ${
                  highlightActive
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                }`
              : `pointer-events-none absolute top-1 right-1 z-20 flex flex-row gap-1 transition-opacity duration-150 ${
                  highlightActive
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                }`
          }
        >
          {actionButtons}
        </div>
      ) : null}
    </div>
  )
}

export default TimelineCourseCard
