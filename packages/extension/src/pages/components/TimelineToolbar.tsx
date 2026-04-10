function formatCreditAmount(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

type Props = {
  creditSummary: { completed: number; planned: number; total: number }
  showPastPeriods: boolean
  setShowPastPeriods: (value: boolean) => void
  showEmptySummerPeriods: boolean
  setShowEmptySummerPeriods: (value: boolean) => void
}

const TimelineToolbar = ({
  creditSummary,
  showPastPeriods,
  setShowPastPeriods,
  showEmptySummerPeriods,
  setShowEmptySummerPeriods,
}: Props) => {
  return (
    <div className="space-y-2 text-sm text-neutral-700">
      <div className="grid max-w-sm grid-cols-[1fr_auto] gap-x-4 gap-y-1 tabular-nums">
        <span>Completed credits</span>
        <span className="text-right">{formatCreditAmount(creditSummary.completed)}</span>
        <span>Planned credits</span>
        <span className="text-right">{formatCreditAmount(creditSummary.planned)}</span>
        <span className="font-medium text-neutral-900">Total credits</span>
        <span className="text-right font-medium text-neutral-900">
          {formatCreditAmount(creditSummary.total)}
        </span>
      </div>
      <div className="flex shrink-0 flex-wrap gap-x-6 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="size-4 rounded border-neutral-300"
            checked={showPastPeriods}
            onChange={(e) => setShowPastPeriods(e.target.checked)}
          />
          Show past periods
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="size-4 rounded border-neutral-300"
            checked={showEmptySummerPeriods}
            onChange={(e) => setShowEmptySummerPeriods(e.target.checked)}
          />
          Show empty summer periods
        </label>
      </div>
    </div>
  )
}

export default TimelineToolbar
