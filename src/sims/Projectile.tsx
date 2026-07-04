import { useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

interface Ball {
  x: number // m
  y: number // m (지면 기준 높이)
  vx: number
  vy: number
  trail: { x: number; y: number }[]
  landed: boolean
  color: string
}

const COLORS = ['#5b8cff', '#ffb454', '#4ade80', '#f472b6', '#22d3ee']
const SCALE = 6.5 // px per meter
const ORIGIN_X = 56

export default function Projectile() {
  const [angle, setAngle] = useState(45)
  const [speed, setSpeed] = useState(30)
  const [g, setG] = useState(9.8)

  const ballsRef = useRef<Ball[]>([])
  const colorIdx = useRef(0)
  const paramsRef = useRef({ angle, speed, g })
  paramsRef.current = { angle, speed, g }

  const rad = (angle * Math.PI) / 180
  const range = (speed * speed * Math.sin(2 * rad)) / g
  const maxH = (speed * Math.sin(rad)) ** 2 / (2 * g)
  const flightT = (2 * speed * Math.sin(rad)) / g

  const fire = () => {
    const p = paramsRef.current
    const r = (p.angle * Math.PI) / 180
    ballsRef.current.push({
      x: 0,
      y: 0,
      vx: p.speed * Math.cos(r),
      vy: p.speed * Math.sin(r),
      trail: [],
      landed: false,
      color: COLORS[colorIdx.current++ % COLORS.length],
    })
    if (ballsRef.current.length > 6) ballsRef.current.shift()
  }

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const p = paramsRef.current
    const groundY = h - 44
    const toX = (m: number) => ORIGIN_X + m * SCALE
    const toY = (m: number) => groundY - m * SCALE

    for (const b of ballsRef.current) {
      if (b.landed) continue
      b.vy -= p.g * dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.trail.push({ x: b.x, y: b.y })
      if (b.y <= 0 && b.vy < 0) {
        b.y = 0
        b.landed = true
      }
    }

    ctx.clearRect(0, 0, w, h)

    // 지면과 거리 눈금
    ctx.strokeStyle = '#2a3355'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, groundY)
    ctx.lineTo(w, groundY)
    ctx.stroke()
    ctx.fillStyle = '#93a0c4'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    for (let m = 0; toX(m) < w - 20; m += 20) {
      ctx.fillRect(toX(m) - 0.5, groundY, 1, 6)
      ctx.fillText(`${m}m`, toX(m), groundY + 22)
    }

    // 현재 슬라이더 값 기준 예상 궤적 (점선)
    const r = (p.angle * Math.PI) / 180
    const vT = (2 * p.speed * Math.sin(r)) / p.g
    ctx.strokeStyle = 'rgba(147,160,196,0.5)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    for (let i = 0; i <= 60; i++) {
      const t = (vT * i) / 60
      const x = p.speed * Math.cos(r) * t
      const y = p.speed * Math.sin(r) * t - 0.5 * p.g * t * t
      if (i === 0) ctx.moveTo(toX(x), toY(y))
      else ctx.lineTo(toX(x), toY(y))
    }
    ctx.stroke()
    ctx.setLineDash([])

    // 궤적과 공
    for (const b of ballsRef.current) {
      ctx.strokeStyle = b.color
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.55
      ctx.beginPath()
      b.trail.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(toX(pt.x), toY(pt.y))
        else ctx.lineTo(toX(pt.x), toY(pt.y))
      })
      ctx.stroke()
      ctx.globalAlpha = 1

      ctx.fillStyle = b.color
      ctx.beginPath()
      ctx.arc(toX(b.x), toY(b.y), 7, 0, Math.PI * 2)
      ctx.fill()

      if (b.landed) {
        ctx.fillStyle = '#93a0c4'
        ctx.font = 'bold 11px sans-serif'
        ctx.fillText(`${b.x.toFixed(1)}m`, toX(b.x), toY(0) - 14)
      }
    }

    // 발사대
    ctx.save()
    ctx.translate(ORIGIN_X, groundY)
    ctx.rotate(-r)
    ctx.fillStyle = '#5b8cff'
    ctx.fillRect(0, -5, 34, 10)
    ctx.restore()
    ctx.fillStyle = '#2a3355'
    ctx.beginPath()
    ctx.arc(ORIGIN_X, groundY, 10, Math.PI, 0)
    ctx.fill()
  })

  return (
    <div className="sim-page">
      <h2>🚀 포물선 운동</h2>
      <p className="law">
        공중에 던져진 물체는 수평으로는 <b>등속</b>, 수직으로는 중력에 의한 <b>등가속</b> 운동을
        합니다. 두 운동이 합쳐져 포물선이 그려지고, 사거리는 <b>45°</b>에서 가장 깁니다. 각도를
        30°와 60°로 쏴서 비교해 보세요 — 사거리가 같습니다!
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider name="발사 각도" unit="°" min={5} max={85} value={angle} onChange={setAngle} />
        <Slider name="초기 속도" unit="m/s" min={5} max={45} value={speed} onChange={setSpeed} />
        <Slider
          name="중력 가속도"
          unit="m/s²"
          min={1.6}
          max={25}
          step={0.1}
          value={g}
          onChange={setG}
          format={(v) => v.toFixed(1)}
        />
        <button className="btn" onClick={fire}>
          발사!
        </button>
        <button className="btn secondary" onClick={() => (ballsRef.current = [])}>
          지우기
        </button>
      </div>
      <div className="readouts">
        <Readout label="예상 사거리 R = v²sin2θ/g" value={range.toFixed(1)} unit="m" />
        <Readout label="최고 높이 H = v²sin²θ/2g" value={maxH.toFixed(1)} unit="m" />
        <Readout label="체공 시간 T = 2v·sinθ/g" value={flightT.toFixed(2)} unit="s" />
      </div>
      <p className="hint">💡 중력을 1.6 m/s²(달)로 낮추면 같은 속도로도 훨씬 멀리 날아갑니다.</p>
    </div>
  )
}
