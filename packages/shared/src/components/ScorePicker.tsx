import { useState } from 'react'
import { getScoreLabel } from '../constants'

type Props = {
  name: string
  label: string
  defaultValue: number
  labels: readonly string[]
}

const ScorePicker = ({ name, label, defaultValue, labels }: Props) => {
  const [score, setScore] = useState(defaultValue)

  return (
    <label className="grid grid-cols-[120px_250px]">
      {label}: {score}
      <span className="relative">
        <input
          name={name}
          type="range"
          min="1"
          max="5"
          step="1"
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="w-full"
        />
        <span
          className="absolute -bottom-3.5 text-xs whitespace-nowrap"
          style={{
            left: `calc(8px + (100% - 16px) * ${(score - 1) / 4})`,
            transform: 'translateX(-50%)',
          }}
        >
          {getScoreLabel(labels, score)}
        </span>
      </span>
    </label>
  )
}

export default ScorePicker
