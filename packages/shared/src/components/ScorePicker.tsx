import { useState } from 'react'

type Props = {
  name: string
  label: string
  defaultValue: number
  minText: string
  maxText: string
}

const ScorePicker = ({ name, label, defaultValue, minText, maxText }: Props) => {
  const [score, setScore] = useState(defaultValue)

  return (
    <label className="grid grid-cols-[120px_250px]">
      {label}: {score}
      <span className="relative">
        <input
          name={name}
          type="range"
          min="0"
          max="5"
          step="1"
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="w-full"
        />
        <span className="absolute -bottom-3.5 left-0 text-xs -translate-x-[40%]">
          {minText}
        </span>
        <span className="absolute -bottom-3.5 right-0 text-xs translate-x-[40%]">
          {maxText}
        </span>
      </span>
    </label>
  )
}

export default ScorePicker
