import { useState } from 'react'

type Props = {
  name: string
  label: string
  defaultValue?: number
}

const ScorePicker = ({ name, label, defaultValue }: Props) => {
  const [score, setScore] = useState(defaultValue ?? 3)

  return (
    <label style={{ display: 'grid', gridTemplateColumns: '100px 150px' }}>
      {label}: {score}
      <input
        name={name}
        type="range"
        min="0"
        max="5"
        step="1"
        value={score}
        onChange={(e) => setScore(Number(e.target.value))}
      />
    </label>
  )
}

export default ScorePicker
