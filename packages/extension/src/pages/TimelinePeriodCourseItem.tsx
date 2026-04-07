import type { ParsedCourseUnitSelection } from './TimelinePage'
import TimelineCourseCard from './components/TimelineCourseCard'
import TimelineDraggableCard from './components/TimelineDraggableCard'
import { IconUnschedule } from './components/TimelineIcons'
import TimelineMoveModeButton from './components/TimelineMoveModeButton'

type Props = {
  selection: ParsedCourseUnitSelection
  periodKey: string
  /** Sisu `plannedPeriod` string for this timeline cell (same encoding as drop targets). */
  sourcePlannedPeriod: string
  completed?: boolean
  onUnschedule: (selectionIndex: number, sourcePlannedPeriod: string) => void
  onToggleMoveMode: (selectionIndex: number, sourcePlannedPeriod: string) => void
  isMoveModeActive: boolean
}

const TimelinePeriodCourseItem = ({
  selection: s,
  periodKey,
  sourcePlannedPeriod,
  completed,
  onUnschedule,
  onToggleMoveMode,
  isMoveModeActive,
}: Props) => {
  const creditsForPeriod =
    s.plannedCredits / Math.max(1, s.parsedPlannedPeriods.filter(Boolean).length)
  const actionable = !completed && s.selectionIndex >= 0

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
          highlightActive={isMoveModeActive}
          actionButtons={
            actionable ? (
              <>
                <button
                  type="button"
                  className="pointer-events-auto flex size-7 items-center justify-center rounded bg-timeline-unschedule/90 text-white shadow hover:bg-timeline-unschedule focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Unschedule current period"
                  onClick={(event) => {
                    event.stopPropagation()
                    onUnschedule(s.selectionIndex, sourcePlannedPeriod)
                  }}
                >
                  <IconUnschedule className="size-4" />
                </button>
                <TimelineMoveModeButton
                  isActive={isMoveModeActive}
                  onClick={() => onToggleMoveMode(s.selectionIndex, sourcePlannedPeriod)}
                />
              </>
            ) : undefined
          }
        />
      )}
    </TimelineDraggableCard>
  )
}

export default TimelinePeriodCourseItem
