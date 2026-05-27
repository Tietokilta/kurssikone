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

    c.arc(cSizeHalf, cSizeHalf, radius, rad * startLength, rad * (startLength + maxLength))
    c.strokeStyle = '#4D647D'
    c.lineWidth = 12
    c.stroke()

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
    <div className="relative w-fit mb-4">
      <span className="absolute text-center text-xl block w-full h-5 bottom-[113px] text-white">
        {title}
      </span>
      <span className="absolute text-center w-full bottom-[30px] text-[55px] font-light text-white">
        {value.toFixed(1)}
      </span>
      <canvas
        ref={canvasRef}
        width={cSize}
        height={cSize}
        className="bg-[#00103070] rounded-full"
      />

      <span className="absolute text-center w-full flex justify-center gap-1.5">
        <span className="w-[75px]">{minText}</span>
        <span>-</span>
        <span className="w-[75px]">{maxText}</span>
      </span>
    </div>
  )
}

export default RoundMeter
