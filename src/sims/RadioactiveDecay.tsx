import { useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const COLS = 30

interface Atom {
  alive: boolean
  flash: number // 붕괴 직후 반짝임
}

export default function RadioactiveDecay() {
  const [halfLife, setHalfLife] = useState(4) // 초
  const [total, setTotal] = useState(600)
  const [remaining, setRemaining] = useState(600)

  const atomsRef = useRef<Atom[]>(Array.from({ length: 600 }, () => ({ alive: true, flash: 0 })))
  const timeRef = useRef(0)
  const historyRef = useRef<{ t: number; n: number }[]>([])
  const paramsRef = useRef({ halfLife, total })
  paramsRef.current = { halfLife, total }
  const uiTimer = useRef(0)

  const reset = () => {
    atomsRef.current = Array.from({ length: paramsRef.current.total }, () => ({ alive: true, flash: 0 }))
    timeRef.current = 0
    historyRef.current = []
    setRemaining(paramsRef.current.total)
  }

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const p = paramsRef.current
    const atoms = atomsRef.current
    timeRef.current += dt

    // 각 원자는 매 순간 독립적으로, 같은 확률로 붕괴한다 (λ = ln2 / 반감기)
    const lambda = Math.LN2 / p.halfLife
    const prob = 1 - Math.exp(-lambda * dt)
    let alive = 0
    for (const a of atoms) {
      if (a.alive && Math.random() < prob) {
        a.alive = false
        a.flash = 1
      }
      if (a.flash > 0) a.flash -= dt * 2
      if (a.alive) alive++
    }
    historyRef.current.push({ t: timeRef.current, n: alive })
    if (historyRef.current.length > 4000) historyRef.current.shift()

    uiTimer.current += dt
    if (uiTimer.current > 0.15) {
      uiTimer.current = 0
      setRemaining(alive)
    }

    ctx.clearRect(0, 0, w, h)

    // ---- 원자 격자 (왼쪽) ----
    const gridW = w * 0.44
    const rows = Math.ceil(atoms.length / COLS)
    const cell = Math.min(gridW / COLS, (h - 60) / rows)
    const ox = 20
    const oy = (h - rows * cell) / 2
    atoms.forEach((a, i) => {
      const x = ox + (i % COLS) * cell + cell / 2
      const y = oy + Math.floor(i / COLS) * cell + cell / 2
      if (a.alive) ctx.fillStyle = '#5b8cff'
      else if (a.flash > 0) ctx.fillStyle = `rgba(255,180,84,${a.flash})`
      else ctx.fillStyle = 'rgba(147,160,196,0.18)'
      ctx.beginPath()
      ctx.arc(x, y, Math.max(cell * 0.32, 1.5), 0, Math.PI * 2)
      ctx.fill()
    })

    // ---- N(t) 그래프 (오른쪽) ----
    const gx = w * 0.52
    const gw = w - gx - 24
    const gy = 34
    const gh = h - 90
    const tMax = Math.max(p.halfLife * 5, timeRef.current)

    ctx.strokeStyle = '#2a3355'
    ctx.lineWidth = 1.5
    ctx.strokeRect(gx, gy, gw, gh)

    // 이론 곡선 N₀e^(−λt)
    ctx.strokeStyle = '#ffb454'
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    for (let i = 0; i <= 100; i++) {
      const t = (tMax * i) / 100
      const y = gy + gh - (Math.exp(-lambda * t) * (gh - 6))
      const x = gx + (t / tMax) * gw
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // 반감기 눈금: 절반씩 줄어드는 계단
    ctx.fillStyle = '#93a0c4'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    for (let k = 1; k <= 4; k++) {
      const x = gx + ((p.halfLife * k) / tMax) * gw
      if (x > gx + gw) break
      ctx.fillRect(x, gy, 1, gh)
      ctx.fillText(`${k}T½`, x, gy + gh + 14)
    }

    // 실제 측정 곡선
    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = 2
    ctx.beginPath()
    historyRef.current.forEach((pt, i) => {
      const x = gx + (pt.t / tMax) * gw
      const y = gy + gh - (pt.n / p.total) * (gh - 6)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    ctx.fillStyle = '#4ade80'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('실제 남은 원자 수', gx + 8, gy + 16)
    ctx.fillStyle = '#ffb454'
    ctx.fillText('이론 곡선 N₀e^(−λt)', gx + 8, gy + 32)
  })

  const halfLivesPassed = timeRef.current / halfLife

  return (
    <div className="sim-page">
      <h2>☢️ 방사성 붕괴와 반감기</h2>
      <p className="law">
        원자 하나가 <b>언제</b> 붕괴할지는 아무도 모릅니다 — 진짜 무작위예요(양자 터널링 때문).
        그런데 수백 개가 모이면 <b>정확히 반감기마다 절반씩</b> 줄어드는 매끄러운 곡선이
        나타납니다. 개별은 완전한 우연, 집단은 완벽한 규칙 — 이 곡선 하나로 고고학자는 유물의
        나이를(탄소-14), 지질학자는 지구의 나이를 잽니다.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider
          name="반감기 T½"
          unit="초"
          min={1}
          max={10}
          step={0.5}
          value={halfLife}
          onChange={setHalfLife}
          format={(v) => v.toFixed(1)}
        />
        <Slider name="원자 수 N₀" min={100} max={1200} step={100} value={total} onChange={setTotal} />
        <button className="btn" onClick={reset}>
          처음부터 다시
        </button>
      </div>
      <div className="readouts">
        <Readout label="남은 원자" value={`${remaining} / ${total}`} unit="개" />
        <Readout label="지난 반감기 수" value={halfLivesPassed.toFixed(1)} unit="T½" />
        <Readout label="이론 예측 N₀·(½)^(t/T½)" value={(total * Math.pow(0.5, halfLivesPassed)).toFixed(0)} unit="개" />
      </div>
      <p className="hint">
        💡 원자 수를 100개로 줄이면 초록 곡선이 이론(주황 점선)에서 들쭉날쭉 벗어납니다 —
        통계는 수가 많을수록 정확해져요. 그래프의 T½ 눈금마다 남은 수가 절반이 되는 걸
        확인해 보세요. 원자가 "늙지 않는다"는 것도 신기한 점: 10반감기를 버틴 원자도 다음
        1초의 붕괴 확률은 처음과 똑같습니다.
      </p>
    </div>
  )
}
