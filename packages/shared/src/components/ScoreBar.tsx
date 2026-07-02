const ScoreBar = ({ score, maxValue }: { score: number; maxValue: number }) => {
  const widthPercent = ((score - 1) / (maxValue - 1)) * 100

  return (
    <span className="inline-flex items-center mx-1.5 w-12 rounded-full h-3.5 bg-gray-300 overflow-hidden">
      <span
        className="inline-block h-3.5 bg-blue-600"
        style={{ width: `${widthPercent}%` }}
      />
    </span>
  )
}

export default ScoreBar
