import { IconCancelMove, IconEdit } from './TimelineIcons'

type Props = {
  isActive: boolean
  onClick: () => void
  inactiveLabel?: string
}

const TimelineMoveModeButton = ({
  isActive,
  onClick,
  inactiveLabel = 'Enter edit mode',
}: Props) => {
  return (
    <button
      type="button"
      className={`pointer-events-auto flex size-7 items-center justify-center rounded text-white shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
        isActive
          ? 'bg-neutral-500 hover:bg-neutral-600'
          : 'bg-timeline-move/90 hover:bg-timeline-move'
      }`}
      aria-label={isActive ? 'Exit edit mode' : inactiveLabel}
      aria-pressed={isActive}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      {isActive ? <IconCancelMove className="size-4" /> : <IconEdit className="size-4" />}
    </button>
  )
}

export default TimelineMoveModeButton
