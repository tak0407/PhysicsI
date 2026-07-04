import { useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const G = 9.8
const L = 1 // 팔 길이 (m, 두 팔 동일)
const PX_PER_M = 105

interface DPState {
  th1: number
  w1: number
  th2: number
  w2: number
}

// 표준 이중 진자 운동 방정식 (m1=m2=1, l1=l2=L)
function deriv(s: DPState): DPState {
  const d = s.th1 - s.th2
  const denom = 3 - Math.cos(2 * d)
  const a1 =
    (-3 * G * Math.sin(s.th1) -
      G * Math.sin(s.th1 - 2 * s.th2) -
      2 * Math.sin(d) * (s.w2 * s.w2 * L + s.w1 * s.w1 * L * Math.cos(d))) /
    (L * denom)
  const a2 =
    (2 *
      Math.sin(d) *
      (2 * s.w1 * s.w1 * L + 2 * G * Math.cos(s.th1) + s.w2 * s.w2 * L * Math.cos(d))) /
    (L * denom)
  return { th1: s.w1, w1: a1, th2: s.w2, w2: a2 }
}

function rk4(s: DPState, h: number): DPState {
  const add = (a: DPState, b: DPState, f: number): DPState => ({
    th1: a.th1 + b.th1 * f,
    w1: a.w1 + b.w1 * f,
    th2: a.th2 + b.th2 * f,
    w2: a.w2 + b.w2 * f,
  })
  const k1 = deriv(s)
  const k2 = deriv(add(s, k1, h / 2))
  const k3 = deriv(add(s, k2, h / 2))
  const k4 = deriv(add(s, k3, h))
  return {
    th1: s.th1 + (h / 6) * (k1.th1 + 2 * k2.th1 + 2 * k3.th1 + k4.th1),
    w1: s.w1 + (h / 6) * (k1.w1 + 2 * k2.w1 + 2 * k3.w1 + k4.w1),
    th2: s.th2 + (h / 6) * (k1.th2 + 2 * k2.th2 + 2 * k3.th2 + k4.th2),
    w2: s.w2 + (h / 6) * (k1.w2 + 2 * k2.w2 + 2 * k3.w2 + k4.w2),
  }
}

export default function DoublePendulum() {
  const [angle, setAngle] = useState(120) // 시작 각도 (°)
  const [twin, setTwin] = useState(true)

  const mainRef = useRef<DPState>({ th1: (120 * Math.PI) / 180, w1: 0, th2: (120 * Math.PI) / 180, w2: 0 })
  // 쌍둥이: 초기 각도가 0.01°만 다르다
  const twinRef = useRef<DPState>({ th1: (120.01 * Math.PI) / 180, w1: 0, th2: (120.01 * Math.PI) / 180, w2: 0 })
  const trailMain = useRef<{ x: number; y: number }[]>([])
  const trailTwin = useRef<{ x: number; y: number }[]>([])
  const twinOn = useRef(twin)
  twinOn.current = twin

  const reset = (deg: number) => {
    const r = (deg * Math.PI) / 180
    const r2 = ((deg + 0.01) * Math.PI) / 180
    mainRef.current = { th1: r, w1: 0, th2: r, w2: 0 }
    twinRef.current = { th1: r2, w1: 0, th2: r2, w2: 0 }
    trailMain.current = []
    trailTwin.current = []
  }

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const px = w / 2
    const py = h * 0.36

    // 카오스는 오차에 민감하므로 잘게 쪼개 RK4로 적분한다
    const steps = 6
    for (let i = 0; i < steps; i++) {
      mainRef.current = rk4(mainRef.current, dt / steps)
      if (twinOn.current) twinRef.current = rk4(twinRef.current, dt / steps)
    }

    const pos = (s: DPState) => {
      const x1 = px + Math.sin(s.th1) * L * PX_PER_M
      const y1 = py + Math.cos(s.th1) * L * PX_PER_M
      const x2 = x1 + Math.sin(s.th2) * L * PX_PER_M
      const y2 = y1 + Math.cos(s.th2) * L * PX_PER_M
      return { x1, y1, x2, y2 }
    }

    const m = pos(mainRef.current)
    trailMain.current.push({ x: m.x2, y: m.y2 })
    if (trailMain.current.length > 2600) trailMain.current.shift()

    let t: ReturnType<typeof pos> | null = null
    if (twinOn.current) {
      t = pos(twinRef.current)
      trailTwin.current.push({ x: t.x2, y: t.y2 })
      if (trailTwin.current.length > 2600) trailTwin.current.shift()
    }

    ctx.clearRect(0, 0, w, h)

    // 궤적
    const drawTrail = (trail: { x: number; y: number }[], hue: number) => {
      for (let i = 1; i < trail.length; i++) {
        const a = i / trail.length
        ctx.strokeStyle = `hsla(${hue}, 85%, 62%, ${a * 0.55})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y)
        ctx.lineTo(trail[i].x, trail[i].y)
        ctx.stroke()
      }
    }
    drawTrail(trailMain.current, 222)
    if (t) drawTrail(trailTwin.current, 330)

    // 진자 팔과 추
    const drawPend = (p: ReturnType<typeof pos>, color: string, alpha: number) => {
      ctx.globalAlpha = alpha
      ctx.strokeStyle = '#93a0c4'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(p.x1, p.y1)
      ctx.lineTo(p.x2, p.y2)
      ctx.stroke()
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(p.x1, p.y1, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(p.x2, p.y2, 11, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    if (t) drawPend(t, '#f472b6', 0.85)
    drawPend(m, '#5b8cff', 1)

    ctx.fillStyle = '#2a3355'
    ctx.beginPath()
    ctx.arc(px, py, 6, 0, Math.PI * 2)
    ctx.fill()

    if (twinOn.current && t) {
      const sep = Math.hypot(m.x2 - t.x2, m.y2 - t.y2)
      ctx.fillStyle = sep > 40 ? '#f472b6' : '#93a0c4'
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(
        sep > 40 ? '완전히 갈라졌습니다! (시작 차이는 겨우 0.01°)' : '아직 거의 같이 움직이는 중…',
        16,
        28,
      )
    }
  })

  return (
    <div className="sim-page">
      <h2>🌪️ 이중 진자 (카오스)</h2>
      <p className="law">
        진자 끝에 진자를 하나 더 달면 <b>카오스</b>가 태어납니다. 방정식은 완벽하게 결정론적인데도,
        시작 각도가 <b>0.01°만 달라도</b> 몇 초 뒤엔 전혀 다른 운동이 됩니다. 파란 진자와 분홍
        진자는 거의 똑같이 출발했어요 — 언제 갈라지는지 지켜보세요. 날씨를 먼 미래까지 예보할 수
        없는 이유(나비 효과)가 바로 이것입니다.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider name="시작 각도" unit="°" min={30} max={180} value={angle} onChange={setAngle} />
        <button
          className={twin ? 'btn' : 'btn secondary'}
          onClick={() => setTwin((v) => !v)}
        >
          {twin ? '쌍둥이 진자 켜짐 (+0.01°)' : '쌍둥이 진자 꺼짐'}
        </button>
        <button className="btn" onClick={() => reset(angle)}>
          다시 시작
        </button>
      </div>
      <div className="readouts">
        <Readout label="파란 vs 분홍 초기 차이" value="0.01" unit="°" />
      </div>
      <p className="hint">
        💡 시작 각도가 작으면(&lt;60°) 카오스가 거의 없이 얌전히 움직입니다. 120° 이상에서
        진짜 카오스가 나타나요. 에너지는 계속 보존되고 있습니다 — 무질서해 보여도 물리 법칙은
        한 치도 어긋나지 않아요.
      </p>
    </div>
  )
}
