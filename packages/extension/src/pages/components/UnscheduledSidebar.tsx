import { creditChoiceIsUserSet, isVariableCreditRange } from '../../utils/timelineVariableCredits'
import type { ParsedCourseUnitSelection } from '../TimelinePage'
import TimelineCourseCard from './TimelineCourseCard'
import TimelineDraggableCard from './TimelineDraggableCard'
import TimelineMoveModeButton from './TimelineMoveModeButton'
import VariableCreditsEditPopup from './VariableCreditsEditPopup'

function UnscheduledCourseItem({
  selection: s,
  onToggleMoveMode,
  isMoveModeActive,
  variableCreditOverrides,
  onVariableCreditChange,
}: {
  selection: ParsedCourseUnitSelection
  onToggleMoveMode: (selectionIndex: number) => void
  isMoveModeActive: boolean
  variableCreditOverrides: Record<string, number>
  onVariableCreditChange: (courseId: string, credits: number) => void
}) {
  const creditUncertain =
    isVariableCreditRange(s.creditsMin, s.creditsMax) &&
    !creditChoiceIsUserSet(s.id, variableCreditOverrides)

  return (
    <TimelineDraggableCard
      id={`unscheduled-${s.selectionIndex}`}
      data={{ selectionIndex: s.selectionIndex, fromUnscheduled: true as const }}
    >
      {({ isDragging }) => (
        <div className={`relative flex min-w-0 gap-1 ${isDragging ? 'h-full opacity-0' : 'h-full'}`}>
          {isMoveModeActive && isVariableCreditRange(s.creditsMin, s.creditsMax) ? (
            <VariableCreditsEditPopup
              min={s.creditsMin}
              max={s.creditsMax}
              value={s.plannedCredits}
              onChange={(credits) => onVariableCreditChange(s.id, credits)}
              idSuffix={`unscheduled-${s.selectionIndex}`}
              className="absolute bottom-full left-0 right-0 z-30 mb-1"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <TimelineCourseCard
              name={s.name}
              courseCode={s.code}
              teachingPeriodLines={s.teachingPeriodLabels}
              plannedCredits={s.plannedCredits}
              creditsMin={s.creditsMin}
              creditsMax={s.creditsMax}
              variant="unscheduled"
              isDragging={isDragging}
              highlightActive={isMoveModeActive}
              creditUncertain={creditUncertain}
              onEditActivate={
                !isMoveModeActive ? () => onToggleMoveMode(s.selectionIndex) : undefined
              }
              actionButtonsLayout={isMoveModeActive ? 'cover' : 'corner'}
              actionButtons={
                isMoveModeActive ? (
                  <TimelineMoveModeButton
                    isActive
                    inactiveLabel="Enter edit mode to schedule"
                    onClick={() => onToggleMoveMode(s.selectionIndex)}
                  />
                ) : undefined
              }
            />
          </div>
        </div>
      )}
    </TimelineDraggableCard>
  )
}

type Props = {
  open: boolean
  setOpen: (value: boolean) => void
  selections: ParsedCourseUnitSelection[]
  onToggleMoveMode: (selectionIndex: number) => void
  isMoveModeActiveForUnscheduled: (selectionIndex: number) => boolean
  variableCreditOverrides: Record<string, number>
  onVariableCreditChange: (courseId: string, credits: number) => void
}

const UnscheduledSidebar = ({
  open,
  setOpen,
  selections,
  onToggleMoveMode,
  isMoveModeActiveForUnscheduled,
  variableCreditOverrides,
  onVariableCreditChange,
}: Props) => {
  if (selections.length === 0) {
    return null
  }

  return (
    <aside
      className={`fixed left-0 z-50 flex flex-col overflow-hidden bg-white shadow-lg transition-[width,top,transform,border-radius] duration-300 ease-out ${
        open
          ? 'top-0 h-dvh w-64 translate-y-0 rounded-none border-r border-neutral-200'
          : 'top-1/2 h-auto -translate-y-1/2 rounded-r-lg border border-neutral-200 border-l-0'
      }`}
    >
      {open ? (
        <div className="kurssikompassi-unscheduled-open flex min-h-0 min-w-64 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-1 border-b border-neutral-100 px-2 py-2">
            <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">
              Unscheduled
            </h2>
            <button
              type="button"
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded border border-neutral-200 bg-white text-base leading-none text-neutral-600 hover:bg-neutral-50"
              onClick={() => setOpen(false)}
              aria-expanded
              aria-controls="kurssikompassi-unscheduled-panel"
              aria-label="Collapse unscheduled courses panel"
            >
              <span aria-hidden>‹</span>
            </button>
          </div>
          <div
            id="kurssikompassi-unscheduled-panel"
            className="flex min-h-0 flex-1 flex-col px-3 pt-2 pb-3"
          >
            <p className="mb-2 shrink-0 text-xs text-neutral-500">
              Drag a course onto a period column.
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ul className="flex flex-col gap-1 text-sm">
                {selections.map((s) => (
                  <UnscheduledCourseItem
                    key={s.selectionIndex}
                    selection={s}
                    onToggleMoveMode={onToggleMoveMode}
                    isMoveModeActive={isMoveModeActiveForUnscheduled(s.selectionIndex)}
                    variableCreditOverrides={variableCreditOverrides}
                    onVariableCreditChange={onVariableCreditChange}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="bg-timeline-surface-muted hover:bg-timeline-surface flex w-full min-w-0 items-stretch overflow-hidden rounded-r-lg text-lg leading-none text-neutral-700"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls="kurssikompassi-unscheduled-panel"
          aria-label="Expand unscheduled courses panel"
        >
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 px-1 py-6">
            <span className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase [writing-mode:vertical-rl]">
              Unscheduled
            </span>
            <span className="bg-timeline-accent rounded-full px-2 py-0.5 text-xs font-medium text-white">
              {selections.length}
            </span>
          </div>
          <div className="flex w-6 shrink-0 items-center justify-center border-l border-neutral-100">
            <span aria-hidden>›</span>
          </div>
        </button>
      )}
    </aside>
  )
}

export default UnscheduledSidebar
