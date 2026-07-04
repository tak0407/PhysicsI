import { useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const PX_PER_M = 140
const MASS = 1 // kg (에너지 계산용)

export default function Pendulum() {
  const [length, setLength] = useState(1.5)
  const [g, setG] = useState(9.8)
  const [damping, setDamping] = useState(0)

  // theta: 연직선 기준 각도(rad), omega: 각속도
  const stateRef = useRef({ theta: Math.PI / 4, omega: 0, dragging: false })
  const paramsRef = useRef({ length, g, damping })
  paramsRef.current = { length, g, damping }

  const period = 2 * Math.PI * Math.sqrt(length / g)

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const s = stateRef.current
    const p = paramsRef.current
    const pivotX = w / 2
    const pivotY = 60

    if (!s.dragging) {
      // 정확도를 위해 프레임을 잘게 쪼개 적분
      const steps = 8
      const sub = dt / steps
      for (let i = 0; i < steps; i++) {
        const alpha = -(p.g / p.length) * Math.sin(s.theta) - p.damping * s.omega
        s.omega += alpha * sub
        s.theta += s.omega * sub
      }
    }

    const bobX = pivotX + Math.sin(s.theta) * p.length * PX_PER_M
    const bobY = pivotY + Math.cos(s.theta) * p.length * PX_PER_M

    ctx.clearRect(0, 0, w, h)

    // 연직 기준선
    ctx.strokeStyle = 'rgba(147,160,196,0.25)'
    ctx.setLineDash([4, 6])
    ctx.beginPath()
    ctx.moveTo(pivotX, pivotY)
    ctx.lineTo(pivotX, pivotY + p.length * PX_PER_M + 40)
    ctx.stroke()
    ctx.setLineDash([])

    // 줄과 추
    ctx.strokeStyle = '#93a0c4'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(pivotX, pivotY)
    ctx.lineTo(bobX, bobY)
    ctx.stroke()

    ctx.fillStyle = '#2a3355'
    ctx.beginPath()
    ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffb454'
    ctx.beginPath()
    ctx.arc(bobX, bobY, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 에너지 막대 (역학적 에너지 보존 시각화)
    const hgt = p.length * (1 - Math.cos(s.theta)) // 최저점 기준 높이
    const pe = MASS * p.g * hgt
    const ke = 0.5 * MASS * (p.length * s.omega) ** 2
    const total = pe + ke || 1e-9
    const barX = w - 120
    const barH = 160
    const barY = h - barH - 60

    ctx.fillStyle = '#141a2e'
    ctx.fillRect(barX - 8, barY - 8, 104, barH + 46)
    const drawBar = (i: number, frac: number, color: string, label: string) => {
      const x = barX + i * 48
      ctx.fillStyle = 'rgba(147,160,196,0.15)'
      ctx.fillRect(x, barY, 36, barH)
      ctx.fillStyle = color
      const hh = barH * Math.min(frac, 1)
      ctx.fillRect(x, barY + barH - hh, 36, hh)
      ctx.fillStyle = '#93a0c4'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label, x + 18, barY + barH + 18)
    }
    drawBar(0, pe / total, '#5b8cff', '위치 E')
    drawBar(1, ke / total, '#4ade80', '운동 E')
  })

  const setAngleFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const dx = x - rect.width / 2
    const dy = y - 60
    stateRef.current.theta = Math.atan2(dx, dy)
    stateRef.current.omega = 0
  }

  return (
    <div className="sim-page">
      <h2>🕰️ 단진자</h2>
      <p className="law">
        진자의 주기는 <b>줄의 길이와 중력</b>에만 의존하고, <b>추를 놓는 높이(진폭)와는 거의
        무관</b>합니다(작은 각도에서). 추를 드래그해서 놓아 보세요. 감쇠를 0으로 두면 위치
        에너지와 운동 에너지가 서로 바뀌며 <b>역학적 에너지가 보존</b>되는 걸 볼 수 있습니다.
      </p>
      <canvas
        ref={canvasRef}
        className="sim-canvas"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          stateRef.current.dragging = true
          setAngleFromPointer(e)
        }}
        onPointerMove={(e) => {
          if (stateRef.current.dragging) setAngleFromPointer(e)
        }}
        onPointerUp={() => {
          stateRef.current.dragging = false
        }}
      />
      <div className="controls">
        <Slider
          name="줄 길이"
          unit="m"
          min={0.4}
          max={2.4}
          step={0.1}
          value={length}
          onChange={setLength}
          format={(v) => v.toFixed(1)}
        />
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
        <Slider
          name="공기 저항(감쇠)"
          min={0}
          max={0.8}
          step={0.05}
          value={damping}
          onChange={setDamping}
          format={(v) => v.toFixed(2)}
        />
        <button
          className="btn secondary"
          onClick={() => {
            stateRef.current.theta = Math.PI / 4
            stateRef.current.omega = 0
          }}
        >
          45°에서 다시 놓기
        </button>
      </div>
      <div className="readouts">
        <Readout label="이론 주기 T = 2π√(L/g)" value={period.toFixed(2)} unit="s" />
      </div>
      <p className="hint">🖱️ 캔버스에서 추를 직접 드래그해 원하는 각도에서 놓을 수 있습니다.</p>
    </div>
  )
}
