import { plannedCreditsPerTimelineSlice } from '../../utils/parsePlannedPeriods'
import type { ParsedCourseUnitSelection } from '../TimelinePage'
import TimelineCourseCard from './TimelineCourseCard'
import TimelineDraggableCard from './TimelineDraggableCard'
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
  onToggleMoveMode,
  isMoveModeActive,
}: Props) => {
  const creditsForPeriod = plannedCreditsPerTimelineSlice(s)
  const actionable = !completed && s.selectionIndex >= 0

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
        connectedPlannedPeriods: columnPlannedPeriods,
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
          actionButtons={
            actionable && !isMoveModeActive ? (
              <TimelineMoveModeButton
                isActive={false}
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
