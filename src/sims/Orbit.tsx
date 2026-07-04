import { useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const R0 = 170 // 행성 초기 거리 (px)
const STAR_R = 16

interface Planet {
  x: number
  y: number
  vx: number
  vy: number
  trail: { x: number; y: number; speed: number }[]
  crashed: boolean
}

export default function Orbit() {
  const [gm, setGm] = useState(6_000_000) // 중력 상수 × 별 질량
  const [speedFactor, setSpeedFactor] = useState(1) // 원 궤도 속도의 배수
  const [live, setLive] = useState({ speed: 0, dist: 0 })

  const vCirc = Math.sqrt(gm / R0)
  const planetRef = useRef<Planet | null>(null)
  const gmRef = useRef(gm)
  gmRef.current = gm
  const liveRef = useRef(live)
  liveRef.current = live

  const launch = (factor: number, currentGm: number) => {
    planetRef.current = {
      x: R0,
      y: 0,
      vx: 0,
      vy: -Math.sqrt(currentGm / R0) * factor,
      trail: [],
      crashed: false,
    }
  }

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const cx = w / 2
    const cy = h / 2
    const p = planetRef.current
    const G = gmRef.current

    if (p && !p.crashed) {
      // velocity Verlet — 궤도가 오래 돌아도 에너지가 잘 유지된다
      const steps = 16
      const sub = dt / steps
      const accel = (x: number, y: number) => {
        const r2 = x * x + y * y
        const r = Math.sqrt(r2)
        const a = -G / r2
        return { ax: (a * x) / r, ay: (a * y) / r }
      }
      for (let i = 0; i < steps; i++) {
        const a1 = accel(p.x, p.y)
        p.x += p.vx * sub + 0.5 * a1.ax * sub * sub
        p.y += p.vy * sub + 0.5 * a1.ay * sub * sub
        const a2 = accel(p.x, p.y)
        p.vx += 0.5 * (a1.ax + a2.ax) * sub
        p.vy += 0.5 * (a1.ay + a2.ay) * sub
        if (Math.hypot(p.x, p.y) < STAR_R + 6) {
          p.crashed = true
          break
        }
      }
      const speed = Math.hypot(p.vx, p.vy)
      p.trail.push({ x: p.x, y: p.y, speed })
      if (p.trail.length > 1200) p.trail.shift()

      const dist = Math.hypot(p.x, p.y)
      const prev = liveRef.current
      if (Math.abs(prev.speed - speed) > 0.5 || Math.abs(prev.dist - dist) > 2) {
        setLive({ speed, dist })
      }
    }

    ctx.clearRect(0, 0, w, h)

    // 원 궤도 기준선
    ctx.strokeStyle = 'rgba(147,160,196,0.2)'
    ctx.setLineDash([4, 8])
    ctx.beginPath()
    ctx.arc(cx, cy, R0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // 별
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, STAR_R * 2.4)
    grad.addColorStop(0, '#fff3c4')
    grad.addColorStop(0.4, '#ffb454')
    grad.addColorStop(1, 'rgba(255,180,84,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, STAR_R * 2.4, 0, Math.PI * 2)
    ctx.fill()

    if (p) {
      // 속도에 따라 색이 변하는 궤적: 별에 가까울수록 빠르고 붉다 (케플러 제2법칙)
      const vRef = Math.sqrt(G / R0)
      for (let i = 1; i < p.trail.length; i++) {
        const t0 = p.trail[i - 1]
        const t1 = p.trail[i]
        const ratio = Math.min(t1.speed / (vRef * 1.6), 1)
        const hue = 210 - ratio * 190 // 파랑(느림) → 빨강(빠름)
        ctx.strokeStyle = `hsla(${hue}, 85%, 62%, 0.8)`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(cx + t0.x, cy + t0.y)
        ctx.lineTo(cx + t1.x, cy + t1.y)
        ctx.stroke()
      }

      if (!p.crashed) {
        ctx.fillStyle = '#5b8cff'
        ctx.beginPath()
        ctx.arc(cx + p.x, cy + p.y, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else {
        ctx.fillStyle = '#f472b6'
        ctx.font = 'bold 14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('💥 별에 추락!', cx, cy - STAR_R * 2.4 - 12)
      }
    }
  })

  return (
    <div className="sim-page">
      <h2>🪐 만유인력과 행성 궤도</h2>
      <p className="law">
        행성은 별의 중력(<b>F = GMm/r²</b>)에 붙잡혀 궤도를 돕니다. 초기 속도가 원 궤도
        속도보다 느리면 타원을 그리며 별에 가까워지고, <b>√2배(≈1.41)</b>를 넘으면 영영 탈출합니다.
        궤적 색을 보세요 — 별에 가까울수록 <b>빨갛게(빠르게)</b>, 멀수록 파랗게 변합니다. 이것이
        케플러 제2법칙입니다.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider
          name="초기 속도 (원 궤도 속도의 배수)"
          unit="×"
          min={0.3}
          max={1.5}
          step={0.05}
          value={speedFactor}
          onChange={setSpeedFactor}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          name="별의 질량 (GM)"
          min={2_000_000}
          max={15_000_000}
          step={500_000}
          value={gm}
          onChange={setGm}
          format={(v) => `${(v / 1_000_000).toFixed(1)}M`}
        />
        <button className="btn" onClick={() => launch(speedFactor, gm)}>
          행성 발사
        </button>
        <button className="btn secondary" onClick={() => (planetRef.current = null)}>
          지우기
        </button>
      </div>
      <div className="readouts">
        <Readout label="원 궤도 속도 √(GM/r)" value={vCirc.toFixed(0)} unit="px/s" />
        <Readout label="탈출 속도 √(2GM/r)" value={(vCirc * Math.SQRT2).toFixed(0)} unit="px/s" />
        <Readout label="현재 속력" value={live.speed.toFixed(0)} unit="px/s" />
        <Readout label="별까지 거리" value={live.dist.toFixed(0)} unit="px" />
      </div>
      <p className="hint">
        💡 1.00×로 쏘면 완벽한 원, 0.7×면 찌그러진 타원, 1.45× 이상이면 탈출합니다.
      </p>
    </div>
  )
}
