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
      className={
        isActive
          ? 'pointer-events-auto flex h-full w-full min-h-0 flex-col items-center justify-center rounded-none border-0 bg-neutral-500/35 text-white shadow-none transition-colors hover:bg-neutral-500/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80'
          : 'pointer-events-auto flex size-7 items-center justify-center rounded bg-timeline-move/90 text-white shadow hover:bg-timeline-move focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
      }
      aria-label={isActive ? 'Exit edit mode' : inactiveLabel}
      aria-pressed={isActive}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      {isActive ? (
        <IconCancelMove className="size-8 shrink-0 drop-shadow-sm" />
      ) : (
        <IconEdit className="size-4" />
      )}
    </button>
  )
}

export default TimelineMoveModeButton
