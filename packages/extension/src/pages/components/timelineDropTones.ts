/** Shared Tailwind class groups for timeline drop tiles and edit-mode strip buttons. */
export type TimelineDropTone = 'move' | 'extend' | 'keep' | 'designated' | 'unschedule'

/** Tones used by {@link TimelineDropTile} (droppable). */
export type TimelineDroppableTone = Extract<TimelineDropTone, 'move' | 'extend' | 'keep' | 'designated'>

export type TimelineToneLayer = { base: string; active: string; hover: string }

export const TIMELINE_DROP_TONE_CLASSES: Record<TimelineDropTone, TimelineToneLayer> = {
  move: {
    base: 'bg-timeline-move/50 ring-0 ring-transparent',
    active:
      'bg-timeline-move/95 ring-4 ring-inset ring-white shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_28px_rgba(59,130,246,0.75)]',
    hover:
      'hover:bg-timeline-move/95 hover:ring-4 hover:ring-inset hover:ring-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_28px_rgba(59,130,246,0.75)]',
  },
  extend: {
    base: 'bg-timeline-extend/55 ring-0 ring-transparent',
    active:
      'bg-timeline-extend/95 ring-4 ring-inset ring-white shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_28px_rgba(16,185,129,0.75)]',
    hover:
      'hover:bg-timeline-extend/95 hover:ring-4 hover:ring-inset hover:ring-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_28px_rgba(16,185,129,0.75)]',
  },
  keep: {
    base: 'bg-timeline-keep/55 ring-0 ring-transparent',
    active:
      'bg-timeline-keep/95 ring-4 ring-inset ring-white shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_28px_rgba(100,116,139,0.75)]',
    hover:
      'hover:bg-timeline-keep/95 hover:ring-4 hover:ring-inset hover:ring-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_28px_rgba(100,116,139,0.75)]',
  },
  designated: {
    base: 'bg-timeline-extend/55 ring-0 ring-transparent',
    active:
      'bg-timeline-extend/95 ring-4 ring-inset ring-white shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_28px_rgba(16,185,129,0.75)]',
    hover:
      'hover:bg-timeline-extend/95 hover:ring-4 hover:ring-inset hover:ring-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_28px_rgba(16,185,129,0.75)]',
  },
  unschedule: {
    base: 'bg-timeline-unschedule/50 ring-0 ring-transparent',
    active:
      'bg-timeline-unschedule/95 ring-4 ring-inset ring-white shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_28px_rgba(220,38,38,0.55)]',
    hover:
      'hover:bg-timeline-unschedule/95 hover:ring-4 hover:ring-inset hover:ring-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_28px_rgba(220,38,38,0.55)]',
  },
}

/** Classes for drop tiles / strip buttons: base vs active, optional hover (when clickable). */
export function timelineToneButtonClasses(
  tone: TimelineDropTone,
  active: boolean,
  enableHover: boolean
): string {
  const layer = TIMELINE_DROP_TONE_CLASSES[tone]
  return `${active ? layer.active : layer.base} ${enableHover ? layer.hover : ''}`.trim()
}
