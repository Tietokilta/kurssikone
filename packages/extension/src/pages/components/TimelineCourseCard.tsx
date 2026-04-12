import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { TIMELINE_MOVE_CHROME_CLASSES } from './timelineDropTones'
import { IconEdit } from './TimelineIcons'

type TimelineCourseCardVariant = 'scheduled' | 'unscheduled' | 'completed' | 'dragPreview'

type Props = {
  name: string
  /** Course unit code (e.g. CS-C1000); shown under the title when set. */
  courseCode?: string
  /** Lines from Kori teaching period hints (shown under the title). */
  teachingPeriodLines?: string[]
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
  /** Sisu course unit id (e.g. `aalto-CU-1150973069-20240801`); title links to completion methods in a new tab. */
  courseUnitId?: string
}

function sisuCourseUnitCompletionMethodsUrl(courseUnitId: string): string {
  return `https://sisu.aalto.fi/student/courseunit/${encodeURIComponent(courseUnitId)}/completion-methods`
}

const TimelineCourseCard = ({
  name,
  courseCode,
  teachingPeriodLines,
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
  courseUnitId,
}: Props) => {
  const completed = variant === 'completed'
  const preview = variant === 'dragPreview'
  const showCourseCode =
    !!courseCode && courseCode.trim() !== '' && courseCode.trim() !== name.trim()
  const showVariableRange = creditsMin != null && creditsMax != null && creditsMax !== creditsMin
  const rootClassName = completed
    ? 'cursor-default bg-timeline-surface text-neutral-700'
    : `bg-timeline-surface ${preview ? 'cursor-grabbing shadow-lg ring-1 ring-neutral-900/15' : isDragging ? 'cursor-grabbing opacity-60' : 'cursor-grab'}`

  const canEdit = onEditActivate !== undefined
  const trimmedCourseUnitId = courseUnitId?.trim() ?? ''
  const hasTitleLink = trimmedCourseUnitId.length > 0
  /** Title is a link → edit activation is on credits strip + body below title, not the whole card. */
  const splitEditRegions = canEdit && hasTitleLink

  const editActivateProps =
    canEdit && onEditActivate
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

  const rootEditProps = !splitEditRegions && canEdit ? editActivateProps : {}

  const titleClassName = 'min-w-0 break-words leading-snug'
  const titleLinkClassName = `${titleClassName} cursor-pointer text-inherit underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-timeline-accent w-fit`

  const bodyBlock = (
    <>
      {showCourseCode ? (
        <div className="mt-0.5 text-[11px] font-normal leading-tight text-neutral-500">
          {courseCode}
        </div>
      ) : null}
      {teachingPeriodLines && teachingPeriodLines.length > 0 ? (
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] leading-snug text-neutral-500">
          {teachingPeriodLines.map((line, i) => (
            <li key={`${i}-${line}`} className="wrap-break-word">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
      {completed ? <span className="mt-0.5 block text-xs text-neutral-600">Completed</span> : null}
    </>
  )

  return (
    <div
      style={!fillContainer && minHeight ? { minHeight } : undefined}
      className={`group relative box-border flex w-full min-w-0 ${fillContainer ? 'h-full min-h-0' : 'h-full'} ${rootClassName} ${
        highlightActive ? TIMELINE_MOVE_CHROME_CLASSES.courseCardPlacementHighlightRing : ''
      }`}
      {...rootEditProps}
    >
      <div className="flex min-h-0 w-full flex-1">
        <div
          className={`flex w-12 shrink-0 flex-col items-center justify-center px-1 py-2 text-center text-white ${
            completed ? 'bg-neutral-500' : 'bg-timeline-accent'
          }`}
          {...(splitEditRegions ? editActivateProps : {})}
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

        <div
          className={`relative min-w-0 flex-1 p-2 ${splitEditRegions ? 'flex min-h-0 flex-col' : ''}`}
        >
          {hasTitleLink ? (
            <a
              href={sisuCourseUnitCompletionMethodsUrl(trimmedCourseUnitId)}
              target="_blank"
              rel="noopener noreferrer"
              className={titleLinkClassName}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {name}
            </a>
          ) : (
            <div className={titleClassName}>{name}</div>
          )}
          {splitEditRegions ? (
            <div className="flex min-h-0 flex-1 flex-col" {...editActivateProps}>
              {bodyBlock}
            </div>
          ) : (
            bodyBlock
          )}
        </div>
      </div>

      {onEditActivate ? (
        <div className={TIMELINE_MOVE_CHROME_CLASSES.courseCardEditHoverOverlay} aria-hidden>
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
