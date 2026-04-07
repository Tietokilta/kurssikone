import type { ParsedCourseUnitSelection } from '../TimelinePage'
import TimelineCourseCard from './TimelineCourseCard'
import TimelineDraggableCard from './TimelineDraggableCard'

function UnscheduledCourseItem({ selection: s }: { selection: ParsedCourseUnitSelection }) {
  return (
    <TimelineDraggableCard
      id={`unscheduled-${s.selectionIndex}`}
      data={{ selectionIndex: s.selectionIndex, fromUnscheduled: true as const }}
    >
      {({ isDragging }) => (
        <div className={isDragging ? 'h-full opacity-0' : 'h-full'}>
          <TimelineCourseCard
            name={s.name}
            plannedCredits={s.plannedCredits}
            creditsMin={s.creditsMin}
            creditsMax={s.creditsMax}
            variant="unscheduled"
            isDragging={isDragging}
          />
        </div>
      )}
    </TimelineDraggableCard>
  )
}

type Props = {
  open: boolean
  setOpen: (value: boolean) => void
  selections: ParsedCourseUnitSelection[]
}

const UnscheduledSidebar = ({ open, setOpen, selections }: Props) => {
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
                  <UnscheduledCourseItem key={s.selectionIndex} selection={s} />
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
