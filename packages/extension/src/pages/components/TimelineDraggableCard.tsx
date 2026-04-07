import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

type Props = {
  id: string
  data: Record<string, unknown>
  disabled?: boolean
  minHeight?: number
  children: (state: { isDragging: boolean }) => ReactNode
}

const TimelineDraggableCard = ({ id, data, disabled = false, minHeight, children }: Props) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
    data,
  })

  const style = {
    minHeight,
    transform: CSS.Translate.toString(transform),
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="w-full min-w-0 touch-none"
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
    >
      {children({ isDragging })}
    </li>
  )
}

export default TimelineDraggableCard
