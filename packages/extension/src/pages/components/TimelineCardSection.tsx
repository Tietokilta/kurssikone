import { Fragment } from 'react'
import { plannedPeriodKeysEqual } from '../../utils/planPeriodDrag'
import {
  computeSemesterCoursePlacements,
  formatPlannedPeriodForSlot,
  plannedCreditsPerTimelineSlice,
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
  /** Slots moved together; drop targets on these columns stay available during the drag. */
  movingRunPlannedPeriods?: string[]
}

function slotInMovingRun(
  columnPlannedPeriod: string,
  movingRun: string[],
  courseUnitId: string,
  periodIndex: StudyPeriodIndex
): boolean {
  return movingRun.some((p) => plannedPeriodKeysEqual(p, columnPlannedPeriod, courseUnitId, periodIndex))
}

function columnAlreadyHasDraggedCourse(
  columnPlannedPeriod: string,
  periodIndex: StudyPeriodIndex | null,
  row: TimelineDragRowSnapshot
): boolean {
  if (!periodIndex || !columnPlannedPeriod.trim()) {
    return false
  }
  const inColumn = row.plannedPeriods.some((p) =>
    plannedPeriodKeysEqual(p, columnPlannedPeriod, row.courseUnitId, periodIndex)
  )
  if (!inColumn) {
    return false
  }
  const run = row.movingRunPlannedPeriods
  if (run?.length && slotInMovingRun(columnPlannedPeriod, run, row.courseUnitId, periodIndex)) {
    return false
  }
  return true
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

function resolvePlannedPeriodForPeriod(
  card: TimelineCard<ParsedCourseUnitSelection>,
  p: TimelinePeriod<ParsedCourseUnitSelection>,
  periodIndex: StudyPeriodIndex | null,
  sisuRootId: string
): string {
  return (
    p.plannedPeriod ||
    (periodIndex
      ? formatPlannedPeriodForSlot(sisuRootId, card.year, card.season, p.period, periodIndex)
      : '')
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
  onCardMoveModeToggle: (
    selectionIndex: number,
    sourcePlannedPeriod: string,
    cardKey: string,
    connectedPlannedPeriods: string[]
  ) => void
  isMoveModeActiveFor: (selectionIndex: number) => boolean
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
  const maxPeriodCols = cards.length === 0 ? 1 : Math.max(1, ...cards.map((c) => c.periods.length))

  return (
    <section className="rounded border border-neutral-200 bg-white p-3 shadow-sm">
      <div
        className="grid gap-x-4 gap-y-3"
        style={{
          gridTemplateColumns: `repeat(${maxPeriodCols}, minmax(0, 1fr))`,
        }}
      >
        {cards.map((card) => {
          const placements = computeSemesterCoursePlacements(card, sisuRootId, periodIndex)
          /** Columns where the period overlay must not steal clicks (so edit-mode scissors work). */
          const columnsWithActiveEditCard = new Set<number>()
          if (clickModeEnabled) {
            for (const pl of placements) {
              if (isMoveModeActiveFor(pl.selection.selectionIndex)) {
                for (let c = pl.startCol; c < pl.startCol + pl.span; c++) {
                  columnsWithActiveEditCard.add(c)
                }
              }
            }
          }
          return (
            <Fragment key={card.cardKey}>
              <h2 className="col-span-full text-sm font-medium text-neutral-900">
                {card.season} {card.year}
              </h2>
              {card.periods.map((p) => (
                <div key={p.periodKey} className="text-sm text-neutral-500">
                  {p.period}
                </div>
              ))}
              {Array.from({ length: Math.max(0, maxPeriodCols - card.periods.length) }).map(
                (_, i) => (
                  <div key={`${card.cardKey}-label-pad-${i}`} className="min-w-0" aria-hidden />
                )
              )}
              <div className="relative col-span-full min-h-8">
                <div
                  className="relative z-0 grid grid-flow-dense items-stretch gap-y-2 gap-x-2"
                  style={{
                    gridTemplateColumns: `repeat(${maxPeriodCols}, minmax(0, 1fr))`,
                    gridAutoRows: 'minmax(20px, auto)',
                  }}
                >
                  {placements.map((pl) => {
                    const credits = plannedCreditsPerTimelineSlice(pl.selection)
                    const rowSpan = Math.max(1, Math.round(credits))
                    const isMoveModeActive = isMoveModeActiveFor(pl.selection.selectionIndex)
                    const columnPlannedPeriods: string[] = []
                    for (let c = pl.startCol; c < pl.startCol + pl.span; c++) {
                      const period = card.periods[c]
                      if (period) {
                        columnPlannedPeriods.push(
                          resolvePlannedPeriodForPeriod(card, period, periodIndex, sisuRootId)
                        )
                      }
                    }
                    return (
                      <div
                        key={`${pl.selection.id}-${pl.startCol}-${pl.runIndex}`}
                        className={
                          isMoveModeActive
                            ? 'relative z-20 flex min-h-0 min-w-0 flex-col'
                            : 'flex min-h-0 min-w-0 flex-col'
                        }
                        style={{
                          gridColumn: `${pl.startCol + 1} / span ${pl.span}`,
                          gridRow: `span ${rowSpan}`,
                        }}
                      >
                        <TimelinePeriodCourseItem
                          selection={pl.selection}
                          periodKey={pl.anchorPeriodKey}
                          sourcePlannedPeriod={pl.anchorPlannedPeriod}
                          cardKey={card.cardKey}
                          columnPlannedPeriods={columnPlannedPeriods}
                          completed={pl.selection.completed}
                          onUnschedule={onCardUnschedule}
                          onToggleMoveMode={(selectionIndex, source, cardKey) =>
                            onCardMoveModeToggle(selectionIndex, source, cardKey, columnPlannedPeriods)
                          }
                          isMoveModeActive={isMoveModeActive}
                        />
                      </div>
                    )
                  })}
                </div>
                {activeInteractionKind !== 'none' ? (
                  <div
                    className="pointer-events-none absolute inset-0 z-10 grid gap-x-2"
                    style={{
                      gridTemplateColumns: `repeat(${maxPeriodCols}, minmax(0, 1fr))`,
                    }}
                  >
                    {card.periods.map((p, colIndex) => {
                      const resolved = resolvePlannedPeriodForPeriod(
                        card,
                        p,
                        periodIndex,
                        sisuRootId
                      )
                      const overlayPointerEventsNone = columnsWithActiveEditCard.has(colIndex)
                      return (
                        <div
                          key={p.periodKey}
                          className={`relative min-h-20 ${
                            overlayPointerEventsNone ? 'pointer-events-none' : 'pointer-events-auto'
                          }`}
                        >
                          <PeriodColumnDropOverlays
                            periodKey={p.periodKey}
                            plannedPeriod={resolved}
                            interactionKind={activeInteractionKind}
                            periodIndex={periodIndex}
                            dragRow={dragRowSnapshot}
                            clickModeEnabled={clickModeEnabled}
                            onClickAction={onClickPlacementAction}
                            clickTargetAction={
                              clickPlacementTarget?.plannedPeriod === resolved
                                ? clickPlacementTarget.action
                                : null
                            }
                          />
                        </div>
                      )
                    })}
                    {Array.from({
                      length: Math.max(0, maxPeriodCols - card.periods.length),
                    }).map((_, i) => (
                      <div
                        key={`${card.cardKey}-overlay-pad-${i}`}
                        className="min-w-0"
                        aria-hidden
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </Fragment>
          )
        })}
      </div>
    </section>
  )
}

export default TimelineMainGrid
