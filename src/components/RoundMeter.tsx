import { useEffect, useRef } from 'react'

const cSize = 170
const cSizeHalf = cSize / 2

type Props = {
  title: string
  value: number
  minText: string
  maxText: string
}

const RoundMeter = ({ title, value, minText, maxText }: Props) => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current as unknown as HTMLCanvasElement | null
    if (!canvas) return

    const c: CanvasRenderingContext2D | null = canvas.getContext('2d')
    if (!c) return

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
  }, [value])

  return (
    <div style={{ position: 'relative', width: 'fit-content' }}>
      <span
        style={{
          position: 'absolute',
          textAlign: 'center',
          fontSize: '1.3rem',
          display: 'block',
          width: '100%',
          height: 20,
          bottom: 113,
          color: '#FFFFFF',
        }}
      >
        {title}
      </span>
      <span
        style={{
          position: 'absolute',
          textAlign: 'center',
          width: '100%',
          bottom: 70,
          fontSize: 55,
          fontWeight: 300,
          color: '#FFFFFF',
        }}
      >
        {value.toFixed(1)}
      </span>
      <canvas
        ref={canvasRef}
        width={cSize}
        height={cSize}
        style={{ backgroundColor: '#00103070', borderRadius: '50%' }}
      />
      <span
        style={{
          position: 'absolute',
          textAlign: 'center',
          width: '100%',
          bottom: -20,
          display: 'flex',
          justifyContent: 'center',
          gap: 5,
        }}
      >
        <span style={{ width: '75px' }}>{minText}</span>
        <span>-</span>
        <span style={{ width: '75px' }}>{maxText}</span>
      </span>
    </div>
  )
}

export default RoundMeter
