import type { ParsedCourseUnitSelection } from './TimelinePage'
import TimelineCourseCard from './components/TimelineCourseCard'
import TimelineDraggableCard from './components/TimelineDraggableCard'

type Props = {
  selection: ParsedCourseUnitSelection
  periodKey: string
  /** Sisu `plannedPeriod` string for this timeline cell (same encoding as drop targets). */
  sourcePlannedPeriod: string
  completed?: boolean
}

const TimelinePeriodCourseItem = ({
  selection: s,
  periodKey,
  sourcePlannedPeriod,
  completed,
}: Props) => {
  const creditsForPeriod =
    s.plannedCredits / Math.max(1, s.parsedPlannedPeriods.filter(Boolean).length)

  return (
    <TimelineDraggableCard
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
          minHeight={creditsForPeriod * 20}
          variant={completed ? 'completed' : 'scheduled'}
          isDragging={isDragging}
        />
      )}
    </TimelineDraggableCard>
  )
}

export default TimelinePeriodCourseItem
