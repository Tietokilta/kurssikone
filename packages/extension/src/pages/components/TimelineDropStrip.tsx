import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'

type Props = {
  id: string
  action: 'unschedule'
  label: string
  icon: ReactNode
}

const TimelineDropStrip = ({ id, action, label, icon }: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { action },
  })

  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label="Drop here to unschedule this course from its current period"
      className={`fixed top-0 right-0 bottom-0 z-10 flex w-28 flex-col items-center justify-center gap-3 border-l-2 border-red-800 px-2 py-4 text-xs font-medium text-white drop-shadow-sm shadow-lg transition-[background-color,box-shadow] duration-150 ease-out ${
        isOver
          ? 'bg-timeline-unschedule/95 ring-4 ring-inset ring-white shadow-[-12px_0_36px_rgba(239,68,68,0.65)]'
          : 'bg-timeline-unschedule/65 ring-0 ring-transparent'
      }`}
    >
      {icon}
      <span className="text-center leading-tight [writing-mode:vertical-rl]">{label}</span>
    </div>
  )
}

export default TimelineDropStrip
