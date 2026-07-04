import { useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const F_NATURAL = 0.55 // 그네의 고유 진동수 (Hz)
const W0 = 2 * Math.PI * F_NATURAL
const DRIVE = 1.1 // 미는 힘의 세기

export default function Resonance() {
  const [fDrive, setFDrive] = useState(0.3) // 미는 진동수 (Hz)
  const [dampSel, setDampSel] = useState(0.15)

  // x: 그네 각도(rad), v: 각속도
  const stateRef = useRef({ x: 0, v: 0, t: 0, ampWindow: 0 })
  const paramsRef = useRef({ fDrive, damp: dampSel })
  paramsRef.current = { fDrive, damp: dampSel }
  const [amp, setAmp] = useState(0)
  const ampTimer = useRef(0)

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const p = paramsRef.current
    const s = stateRef.current
    const wd = 2 * Math.PI * p.fDrive

    // 강제 감쇠 진동: x'' = −ω₀²x − 2βx' + F·sin(ω_d t)
    const steps = 6
    const sub = dt / steps
    for (let i = 0; i < steps; i++) {
      s.t += sub
      const a = -W0 * W0 * Math.sin(s.x) - 2 * p.damp * s.v + DRIVE * Math.sin(wd * s.t)
      s.v += a * sub
      s.x += s.v * sub
    }
    // 최근 최대 진폭 추적
    s.ampWindow = Math.max(s.ampWindow * (1 - dt * 0.35), Math.abs(s.x))
    ampTimer.current += dt
    if (ampTimer.current > 0.15) {
      ampTimer.current = 0
      setAmp(s.ampWindow)
    }

    ctx.clearRect(0, 0, w, h)

    // ---- 그네 (왼쪽) ----
    const px = w * 0.3
    const py = 46
    const ropeL = h * 0.52
    const ang = Math.max(-1.4, Math.min(1.4, s.x))
    const bx = px + Math.sin(ang) * ropeL
    const by = py + Math.cos(ang) * ropeL

    // 프레임
    ctx.strokeStyle = '#2a3355'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(px - 90, h - 30)
    ctx.lineTo(px, py)
    ctx.lineTo(px + 90, h - 30)
    ctx.stroke()

    ctx.strokeStyle = '#93a0c4'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(bx, by)
    ctx.stroke()

    ctx.font = '26px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🧒', bx, by + 4)

    // 미는 손 (구동력 위상 표시)
    const push = Math.sin(wd * s.t)
    ctx.font = '22px sans-serif'
    ctx.globalAlpha = 0.4 + 0.6 * Math.max(0, push)
    ctx.fillText('🫸', px - 110 + push * 16, by - 6)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#93a0c4'
    ctx.font = '11px sans-serif'
    ctx.fillText('일정한 리듬으로 미는 손', px - 100, by + 26)

    // ---- 공명 곡선 (오른쪽) ----
    const gx = w * 0.56
    const gw = w - gx - 30
    const gy = 60
    const gh = h - 140

    ctx.strokeStyle = '#2a3355'
    ctx.lineWidth = 1.5
    ctx.strokeRect(gx, gy, gw, gh)

    // 이론 진폭 곡선 A(ω) = F/√((ω₀²−ω²)² + (2βω)²)
    const fMax = 1.2
    const ampAt = (f: number) => {
      const om = 2 * Math.PI * f
      return DRIVE / Math.sqrt((W0 * W0 - om * om) ** 2 + (2 * p.damp * om) ** 2)
    }
    let peak = 0
    for (let i = 0; i <= 100; i++) peak = Math.max(peak, ampAt((fMax * i) / 100))

    ctx.strokeStyle = '#ffb454'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i <= 100; i++) {
      const f = (fMax * i) / 100
      const x = gx + (f / fMax) * gw
      const y = gy + gh - (ampAt(f) / peak) * (gh - 14)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // 고유 진동수 선
    const natX = gx + (F_NATURAL / fMax) * gw
    ctx.strokeStyle = 'rgba(74,222,128,0.6)'
    ctx.setLineDash([4, 6])
    ctx.beginPath()
    ctx.moveTo(natX, gy)
    ctx.lineTo(natX, gy + gh)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#4ade80'
    ctx.font = '11px sans-serif'
    ctx.fillText(`고유 진동수 ${F_NATURAL}Hz`, natX, gy - 8)

    // 현재 구동 진동수 마커
    const curX = gx + Math.min(p.fDrive / fMax, 1) * gw
    ctx.fillStyle = '#5b8cff'
    ctx.beginPath()
    ctx.arc(curX, gy + gh - (ampAt(p.fDrive) / peak) * (gh - 14), 6, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#93a0c4'
    ctx.fillText('미는 진동수 →', gx + gw / 2, gy + gh + 18)
    ctx.save()
    ctx.translate(gx - 10, gy + gh / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('그네 진폭', 0, 0)
    ctx.restore()
  })

  const resonant = Math.abs(fDrive - F_NATURAL) < 0.06

  return (
    <div className="sim-page">
      <h2>🎡 공명 — 그네 밀기의 과학</h2>
      <p className="law">
        모든 물체에는 <b>고유 진동수</b>가 있습니다. 그네를 아무 때나 밀면 힘이 낭비되지만,{' '}
        <b>그네의 리듬에 정확히 맞춰</b> 밀면 작은 힘이 차곡차곡 쌓여 진폭이 폭발적으로
        커집니다 — 이것이 공명. 군대가 다리 위에서 발맞춰 걷지 않는 이유, 성악가가 유리잔을
        깨는 원리, 지진에 특정 높이 건물만 무너지는 이유입니다.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider
          name="미는 진동수"
          unit="Hz"
          min={0.1}
          max={1.2}
          step={0.01}
          value={fDrive}
          onChange={setFDrive}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          name="감쇠 (공기 저항)"
          min={0.05}
          max={0.6}
          step={0.05}
          value={dampSel}
          onChange={setDampSel}
          format={(v) => v.toFixed(2)}
        />
        <button
          className="btn"
          onClick={() => {
            stateRef.current.x = 0
            stateRef.current.v = 0
            stateRef.current.ampWindow = 0
          }}
        >
          그네 멈추기
        </button>
      </div>
      <div className="readouts">
        <Readout label="그네 고유 진동수" value={F_NATURAL.toFixed(2)} unit="Hz" />
        <Readout label="현재 진폭" value={((amp * 180) / Math.PI).toFixed(0)} unit="°" />
        <Readout label="상태" value={resonant ? '공명! 🔥' : '리듬이 안 맞음'} />
      </div>
      <p className="hint">
        💡 미는 진동수를 천천히 0.55Hz에 맞춰 보세요 — 마커가 주황 곡선의 봉우리에 올라가는
        순간 그네가 크게 흔들리기 시작합니다. 감쇠를 낮추면 봉우리가 더 뾰족하고 높아져요.
      </p>
    </div>
  )
}
