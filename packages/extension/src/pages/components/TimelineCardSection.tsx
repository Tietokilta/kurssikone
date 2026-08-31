import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { plannedPeriodKeysEqual } from '../../utils/planPeriodDrag'
import {
  computeSemesterCoursePlacements,
  findConsecutiveLocatorSpanOnCard,
  formatPlannedPeriodForSlot,
  normalizeStudyLocator,
  plannedCreditsPerTimelineSlice,
  sortLocatorsByTimelineOrder,
  totalPlannedCreditsFromPlacements,
  type SemesterCoursePlacement,
  type StudyPeriodIndex,
  type TimelineCard,
  type TimelinePeriod,
} from '../../utils/parsePlannedPeriods'
import { isVariableCreditRange } from '../../utils/timelineVariableCredits'
import type { ClickPlacementTarget, ParsedCourseUnitSelection } from '../TimelinePage'
import {
  formatExtendToPeriod,
  formatKeepInPeriod,
  formatMoveAndExpandTo,
  formatMoveToPeriod,
  resolveTimelinePlacementLabel,
} from './timelineActionLabels'
import { IconExtendToPeriod, IconKeepInPeriod, IconMoveToPeriod, IconScheduleFor } from './TimelineIcons'
import TimelineDropTile from './TimelineDropTile'
import TimelineEditColumnStrip from './TimelineEditColumnStrip'
import TimelinePeriodCourseItem from './TimelinePeriodCourseItem'

function findEditModePlacementForColumn(
  placements: SemesterCoursePlacement<ParsedCourseUnitSelection>[],
  colIndex: number,
  isMoveModeActiveFor: (selectionIndex: number) => boolean
): SemesterCoursePlacement<ParsedCourseUnitSelection> | null {
  for (const pl of placements) {
    if (!isMoveModeActiveFor(pl.selection.selectionIndex)) {
      continue
    }
    if (colIndex >= pl.startCol && colIndex < pl.startCol + pl.span) {
      return pl
    }
  }
  return null
}

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

/**
 * When dragging a scheduled course, columns it already occupies:
 * - single-slot or first column of a multi-slot run → keep
 * - other columns in the run → move (re-anchor run to start here)
 */
function occupiedColumnDragOverlayKind(
  columnPlannedPeriod: string,
  periodIndex: StudyPeriodIndex | null,
  row: TimelineDragRowSnapshot
): 'none' | 'keep' | 'reanchor-move' {
  if (!periodIndex || !columnPlannedPeriod.trim()) {
    return 'none'
  }
  const inColumn = row.plannedPeriods.some((p) =>
    plannedPeriodKeysEqual(p, columnPlannedPeriod, row.courseUnitId, periodIndex)
  )
  if (!inColumn) {
    return 'none'
  }
  const run = row.movingRunPlannedPeriods
  if (!run?.length || run.length <= 1) {
    return 'keep'
  }
  const sorted = sortLocatorsByTimelineOrder(periodIndex, run)
  const first = sorted[0]
  if (first && plannedPeriodKeysEqual(columnPlannedPeriod, first, row.courseUnitId, periodIndex)) {
    return 'keep'
  }
  return 'reanchor-move'
}

/** `Move to {col}` vs `Move to start from {col}` for scheduled / click-scheduled placement UI. */
function longMoveToStartLabel(
  interactionKind: TimelineInteractionKind,
  dragRow: TimelineDragRowSnapshot | null,
  activePlacementSpanOnCard: number
): boolean {
  if (interactionKind === 'unscheduled' || interactionKind === 'click-unscheduled') {
    return false
  }
  const runLen = dragRow?.movingRunPlannedPeriods?.length ?? 0
  return runLen > 1 || activePlacementSpanOnCard > 1
}

function locatorSpansMatch(
  periodIndex: StudyPeriodIndex,
  a: string[],
  b: string[]
): boolean {
  if (!a.length || !b.length || a.length !== b.length) {
    return false
  }
  const sa = sortLocatorsByTimelineOrder(
    periodIndex,
    [...a].map((x) => x.trim()).filter(Boolean)
  )
  const sb = sortLocatorsByTimelineOrder(
    periodIndex,
    [...b].map((x) => x.trim()).filter(Boolean)
  )
  if (sa.length !== sb.length) {
    return false
  }
  return sa.every((x, i) => normalizeStudyLocator(x) === normalizeStudyLocator(sb[i]!))
}

function PeriodColumnDropOverlays({
  periodKey,
  plannedPeriod,
  periodDisplayName,
  interactionKind,
  periodIndex,
  dragRow,
  clickModeEnabled,
  onClickAction,
  singleClick,
  squeezeForDesignatedRow,
  useLongMoveLabel,
}: {
  periodKey: string
  plannedPeriod: string
  /** Semester + period column, e.g. `Spring 2025 — P3` (see {@link resolveTimelinePlacementLabel}). */
  periodDisplayName: string
  interactionKind: TimelineInteractionKind
  periodIndex: StudyPeriodIndex | null
  dragRow: TimelineDragRowSnapshot | null
  clickModeEnabled: boolean
  onClickAction: (action: 'move' | 'extend', plannedPeriod: string) => void
  singleClick: { action: 'move' | 'extend'; plannedPeriod: string } | null
  squeezeForDesignatedRow: boolean
  useLongMoveLabel: boolean
}) {
  if (interactionKind === 'none' || !plannedPeriod.trim()) {
    return null
  }
  if (dragRow && interactionKind !== 'unscheduled' && interactionKind !== 'click-unscheduled') {
    const occ = occupiedColumnDragOverlayKind(plannedPeriod, periodIndex, dragRow)
    if (occ === 'keep') {
      return (
        <div className="pointer-events-auto absolute inset-0 z-10 flex min-h-0">
          <TimelineDropTile
            id={`timeline-keep-${periodKey}`}
            action="keep"
            plannedPeriod={plannedPeriod}
            label={formatKeepInPeriod(periodDisplayName)}
            icon={<IconKeepInPeriod className="size-5 shrink-0 opacity-95" />}
            tone="keep"
          />
        </div>
      )
    }
    if (occ === 'reanchor-move') {
      return (
        <div className="pointer-events-auto absolute inset-0 z-10 flex min-h-0">
          <TimelineDropTile
            id={`timeline-reanchor-${periodKey}`}
            action="move"
            plannedPeriod={plannedPeriod}
            label={formatMoveToPeriod(periodDisplayName, useLongMoveLabel)}
            icon={<IconMoveToPeriod className="size-5 shrink-0 opacity-95" />}
            tone="move"
            onClick={clickModeEnabled ? () => onClickAction('move', plannedPeriod) : undefined}
            clickActive={
              clickModeEnabled &&
              singleClick?.action === 'move' &&
              singleClick.plannedPeriod === plannedPeriod
            }
          />
        </div>
      )
    }
  }
  const moveClickActive =
    clickModeEnabled && singleClick?.action === 'move' && singleClick.plannedPeriod === plannedPeriod
  if (interactionKind === 'unscheduled' || interactionKind === 'click-unscheduled') {
    if (squeezeForDesignatedRow) {
      return (
        <div className="pointer-events-auto relative z-10 flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
          <TimelineDropTile
            id={`timeline-move-${periodKey}`}
            action="move"
            plannedPeriod={plannedPeriod}
            label={formatMoveToPeriod(periodDisplayName, useLongMoveLabel)}
            icon={<IconMoveToPeriod className="size-5 shrink-0 opacity-95" />}
            tone="move"
            onClick={clickModeEnabled ? () => onClickAction('move', plannedPeriod) : undefined}
            clickActive={moveClickActive}
          />
        </div>
      )
    }
    return (
      <div className="pointer-events-auto absolute inset-0 z-10 flex min-h-20">
        <TimelineDropTile
          id={`timeline-move-${periodKey}`}
          action="move"
          plannedPeriod={plannedPeriod}
          label={formatMoveToPeriod(periodDisplayName, useLongMoveLabel)}
          icon={<IconMoveToPeriod className="size-5 shrink-0 opacity-95" />}
          tone="move"
          onClick={clickModeEnabled ? () => onClickAction('move', plannedPeriod) : undefined}
          clickActive={moveClickActive}
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
        label={formatMoveToPeriod(periodDisplayName, useLongMoveLabel)}
        icon={<IconMoveToPeriod className="size-5 shrink-0 opacity-95" />}
        tone="move"
        layout="half"
        onClick={clickModeEnabled ? () => onClickAction('move', plannedPeriod) : undefined}
        clickActive={
          clickModeEnabled &&
          singleClick?.action === 'move' &&
          singleClick.plannedPeriod === plannedPeriod
        }
      />
      <TimelineDropTile
        id={`timeline-extend-${periodKey}`}
        action="extend"
        plannedPeriod={plannedPeriod}
        label={formatExtendToPeriod(periodDisplayName)}
        icon={<IconExtendToPeriod className="size-5 shrink-0 opacity-95" />}
        tone="extend"
        layout="half"
        onClick={clickModeEnabled ? () => onClickAction('extend', plannedPeriod) : undefined}
        clickActive={
          clickModeEnabled &&
          singleClick?.action === 'extend' &&
          singleClick.plannedPeriod === plannedPeriod
        }
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

function columnPlannedPeriodsForPlacement(
  pl: SemesterCoursePlacement<ParsedCourseUnitSelection>,
  card: TimelineCard<ParsedCourseUnitSelection>,
  periodIndex: StudyPeriodIndex | null,
  sisuRootId: string
): string[] {
  const out: string[] = []
  for (let c = pl.startCol; c < pl.startCol + pl.span; c++) {
    const period = card.periods[c]
    if (period) {
      out.push(resolvePlannedPeriodForPeriod(card, period, periodIndex, sisuRootId))
    }
  }
  return out
}

type Props = {
  cards: TimelineCard<ParsedCourseUnitSelection>[]
  sisuRootId: string
  periodIndex: StudyPeriodIndex | null
  activeInteractionKind: TimelineInteractionKind
  /** Selection driving move/extend overlays; used to detect single- vs multi-period rows. */
  activeSelectionIndex: number | null
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
  clickPlacementTarget: ClickPlacementTarget | null
  activeUnscheduledSelection: ParsedCourseUnitSelection | null
  onQuickScheduleToSpan: (selectionIndex: number, locators: string[]) => void
  variableCreditOverrides: Record<string, number>
  onVariableCreditChange: (courseId: string, credits: number) => void
}

/** Single grid for the whole timeline so rows share one column track set (col-span, etc.). */
const TimelineMainGrid = ({
  cards,
  sisuRootId,
  periodIndex,
  activeInteractionKind,
  activeSelectionIndex,
  dragRowSnapshot,
  clickModeEnabled,
  onCardUnschedule,
  onCardMoveModeToggle,
  isMoveModeActiveFor,
  onClickPlacementAction,
  clickPlacementTarget,
  activeUnscheduledSelection,
  onQuickScheduleToSpan,
  variableCreditOverrides,
  onVariableCreditChange,
}: Props) => {
  const { t } = useTranslation()
  const maxPeriodCols = cards.length === 0 ? 1 : Math.max(1, ...cards.map((c) => c.periods.length))
  const singleClick =
    clickPlacementTarget?.kind === 'single' ? clickPlacementTarget : null

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
          const activePlacementSpanOnCard =
            activeSelectionIndex === null
              ? 1
              : placements.find((pl) => pl.selection.selectionIndex === activeSelectionIndex)?.span ??
                1
          const useLongMoveLabel = longMoveToStartLabel(
            activeInteractionKind,
            dragRowSnapshot,
            activePlacementSpanOnCard
          )
          const seasonCreditsTotal = totalPlannedCreditsFromPlacements(placements)
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
          const unscheduledPlacing =
            activeInteractionKind === 'unscheduled' ||
            activeInteractionKind === 'click-unscheduled'
          const designatedEntries =
            unscheduledPlacing && activeUnscheduledSelection && periodIndex
              ? activeUnscheduledSelection.teachingPeriodQuickOptions.flatMap((o) => {
                  const locs = o.plannedPeriodLocators?.filter(Boolean) ?? []
                  if (locs.length === 0) {
                    return []
                  }
                  const span = findConsecutiveLocatorSpanOnCard(
                    card,
                    locs,
                    periodIndex,
                    sisuRootId
                  )
                  if (!span) {
                    return []
                  }
                  const sortedLocators = sortLocatorsByTimelineOrder(
                    periodIndex,
                    locs.map((x) => x.trim()).filter(Boolean)
                  )
                  return [{ option: o, ...span, sortedLocators }]
                })
              : []
          const showDesignatedRow = designatedEntries.length > 0

          const overlayColumnCells = (
            <>
              {card.periods.map((p, colIndex) => {
                const resolved = resolvePlannedPeriodForPeriod(
                  card,
                  p,
                  periodIndex,
                  sisuRootId
                )
                const periodDisplayName = resolveTimelinePlacementLabel(
                  card.year,
                  card.season,
                  p.period,
                  resolved
                )
                const editPl = findEditModePlacementForColumn(
                  placements,
                  colIndex,
                  isMoveModeActiveFor
                )
                const overlayPointerEventsNone = columnsWithActiveEditCard.has(colIndex)
                const columnPeriodsForEdit = editPl
                  ? columnPlannedPeriodsForPlacement(editPl, card, periodIndex, sisuRootId)
                  : []
                return (
                  <div
                    key={p.periodKey}
                    className={`relative flex min-h-0 flex-col self-stretch ${
                      showDesignatedRow ? 'h-full min-h-14' : 'min-h-20 flex-1'
                    } ${
                      overlayPointerEventsNone ? 'pointer-events-none' : 'pointer-events-auto'
                    }`}
                  >
                    {editPl ? (
                      <div className="pointer-events-auto absolute inset-0 z-25 flex min-h-0 flex-col">
                        <TimelineEditColumnStrip
                          plannedPeriod={resolved}
                          periodDisplayName={periodDisplayName}
                          moveLabelLongForm={useLongMoveLabel}
                          isAnchorColumn={colIndex === editPl.startCol}
                          onRemove={(pp) =>
                            onCardUnschedule(editPl.selection.selectionIndex, pp)
                          }
                          onMoveToPeriod={
                            clickModeEnabled && activeInteractionKind === 'click-scheduled'
                              ? (pp) => onClickPlacementAction('move', pp)
                              : undefined
                          }
                          onExitEditMode={() =>
                            onCardMoveModeToggle(
                              editPl.selection.selectionIndex,
                              editPl.anchorPlannedPeriod,
                              card.cardKey,
                              columnPeriodsForEdit
                            )
                          }
                          variableCreditsEdit={
                            colIndex === editPl.startCol &&
                            isVariableCreditRange(
                              editPl.selection.creditsMin,
                              editPl.selection.creditsMax
                            )
                              ? {
                                  min: editPl.selection.creditsMin,
                                  max: editPl.selection.creditsMax,
                                  value: editPl.selection.plannedCredits,
                                  onChange: (credits) =>
                                    onVariableCreditChange(editPl.selection.id, credits),
                                  idSuffix: `${editPl.selection.id}-${p.periodKey}`,
                                }
                              : null
                          }
                        />
                      </div>
                    ) : (
                      <PeriodColumnDropOverlays
                        periodKey={p.periodKey}
                        plannedPeriod={resolved}
                        periodDisplayName={periodDisplayName}
                        interactionKind={activeInteractionKind}
                        periodIndex={periodIndex}
                        dragRow={dragRowSnapshot}
                        clickModeEnabled={clickModeEnabled}
                        onClickAction={onClickPlacementAction}
                        singleClick={singleClick}
                        squeezeForDesignatedRow={showDesignatedRow}
                        useLongMoveLabel={useLongMoveLabel}
                      />
                    )}
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
            </>
          )

          return (
            <Fragment key={card.cardKey}>
              <div className="col-span-full flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-sm font-medium text-neutral-900">
                  {t(`extension.season${card.season}`)} {card.year}
                </h2>
                <span
                  className="text-sm tabular-nums text-neutral-500"
                  aria-label={t('extension.plannedCreditsThisPeriod', { count: seasonCreditsTotal })}
                >
                  {seasonCreditsTotal % 1 === 0
                    ? seasonCreditsTotal
                    : seasonCreditsTotal.toFixed(1)}
                  {' '}{t('extension.credits')}
                </span>
              </div>
              {card.periods.map((p) => (
                <div key={p.periodKey} className="text-sm text-neutral-500">
                  {p.period === 'Summer' ? t('extension.seasonSummer') : p.period}
                </div>
              ))}
              {Array.from({ length: Math.max(0, maxPeriodCols - card.periods.length) }).map(
                (_, i) => (
                  <div key={`${card.cardKey}-label-pad-${i}`} className="min-w-0" aria-hidden />
                )
              )}
              <div className="relative col-span-full min-h-40">
                <div
                  className="relative z-0 grid grid-flow-dense items-stretch gap-y-2 gap-x-2"
                  style={{
                    gridTemplateColumns: `repeat(${maxPeriodCols}, minmax(0, 1fr))`,
                    gridAutoRows: 'minmax(20px, auto)',
                  }}
                >
                  {placements.map((pl) => {
                    const creditsPerPeriod = plannedCreditsPerTimelineSlice(pl.selection)
                    const rowSpan = Math.max(1, Math.round(creditsPerPeriod))
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
                          onToggleMoveMode={(selectionIndex, source, cardKey) =>
                            onCardMoveModeToggle(
                              selectionIndex,
                              source,
                              cardKey,
                              columnPlannedPeriods
                            )
                          }
                          isMoveModeActive={isMoveModeActive}
                          variableCreditOverrides={variableCreditOverrides}
                        />
                      </div>
                    )
                  })}
                </div>
                {activeInteractionKind !== 'none' ? (
                  <div
                    className={`pointer-events-none absolute inset-0 z-10 flex h-full min-h-0 flex-col ${
                      showDesignatedRow ? 'justify-start gap-0' : 'gap-y-1'
                    }`}
                  >
                    {showDesignatedRow && periodIndex && activeUnscheduledSelection ? (
                      <>
                        <div className="pointer-events-none flex min-h-0 min-w-0 flex-1 basis-0 flex-col">
                          <div
                            className="pointer-events-none grid h-full min-h-0 flex-1 gap-x-2"
                            style={{
                              gridTemplateColumns: `repeat(${maxPeriodCols}, minmax(0, 1fr))`,
                              gridTemplateRows: 'minmax(0, 1fr)',
                            }}
                          >
                            {overlayColumnCells}
                          </div>
                        </div>
                        <div className="pointer-events-auto flex min-h-0 min-w-0 flex-1 basis-0 flex-col gap-y-1">
                          {designatedEntries.map((entry, idx) => {
                            const primaryLocator = entry.sortedLocators[0] ?? ''
                            const moveToLabel = formatMoveAndExpandTo(entry.option.label)
                            const designatedClickActive =
                              clickPlacementTarget?.kind === 'designated' &&
                              locatorSpansMatch(
                                periodIndex,
                                clickPlacementTarget.spanLocators,
                                entry.sortedLocators
                              )
                            return (
                              <div
                                key={`${card.cardKey}-des-${idx}`}
                                className="grid min-h-0 min-w-0 flex-1 gap-x-2"
                                style={{
                                  gridTemplateColumns: `repeat(${maxPeriodCols}, minmax(0, 1fr))`,
                                  gridTemplateRows: 'minmax(0, 1fr)',
                                }}
                              >
                                <div
                                  className="flex h-full min-h-0 min-w-0"
                                  style={{
                                    gridColumn: `${entry.startCol + 1} / span ${entry.span}`,
                                  }}
                                >
                                  <TimelineDropTile
                                    id={`timeline-designated-${card.cardKey}-${idx}`}
                                    action="designated"
                                    plannedPeriod={primaryLocator}
                                    spanLocators={entry.sortedLocators}
                                    label={moveToLabel}
                                    ariaLabel={moveToLabel}
                                    icon={
                                      <IconScheduleFor className="size-5 shrink-0 opacity-95" />
                                    }
                                    tone="designated"
                                    onClick={
                                      clickModeEnabled
                                        ? () =>
                                            onQuickScheduleToSpan(
                                              activeUnscheduledSelection.selectionIndex,
                                              entry.sortedLocators
                                            )
                                        : undefined
                                    }
                                    clickActive={designatedClickActive}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    ) : (
                      <div
                        className="pointer-events-none grid min-h-0 flex-1 gap-x-2"
                        style={{
                          gridTemplateColumns: `repeat(${maxPeriodCols}, minmax(0, 1fr))`,
                        }}
                      >
                        {overlayColumnCells}
                      </div>
                    )}
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
