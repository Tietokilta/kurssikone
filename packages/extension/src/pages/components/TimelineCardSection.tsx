import { Fragment } from 'react'
import { plannedPeriodKeysEqual } from '../../utils/planPeriodDrag'
import {
  formatPlannedPeriodForSlot,
  type StudyPeriodIndex,
  type TimelineCard,
  type TimelinePeriod,
} from '../../utils/parsePlannedPeriods'
import type { ParsedCourseUnitSelection } from '../TimelinePage'
import { IconExtendToPeriod, IconMoveToPeriod } from './TimelineIcons'
import TimelineDropTile from './TimelineDropTile'
import TimelinePeriodCourseItem from './TimelinePeriodCourseItem'

export type TimelineInteractionKind =
  | 'none'
  | 'scheduled'
  | 'unscheduled'
  | 'click-scheduled'
  | 'click-unscheduled'

export type TimelineDragRowSnapshot = {
  courseUnitId: string
  plannedPeriods: string[]
}

function columnAlreadyHasDraggedCourse(
  columnPlannedPeriod: string,
  periodIndex: StudyPeriodIndex | null,
  row: TimelineDragRowSnapshot
): boolean {
  if (!periodIndex || !columnPlannedPeriod.trim()) {
    return false
  }
  return row.plannedPeriods.some((p) =>
    plannedPeriodKeysEqual(p, columnPlannedPeriod, row.courseUnitId, periodIndex)
  )
}

function PeriodColumnDropOverlays({
  periodKey,
  plannedPeriod,
  interactionKind,
  periodIndex,
  dragRow,
  clickModeEnabled,
  onClickAction,
  clickTargetAction,
}: {
  periodKey: string
  plannedPeriod: string
  interactionKind: TimelineInteractionKind
  periodIndex: StudyPeriodIndex | null
  dragRow: TimelineDragRowSnapshot | null
  clickModeEnabled: boolean
  onClickAction: (action: 'move' | 'extend', plannedPeriod: string) => void
  clickTargetAction: 'move' | 'extend' | null
}) {
  if (interactionKind === 'none' || !plannedPeriod.trim()) {
    return null
  }
  if (dragRow && columnAlreadyHasDraggedCourse(plannedPeriod, periodIndex, dragRow)) {
    return null
  }
  if (interactionKind === 'unscheduled' || interactionKind === 'click-unscheduled') {
    return (
      <div className="pointer-events-auto absolute inset-0 z-10 flex min-h-20">
        <TimelineDropTile
          id={`timeline-move-${periodKey}`}
          action="move"
          plannedPeriod={plannedPeriod}
          label="Move to period"
          icon={<IconMoveToPeriod className="size-5 shrink-0 opacity-95" />}
          tone="move"
          onClick={clickModeEnabled ? () => onClickAction('move', plannedPeriod) : undefined}
          clickActive={clickModeEnabled && clickTargetAction === 'move'}
        />
      </div>
    )
  }
  return (
    <div className="pointer-events-auto absolute inset-0 z-10 flex min-h-24 flex-col">
      <TimelineDropTile
        id={`timeline-move-${periodKey}`}
        action="move"
        plannedPeriod={plannedPeriod}
        label="Move to period"
        icon={<IconMoveToPeriod className="size-5 shrink-0 opacity-95" />}
        tone="move"
        layout="half"
        onClick={clickModeEnabled ? () => onClickAction('move', plannedPeriod) : undefined}
        clickActive={clickModeEnabled && clickTargetAction === 'move'}
      />
      <TimelineDropTile
        id={`timeline-extend-${periodKey}`}
        action="extend"
        plannedPeriod={plannedPeriod}
        label="Extend to period"
        icon={<IconExtendToPeriod className="size-5 shrink-0 opacity-95" />}
        tone="extend"
        layout="half"
        onClick={clickModeEnabled ? () => onClickAction('extend', plannedPeriod) : undefined}
        clickActive={clickModeEnabled && clickTargetAction === 'extend'}
      />
    </div>
  )
}

function TimelinePeriodColumn({
  card,
  period: p,
  sisuRootId,
  periodIndex,
  activeInteractionKind,
  dragRowSnapshot,
  clickModeEnabled,
  onCardUnschedule,
  onCardMoveModeToggle,
  isMoveModeActiveFor,
  onClickPlacementAction,
  clickPlacementTarget,
}: {
  card: TimelineCard<ParsedCourseUnitSelection>
  period: TimelinePeriod<ParsedCourseUnitSelection>
  sisuRootId: string
  periodIndex: StudyPeriodIndex | null
  activeInteractionKind: TimelineInteractionKind
  dragRowSnapshot: TimelineDragRowSnapshot | null
  clickModeEnabled: boolean
  onCardUnschedule: (selectionIndex: number, sourcePlannedPeriod: string) => void
  onCardMoveModeToggle: (selectionIndex: number, sourcePlannedPeriod: string) => void
  isMoveModeActiveFor: (selectionIndex: number, sourcePlannedPeriod: string) => boolean
  onClickPlacementAction: (action: 'move' | 'extend', plannedPeriod: string) => void
  clickPlacementTarget: { action: 'move' | 'extend'; plannedPeriod: string } | null
}) {
  const resolvedPlannedPeriod =
    p.plannedPeriod ||
    (periodIndex
      ? formatPlannedPeriodForSlot(sisuRootId, card.year, card.season, p.period, periodIndex)
      : '')

  return (
    <div className="flex min-w-0 flex-col gap-3 text-sm">
      <span className="w-14 shrink-0 text-neutral-500">{p.period}</span>

      <div className="relative min-h-8 min-w-0 flex-1 text-neutral-800">
        {p.selections.length === 0 ? (
          <span className="text-neutral-400">-</span>
        ) : (
          <ul className="flex flex-col gap-1">
            {p.selections.map((s) => (
              <TimelinePeriodCourseItem
                key={`${s.id}-${p.periodKey}-${s.completed ? 'c' : 'p'}`}
                selection={s}
                periodKey={p.periodKey}
                sourcePlannedPeriod={resolvedPlannedPeriod}
                completed={s.completed}
                onUnschedule={onCardUnschedule}
                onToggleMoveMode={onCardMoveModeToggle}
                isMoveModeActive={isMoveModeActiveFor(s.selectionIndex, resolvedPlannedPeriod)}
              />
            ))}
          </ul>
        )}
        <PeriodColumnDropOverlays
          periodKey={p.periodKey}
          plannedPeriod={resolvedPlannedPeriod}
          interactionKind={activeInteractionKind}
          periodIndex={periodIndex}
          dragRow={dragRowSnapshot}
          clickModeEnabled={clickModeEnabled}
          onClickAction={onClickPlacementAction}
          clickTargetAction={
            clickPlacementTarget?.plannedPeriod === resolvedPlannedPeriod
              ? clickPlacementTarget.action
              : null
          }
        />
      </div>
    </div>
  )
}

type Props = {
  cards: TimelineCard<ParsedCourseUnitSelection>[]
  sisuRootId: string
  periodIndex: StudyPeriodIndex | null
  activeInteractionKind: TimelineInteractionKind
  dragRowSnapshot: TimelineDragRowSnapshot | null
  clickModeEnabled: boolean
  onCardUnschedule: (selectionIndex: number, sourcePlannedPeriod: string) => void
  onCardMoveModeToggle: (selectionIndex: number, sourcePlannedPeriod: string) => void
  isMoveModeActiveFor: (selectionIndex: number, sourcePlannedPeriod: string) => boolean
  onClickPlacementAction: (action: 'move' | 'extend', plannedPeriod: string) => void
  clickPlacementTarget: { action: 'move' | 'extend'; plannedPeriod: string } | null
}

/** Single grid for the whole timeline so rows share one column track set (col-span, etc.). */
const TimelineMainGrid = ({
  cards,
  sisuRootId,
  periodIndex,
  activeInteractionKind,
  dragRowSnapshot,
  clickModeEnabled,
  onCardUnschedule,
  onCardMoveModeToggle,
  isMoveModeActiveFor,
  onClickPlacementAction,
  clickPlacementTarget,
}: Props) => {
  const maxPeriodCols =
    cards.length === 0 ? 1 : Math.max(1, ...cards.map((c) => c.periods.length))

  return (
    <section className="rounded border border-neutral-200 bg-white p-3 shadow-sm">
      <div
        className="grid gap-x-4 gap-y-3"
        style={{
          gridTemplateColumns: `repeat(${maxPeriodCols}, minmax(0, 1fr))`,
        }}
      >
        {cards.map((card) => (
          <Fragment key={card.cardKey}>
            <h2 className="col-span-full text-sm font-medium text-neutral-900">
              {card.season} {card.year}
            </h2>
            {card.periods.map((p) => (
              <TimelinePeriodColumn
                key={p.periodKey}
                card={card}
                period={p}
                sisuRootId={sisuRootId}
                periodIndex={periodIndex}
                activeInteractionKind={activeInteractionKind}
                dragRowSnapshot={dragRowSnapshot}
                clickModeEnabled={clickModeEnabled}
                onCardUnschedule={onCardUnschedule}
                onCardMoveModeToggle={onCardMoveModeToggle}
                isMoveModeActiveFor={isMoveModeActiveFor}
                onClickPlacementAction={onClickPlacementAction}
                clickPlacementTarget={clickPlacementTarget}
              />
            ))}
            {Array.from({ length: Math.max(0, maxPeriodCols - card.periods.length) }).map(
              (_, i) => (
                <div
                  key={`${card.cardKey}-pad-${i}`}
                  className="min-w-0"
                  aria-hidden
                />
              )
            )}
          </Fragment>
        ))}
      </div>
    </section>
  )
}

export default TimelineMainGrid
