import { creditChoiceIsUserSet, isVariableCreditRange } from '../../utils/timelineVariableCredits'
import type { ParsedCourseUnitSelection } from '../TimelinePage'
import TimelineCourseCard from './TimelineCourseCard'
import TimelineDraggableCard from './TimelineDraggableCard'

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
  variableCreditOverrides: Record<string, number>
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
  variableCreditOverrides,
}: Props) => {
  const actionable = !completed && s.selectionIndex >= 0
  const creditUncertain =
    isVariableCreditRange(s.creditsMin, s.creditsMax) &&
    !creditChoiceIsUserSet(s.id, variableCreditOverrides)

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
          courseUnitId={s.id}
          courseCode={s.code}
          teachingPeriodLines={s.teachingPeriodLabels}
          plannedCredits={s.plannedCredits}
          creditsMin={s.creditsMin}
          creditsMax={s.creditsMax}
          fillContainer
          variant={completed ? 'completed' : 'scheduled'}
          isDragging={isDragging}
          highlightActive={isMoveModeActive}
          creditUncertain={creditUncertain}
          onEditActivate={
            actionable && !isMoveModeActive
              ? () => onToggleMoveMode(s.selectionIndex, sourcePlannedPeriod, cardKey)
              : undefined
          }
        />
      )}
    </TimelineDraggableCard>
  )
}

export default TimelinePeriodCourseItem
