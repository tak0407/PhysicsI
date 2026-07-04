import { useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const PX_PER_M = 220 // 변위 축척
const EQ_FRACTION = 0.55 // 평형점의 가로 위치 (캔버스 폭 비율)
const WALL_X = 24
const HISTORY_SEC = 12 // 그래프에 보여줄 시간 범위

export default function Spring() {
  const [k, setK] = useState(20)
  const [m, setM] = useState(2)
  const [damping, setDamping] = useState(0)

  // x: 평형점 기준 변위(m), v: 속도(m/s)
  const stateRef = useRef({
    x: 0.6,
    v: 0,
    t: 0,
    dragging: false,
    history: [] as { t: number; x: number }[],
  })
  const paramsRef = useRef({ k, m, damping })
  paramsRef.current = { k, m, damping }

  const period = 2 * Math.PI * Math.sqrt(m / k)

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const s = stateRef.current
    const p = paramsRef.current
    const eqX = w * EQ_FRACTION
    const springY = h * 0.3
    const maxX = (w - 70 - eqX) / PX_PER_M
    const minX = -(eqX - WALL_X - 90) / PX_PER_M

    if (!s.dragging) {
      const steps = 8
      const sub = dt / steps
      for (let i = 0; i < steps; i++) {
        const a = -(p.k / p.m) * s.x - (p.damping / p.m) * s.v
        s.v += a * sub
        s.x += s.v * sub
      }
    }
    s.t += dt
    s.history.push({ t: s.t, x: s.x })
    while (s.history.length && s.history[0].t < s.t - HISTORY_SEC) s.history.shift()

    const blockSide = 34 + p.m * 3
    const blockX = eqX + s.x * PX_PER_M // 블록 중심

    ctx.clearRect(0, 0, w, h)

    // 벽
    ctx.fillStyle = '#2a3355'
    ctx.fillRect(WALL_X - 10, springY - 70, 10, 140)

    // 평형점 기준선
    ctx.strokeStyle = 'rgba(147,160,196,0.3)'
    ctx.setLineDash([4, 6])
    ctx.beginPath()
    ctx.moveTo(eqX, springY - 70)
    ctx.lineTo(eqX, springY + 70)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#93a0c4'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('평형점 (x = 0)', eqX, springY - 80)

    // 바닥
    ctx.strokeStyle = '#2a3355'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, springY + blockSide / 2 + 2)
    ctx.lineTo(w, springY + blockSide / 2 + 2)
    ctx.stroke()

    // 용수철 (지그재그) — 늘어나면 팽팽하게, 압축되면 촘촘하게 그려진다
    const springEnd = blockX - blockSide / 2
    const coils = 12
    const segW = (springEnd - WALL_X) / coils
    ctx.strokeStyle = s.x > 0.02 ? '#f472b6' : s.x < -0.02 ? '#22d3ee' : '#93a0c4'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(WALL_X, springY)
    for (let i = 0; i < coils; i++) {
      const cx = WALL_X + segW * (i + 0.5)
      ctx.lineTo(cx, springY + (i % 2 === 0 ? -14 : 14))
    }
    ctx.lineTo(springEnd, springY)
    ctx.stroke()

    // 블록
    ctx.fillStyle = '#5b8cff'
    ctx.beginPath()
    ctx.roundRect(blockX - blockSide / 2, springY - blockSide / 2, blockSide, blockSide, 8)
    ctx.fill()
    ctx.fillStyle = '#0b1020'
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText(`${p.m}kg`, blockX, springY + 5)

    // 복원력 화살표 F = -kx
    const force = -p.k * s.x
    if (Math.abs(force) > 0.5) {
      const fLen = Math.max(-90, Math.min(90, force * 3))
      const ay = springY - blockSide / 2 - 16
      ctx.strokeStyle = '#ffb454'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(blockX, ay)
      ctx.lineTo(blockX + fLen, ay)
      ctx.stroke()
      const dir = Math.sign(fLen)
      ctx.fillStyle = '#ffb454'
      ctx.beginPath()
      ctx.moveTo(blockX + fLen + dir * 8, ay)
      ctx.lineTo(blockX + fLen, ay - 5)
      ctx.lineTo(blockX + fLen, ay + 5)
      ctx.closePath()
      ctx.fill()
      ctx.font = '11px sans-serif'
      ctx.fillText('복원력', blockX + fLen / 2, ay - 10)
    }

    // ---- 변위-시간 그래프 ----
    const gTop = h * 0.55
    const gBottom = h - 24
    const gMid = (gTop + gBottom) / 2
    const gAmp = (gBottom - gTop) / 2 - 8
    const xScale = Math.max(Math.abs(minX), maxX) // 그래프 세로 축척 기준 진폭

    ctx.strokeStyle = 'rgba(147,160,196,0.25)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, gMid)
    ctx.lineTo(w, gMid)
    ctx.stroke()
    ctx.fillStyle = '#93a0c4'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('변위 x-시간 그래프', 12, gTop - 6)

    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = 2
    ctx.beginPath()
    let started = false
    for (const pt of s.history) {
      const px = w - ((s.t - pt.t) / HISTORY_SEC) * w
      const py = gMid - (pt.x / xScale) * gAmp
      if (!started) {
        ctx.moveTo(px, py)
        started = true
      } else ctx.lineTo(px, py)
    }
    ctx.stroke()
  })

  const setFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const eqX = rect.width * EQ_FRACTION
    const maxX = (rect.width - 70 - eqX) / PX_PER_M
    const minX = -(eqX - WALL_X - 90) / PX_PER_M
    const x = (e.clientX - rect.left - eqX) / PX_PER_M
    stateRef.current.x = Math.max(minX, Math.min(maxX, x))
    stateRef.current.v = 0
  }

  return (
    <div className="sim-page">
      <h2>🌀 용수철 진동 (단순조화운동)</h2>
      <p className="law">
        용수철은 늘어나거나 압축된 만큼 되돌리려는 힘 <b>F = −kx</b>(훅의 법칙)를 냅니다. 이
        복원력 때문에 블록은 평형점을 중심으로 영원히 진동하고, 변위를 시간에 따라 그리면{' '}
        <b>사인 곡선</b>이 됩니다. 주기는 <b>진폭과 무관</b>하게 질량과 용수철 상수로만
        정해집니다 — 블록을 살짝 당겨도, 크게 당겨도 한 번 왕복하는 시간은 같아요.
      </p>
      <canvas
        ref={canvasRef}
        className="sim-canvas"
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          if (e.clientY - rect.top > rect.height * 0.5) return // 그래프 영역은 무시
          e.currentTarget.setPointerCapture(e.pointerId)
          stateRef.current.dragging = true
          setFromPointer(e)
        }}
        onPointerMove={(e) => {
          if (stateRef.current.dragging) setFromPointer(e)
        }}
        onPointerUp={() => {
          stateRef.current.dragging = false
        }}
      />
      <div className="controls">
        <Slider name="용수철 상수 k" unit="N/m" min={5} max={80} value={k} onChange={setK} />
        <Slider name="질량 m" unit="kg" min={1} max={10} value={m} onChange={setM} />
        <Slider
          name="마찰(감쇠)"
          min={0}
          max={3}
          step={0.1}
          value={damping}
          onChange={setDamping}
          format={(v) => v.toFixed(1)}
        />
        <button
          className="btn"
          onClick={() => {
            stateRef.current.x = 0.6
            stateRef.current.v = 0
          }}
        >
          당겼다 놓기
        </button>
      </div>
      <div className="readouts">
        <Readout label="주기 T = 2π√(m/k)" value={period.toFixed(2)} unit="s" />
        <Readout label="진동수 f = 1/T" value={(1 / period).toFixed(2)} unit="Hz" />
      </div>
      <p className="hint">
        💡 질량을 4배로 늘리면 주기가 정확히 2배가 됩니다(√4 = 2). 감쇠를 올리면 그래프가 점점
        잦아드는 감쇠 진동을 볼 수 있어요.
      </p>
    </div>
  )
}
