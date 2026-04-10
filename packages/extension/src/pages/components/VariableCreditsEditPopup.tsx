type Props = {
  min: number
  max: number
  value: number
  onChange: (credits: number) => void
  idSuffix: string
  className?: string
}

const VariableCreditsEditPopup = ({
  min,
  max,
  value,
  onChange,
  idSuffix,
  className = '',
}: Props) => {
  const id = `timeline-credits-${idSuffix}`
  const safeValue = Math.min(max, Math.max(min, Math.round(value)))

  return (
    <div
      data-timeline-credits-popup
      className={`pointer-events-auto z-30 rounded border border-neutral-200 bg-white px-2 py-1.5 shadow-md ${className}`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <label htmlFor={id} className="mb-1 block text-[10px] font-medium text-neutral-700">
        Your planned credits ({min}–{max})
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={safeValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-timeline-accent"
      />
      <div className="text-center text-[10px] tabular-nums text-neutral-600">{safeValue} cr</div>
    </div>
  )
}

export default VariableCreditsEditPopup
