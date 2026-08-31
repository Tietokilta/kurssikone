import { useTranslation } from 'react-i18next'
import { TIMELINE_MOVE_CHROME_CLASSES } from './timelineDropTones'
import { IconCancelMove, IconEdit } from './TimelineIcons'

type Props = {
  isActive: boolean
  onClick: () => void
  inactiveLabel?: string
}

const TimelineMoveModeButton = ({
  isActive,
  onClick,
  inactiveLabel,
}: Props) => {
  const { t } = useTranslation()
  const resolvedInactiveLabel = inactiveLabel ?? t('extension.enterEditMode')
  return (
    <button
      type="button"
      className={
        isActive
          ? 'pointer-events-auto flex h-full w-full min-h-0 flex-col items-center justify-center rounded-none border-0 bg-neutral-500/35 text-white shadow-none transition-colors hover:bg-neutral-500/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80'
          : TIMELINE_MOVE_CHROME_CLASSES.moveModeButtonInactive
      }
      aria-label={isActive ? t('extension.exitEditMode') : resolvedInactiveLabel}
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
