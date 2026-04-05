import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { ParsedCourseUnitSelection } from './TimelinePage'

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
  const creditsForPeriod = s.plannedCredits / Math.max(1, s.parsedPlannedPeriods.filter(Boolean).length)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${s.id}::${periodKey}::${completed ? 'c' : 'p'}`,
    disabled: !!completed,
    data: {
      courseId: s.id,
      periodKey,
      sourcePlannedPeriod,
      selectionIndex: s.selectionIndex,
    },
  })

  const style = {
    minHeight: creditsForPeriod * 20,
    transform: CSS.Translate.toString(transform),
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex touch-none ${
        completed
          ? 'cursor-default bg-neutral-200/80 text-neutral-700'
          : `bg-gray-300 ${isDragging ? 'cursor-grabbing opacity-60' : 'cursor-grab'}`
      }`}
      {...(completed ? {} : listeners)}
      {...(completed ? {} : attributes)}
    >
      <div
        className={`flex w-12 shrink-0 flex-col items-center justify-center py-2 px-1 text-center ${
          completed ? 'bg-neutral-500 text-white' : 'bg-blue-500'
        }`}
      >
        <i>{creditsForPeriod.toFixed(1)}</i>
        {s.creditsMax === s.creditsMin ? s.creditsMax : `${s.creditsMin}–${s.creditsMax}`}
      </div>

      <div className="min-w-0 flex-1 p-2">
        {s.name}
        {completed ? <span className="mt-0.5 block text-xs text-neutral-600">Completed</span> : null}
      </div>
    </li>
  )
}

export default TimelinePeriodCourseItem
