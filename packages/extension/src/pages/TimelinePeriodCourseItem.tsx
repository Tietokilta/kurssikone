import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { ParsedCourseUnitSelection } from './TimelinePage'

type Props = {
  selection: ParsedCourseUnitSelection
  periodKey: string
  /** Sisu `plannedPeriod` string for this timeline cell (same encoding as drop targets). */
  sourcePlannedPeriod: string
}

const TimelinePeriodCourseItem = ({ selection: s, periodKey, sourcePlannedPeriod }: Props) => {
  const creditsForPeriod = s.plannedCredits / s.parsedPlannedPeriods.length

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${s.id}::${periodKey}`,
    data: { courseId: s.id, sourcePlannedPeriod, selectionIndex: s.selectionIndex },
  })

  const style = {
    minHeight: creditsForPeriod * 20,
    transform: CSS.Translate.toString(transform),
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bg-gray-300 flex touch-none ${isDragging ? 'cursor-grabbing opacity-60' : 'cursor-grab'}`}
      {...listeners}
      {...attributes}
    >
      <div className="py-2 px-1 bg-blue-500 text-center w-12 shrink-0 flex flex-col items-center justify-center">
        <i>{creditsForPeriod.toFixed(1)}</i>
        {s.creditsMax === s.creditsMin ? s.creditsMax : `${s.creditsMin}–${s.creditsMax}`}
      </div>

      <div className="p-2">{s.name}</div>
    </li>
  )
}

export default TimelinePeriodCourseItem
