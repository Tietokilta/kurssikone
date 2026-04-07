import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

type Props = {
  id: string
  data: Record<string, unknown>
  disabled?: boolean
  children: (state: { isDragging: boolean }) => ReactNode
}

const TimelineDraggableCard = ({ id, data, disabled = false, children }: Props) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
    data,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`relative w-full min-w-0 touch-none ${isDragging ? 'z-20' : 'z-0'}`}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
    >
      {children({ isDragging })}
    </li>
  )
}

export default TimelineDraggableCard
