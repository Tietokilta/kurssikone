import { getScoreLabel } from '../constants'

type Props = {
  title: string
  value: number
  labels: readonly string[]
}

const ScoreDisplay = ({ title, value, labels }: Props) => {
  return (
    <div className="flex flex-col items-center px-4 py-3 mb-4">
      <span className="text-lg text-gray-700">{title}</span>
      <span className="text-5xl font-light text-black my-1">
        {value ? value.toFixed(1) : '-'}
      </span>
      <span className="text-sm text-gray-500">
        {value ? getScoreLabel(labels, value) : ''}
      </span>
    </div>
  )
}

export default ScoreDisplay
