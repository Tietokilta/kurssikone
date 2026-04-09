type Props = {
  showPastPeriods: boolean
  setShowPastPeriods: (value: boolean) => void
  showEmptySummerPeriods: boolean
  setShowEmptySummerPeriods: (value: boolean) => void
}

const TimelineToolbar = ({
  showPastPeriods,
  setShowPastPeriods,
  showEmptySummerPeriods,
  setShowEmptySummerPeriods,
}: Props) => {
  return (
    <div className="flex shrink-0 flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-700">
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
  )
}

export default TimelineToolbar
