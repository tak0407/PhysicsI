import { useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const G = 9.8
const BEAM_LEN = 6 // 널빤지 전체 길이 (m)
const BEAM_MASS = 4 // 널빤지 질량 (관성 모멘트용)
const MAX_ANGLE = 0.22 // 기울기 한계 (rad)

export default function Seesaw() {
  const [m1, setM1] = useState(6) // 왼쪽 무게
  const [d1, setD1] = useState(1.5) // 왼쪽 거리
  const [m2, setM2] = useState(3) // 오른쪽 무게
  const [d2, setD2] = useState(2.5) // 오른쪽 거리

  // angle: 오른쪽이 내려가는 방향이 +
  const stateRef = useRef({ angle: 0, omega: 0 })
  const paramsRef = useRef({ m1, d1, m2, d2 })
  paramsRef.current = { m1, d1, m2, d2 }

  const tauLeft = m1 * G * d1
  const tauRight = m2 * G * d2
  const balanced = Math.abs(tauLeft - tauRight) < 0.5

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const s = stateRef.current
    const p = paramsRef.current
    const pivotX = w / 2
    const pivotY = h * 0.62
    const scale = Math.min(w - 90, 640) / BEAM_LEN

    // 회전 운동: α = 알짜 돌림힘 / 관성 모멘트
    const I =
      p.m1 * p.d1 ** 2 + p.m2 * p.d2 ** 2 + (BEAM_MASS * BEAM_LEN ** 2) / 12
    const net = p.m2 * G * p.d2 - p.m1 * G * p.d1 // 오른쪽 - 왼쪽
    const alpha = (net * Math.cos(s.angle)) / I - 1.6 * s.omega
    s.omega += alpha * dt
    s.angle += s.omega * dt
    if (s.angle > MAX_ANGLE) {
      s.angle = MAX_ANGLE
      s.omega = 0
    }
    if (s.angle < -MAX_ANGLE) {
      s.angle = -MAX_ANGLE
      s.omega = 0
    }

    ctx.clearRect(0, 0, w, h)

    // 바닥과 받침점
    const groundY = pivotY + 90
    ctx.strokeStyle = '#2a3355'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, groundY)
    ctx.lineTo(w, groundY)
    ctx.stroke()

    ctx.fillStyle = '#2a3355'
    ctx.beginPath()
    ctx.moveTo(pivotX, pivotY)
    ctx.lineTo(pivotX - 34, groundY)
    ctx.lineTo(pivotX + 34, groundY)
    ctx.closePath()
    ctx.fill()

    // 널빤지와 추 (받침점 기준 회전)
    ctx.save()
    ctx.translate(pivotX, pivotY)
    ctx.rotate(s.angle)

    ctx.fillStyle = '#93a0c4'
    ctx.beginPath()
    ctx.roundRect((-BEAM_LEN / 2) * scale, -7, BEAM_LEN * scale, 14, 7)
    ctx.fill()

    // 거리 눈금 (1m 간격)
    ctx.fillStyle = '#0b1020'
    for (let d = 1; d <= BEAM_LEN / 2 - 0.5; d++) {
      ctx.fillRect(d * scale - 1, -7, 2, 14)
      ctx.fillRect(-d * scale - 1, -7, 2, 14)
    }

    const drawWeight = (dist: number, mass: number, color: string) => {
      const x = dist * scale
      const side = 24 + mass * 3.5
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(x - side / 2, -7 - side, side, side, 6)
      ctx.fill()
      ctx.fillStyle = '#0b1020'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${mass}kg`, x, -7 - side / 2 + 4)
    }
    drawWeight(-p.d1, p.m1, '#5b8cff')
    drawWeight(p.d2, p.m2, '#ffb454')
    ctx.restore()

    // 돌림힘 표시
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#5b8cff'
    ctx.fillText(`⟲ ${(p.m1 * G * p.d1).toFixed(0)} N·m`, pivotX - 130, pivotY - 120)
    ctx.fillStyle = '#ffb454'
    ctx.fillText(`${(p.m2 * G * p.d2).toFixed(0)} N·m ⟳`, pivotX + 130, pivotY - 120)

    const isBalanced = Math.abs(p.m1 * p.d1 - p.m2 * p.d2) * G < 0.5
    ctx.fillStyle = isBalanced ? '#4ade80' : '#93a0c4'
    ctx.font = 'bold 15px sans-serif'
    ctx.fillText(isBalanced ? '⚖️ 균형!' : '기울어짐', pivotX, pivotY - 150)
  })

  return (
    <div className="sim-page">
      <h2>⚖️ 시소와 돌림힘</h2>
      <p className="law">
        물체를 회전시키는 능력인 <b>돌림힘(토크)은 힘 × 받침점까지의 거리</b>입니다. 시소가
        균형을 이루는 조건은 무게가 아니라 <b>m₁d₁ = m₂d₂</b> — 그래서 가벼운 사람이 멀리
        앉으면 무거운 사람과 균형을 맞출 수 있어요. 지레, 렌치, 병따개가 모두 이 원리입니다.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider name="파란 추 질량 m₁" unit="kg" min={1} max={10} value={m1} onChange={setM1} />
        <Slider
          name="파란 추 거리 d₁"
          unit="m"
          min={0.5}
          max={2.5}
          step={0.1}
          value={d1}
          onChange={setD1}
          format={(v) => v.toFixed(1)}
        />
        <Slider name="주황 추 질량 m₂" unit="kg" min={1} max={10} value={m2} onChange={setM2} />
        <Slider
          name="주황 추 거리 d₂"
          unit="m"
          min={0.5}
          max={2.5}
          step={0.1}
          value={d2}
          onChange={setD2}
          format={(v) => v.toFixed(1)}
        />
      </div>
      <div className="readouts">
        <Readout label="왼쪽 돌림힘 m₁·g·d₁" value={tauLeft.toFixed(1)} unit="N·m" />
        <Readout label="오른쪽 돌림힘 m₂·g·d₂" value={tauRight.toFixed(1)} unit="N·m" />
        <Readout label="상태" value={balanced ? '균형 ⚖️' : tauLeft > tauRight ? '왼쪽으로 기욺' : '오른쪽으로 기욺'} />
      </div>
      <p className="hint">
        💡 6kg을 1.5m에 놓으면 3kg을 정확히 3m… 은 널빤지를 벗어나니, 2.5m에 두고 질량을 3.6kg으로
        맞춰보세요. m×d 곱이 같아지는 순간 저울이 멈춥니다.
      </p>
    </div>
  )
}
