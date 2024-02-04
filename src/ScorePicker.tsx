import { useState } from 'react'

type Props = {
  name: string
  label: string
  defaultValue?: number
  minText: string
  maxText: string
}

const ScorePicker = ({ name, label, defaultValue, minText, maxText }: Props) => {
  const [score, setScore] = useState(defaultValue ?? 3)

  return (
    <label style={{ display: 'grid', gridTemplateColumns: '120px 250px' }}>
      {label}: {score}
      <span style={{ position: 'relative' }}>
        <input
          name={name}
          type="range"
          min="0"
          max="5"
          step="1"
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <span
          style={{
            position: 'absolute',
            bottom: -14,
            left: 0,
            fontSize: 12,
            textTransform: 'none',
            translate: '-40%',
          }}
        >
          {minText}
        </span>
        <span
          style={{
            position: 'absolute',
            bottom: -14,
            right: 0,
            fontSize: 12,
            textTransform: 'none',
            translate: '40%',
          }}
        >
          {maxText}
        </span>
      </span>
    </label>
  )
}

export default ScorePicker
