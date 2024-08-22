import { useEffect, useRef } from 'react'

const cSize = 170
const cSizeHalf = cSize / 2

type Props = {
  title: string
  value: number
}

const RoundMeter = ({ title, value }: Props) => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // @ts-ignore
    const c: CanvasRenderingContext2D = canvas.getContext('2d')
    c.clearRect(0, 0, cSize, cSize)

    c.beginPath()
    const rad = Math.PI / 180
    c.lineCap = 'round'
    const startLength = -240
    const maxLength = 300
    const radius = 70

    // Draw the background circle
    c.arc(cSizeHalf, cSizeHalf, radius, rad * startLength, rad * (startLength + maxLength))
    c.strokeStyle = '#4D647D'
    c.lineWidth = 12
    c.stroke()

    // Draw the progress circle
    c.beginPath()
    const maxValue = 5
    const percent = value / maxValue
    const progress = maxLength * percent
    c.arc(cSizeHalf, cSizeHalf, radius, rad * startLength, rad * (startLength + progress))
    c.strokeStyle = '#FFFFFF'
    c.lineWidth = 14
    c.stroke()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ position: 'relative', width: 'fit-content' }}>
      <span className="points-title" style={{ position: 'absolute' }}>
        {title}
      </span>
      <span className="points-value">{value.toFixed(1)}</span>
      <canvas
        ref={canvasRef}
        width={cSize}
        height={cSize}
        style={{ backgroundColor: '#00103070', borderRadius: '50%' }}
      />
    </div>
  )
}

export default RoundMeter
