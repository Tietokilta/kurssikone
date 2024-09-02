const ScoreBar = ({ score, maxValue }: { score: number; maxValue: number }) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: 6,
        marginRight: 6,
        width: 50,
        borderRadius: 10,
        height: 14,
        background: '#CCCCCC',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: `${(score / maxValue) * 100}%`,
          height: 14,
          background: '#1076db',
        }}
      ></span>
    </span>
  )
}

export default ScoreBar
