import { plannedCreditsPerTimelineSlice } from '../../utils/parsePlannedPeriods'
import type { ParsedCourseUnitSelection } from '../TimelinePage'
import TimelineCourseCard from './TimelineCourseCard'
import TimelineDraggableCard from './TimelineDraggableCard'
import { IconScissors } from './TimelineIcons'
import TimelineMoveModeButton from './TimelineMoveModeButton'

type Props = {
  selection: ParsedCourseUnitSelection
  periodKey: string
  /** Sisu `plannedPeriod` string for this timeline cell (same encoding as drop targets). */
  sourcePlannedPeriod: string
  /** Planned period for each spanned column (for per-column unschedule). */
  columnPlannedPeriods: string[]
  /** Semester row (`TimelineCard.cardKey`); edit-mode state keys on this. */
  cardKey: string
  completed?: boolean
  onUnschedule: (selectionIndex: number, sourcePlannedPeriod: string) => void
  onToggleMoveMode: (selectionIndex: number, sourcePlannedPeriod: string, cardKey: string) => void
  isMoveModeActive: boolean
}

const TimelinePeriodCourseItem = ({
  selection: s,
  periodKey,
  sourcePlannedPeriod,
  columnPlannedPeriods,
  cardKey,
  completed,
  onUnschedule,
  onToggleMoveMode,
  isMoveModeActive,
}: Props) => {
  const creditsForPeriod = plannedCreditsPerTimelineSlice(s)
  const actionable = !completed && s.selectionIndex >= 0
  const editModeColumnStrip =
    isMoveModeActive && actionable && columnPlannedPeriods.length > 0 ? (
      <div
        className="grid w-full gap-1"
        style={{
          gridTemplateColumns: `repeat(${columnPlannedPeriods.length}, minmax(0, 1fr))`,
        }}
      >
        {columnPlannedPeriods.map((plannedPeriodForColumn, i) => (
          <button
            key={`${plannedPeriodForColumn}-${i}`}
            type="button"
            className="pointer-events-auto flex size-7 items-center justify-center justify-self-center rounded bg-timeline-unschedule/90 text-white shadow hover:bg-timeline-unschedule focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Remove from this period"
            onClick={(event) => {
              event.stopPropagation()
              onUnschedule(s.selectionIndex, plannedPeriodForColumn)
            }}
          >
            <IconScissors className="size-4" />
          </button>
        ))}
      </div>
    ) : undefined

  return (
    <TimelineDraggableCard
      className="h-full min-h-0"
      id={`${s.id}::${periodKey}::${completed ? 'c' : 'p'}`}
      disabled={!!completed}
      data={{
        courseId: s.id,
        periodKey,
        sourcePlannedPeriod,
        selectionIndex: s.selectionIndex,
      }}
    >
      {({ isDragging }) => (
        <TimelineCourseCard
          name={s.name}
          plannedCredits={creditsForPeriod}
          creditsMin={s.creditsMin}
          creditsMax={s.creditsMax}
          fillContainer
          variant={completed ? 'completed' : 'scheduled'}
          isDragging={isDragging}
          highlightActive={isMoveModeActive}
          editModeColumnStrip={editModeColumnStrip}
          actionButtons={
            actionable ? (
              <TimelineMoveModeButton
                isActive={isMoveModeActive}
                onClick={() => onToggleMoveMode(s.selectionIndex, sourcePlannedPeriod, cardKey)}
              />
            ) : undefined
          }
        />
      )}
    </TimelineDraggableCard>
  )
}

export default TimelinePeriodCourseItem
