import { useEffect, useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
}

const BASE_SPEED = 60 // T=1일 때 평균 속력 (px/s)

function gaussian() {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export default function GasBox() {
  const [temp, setTemp] = useState(1)
  const [volume, setVolume] = useState(1) // 상자 폭 비율
  const [count, setCount] = useState(200)
  const [pressure, setPressure] = useState(0)

  const parts = useRef<Particle[]>([])
  const impulse = useRef(0)
  const pressureEma = useRef(0)
  const paramsRef = useRef({ temp, volume })
  paramsRef.current = { temp, volume }

  const makeParticle = (t: number): Particle => ({
    x: Math.random(),
    y: Math.random(),
    vx: gaussian() * BASE_SPEED * Math.sqrt(t) * 0.7,
    vy: gaussian() * BASE_SPEED * Math.sqrt(t) * 0.7,
  })

  // 입자 수 변경
  useEffect(() => {
    const arr = parts.current
    while (arr.length < count) arr.push(makeParticle(paramsRef.current.temp))
    while (arr.length > count) arr.pop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  // 온도 변경: 모든 속도를 √(T비율)로 재조정
  const prevTemp = useRef(temp)
  useEffect(() => {
    const f = Math.sqrt(temp / prevTemp.current)
    prevTemp.current = temp
    for (const p of parts.current) {
      p.vx *= f
      p.vy *= f
    }
  }, [temp])

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const p = paramsRef.current
    const margin = 24
    const boxH = h - margin * 2
    const fullW = w - margin * 2 - 60
    const boxW = fullW * (0.35 + 0.65 * p.volume)
    const x0 = margin
    const y0 = margin

    // 이동과 벽 충돌 (충격량 축적 → 압력)
    let imp = 0
    for (const pt of parts.current) {
      pt.x += (pt.vx * dt) / boxW
      pt.y += (pt.vy * dt) / boxH
      if (pt.x < 0) {
        pt.x = -pt.x
        pt.vx = Math.abs(pt.vx)
        imp += 2 * Math.abs(pt.vx)
      }
      if (pt.x > 1) {
        pt.x = 2 - pt.x
        pt.vx = -Math.abs(pt.vx)
        imp += 2 * Math.abs(pt.vx)
      }
      if (pt.y < 0) {
        pt.y = -pt.y
        pt.vy = Math.abs(pt.vy)
        imp += 2 * Math.abs(pt.vy)
      }
      if (pt.y > 1) {
        pt.y = 2 - pt.y
        pt.vy = -Math.abs(pt.vy)
        imp += 2 * Math.abs(pt.vy)
      }
    }
    // 압력 = 단위 시간·단위 둘레당 충격량 (지수평활)
    const perimeter = 2 * (boxW + boxH)
    const inst = imp / dt / perimeter
    pressureEma.current += (inst - pressureEma.current) * Math.min(dt * 2.5, 1)
    impulse.current = inst

    ctx.clearRect(0, 0, w, h)

    // 상자
    ctx.strokeStyle = '#2a3355'
    ctx.lineWidth = 3
    ctx.strokeRect(x0, y0, boxW, boxH)

    // 피스톤 (오른쪽 벽)
    ctx.fillStyle = '#5b8cff'
    ctx.fillRect(x0 + boxW - 3, y0, 10, boxH)
    ctx.fillStyle = '#2a3355'
    ctx.fillRect(x0 + boxW + 7, y0 + boxH / 2 - 7, 46, 14)
    ctx.fillStyle = '#93a0c4'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('피스톤', x0 + boxW + 30, y0 + boxH / 2 - 14)

    // 입자 (속력에 따라 색: 느림=파랑 → 빠름=빨강)
    const vRef = BASE_SPEED * Math.sqrt(p.temp) * 1.6
    for (const pt of parts.current) {
      const speed = Math.hypot(pt.vx, pt.vy)
      const hue = 220 - Math.min(speed / vRef, 1) * 200
      ctx.fillStyle = `hsl(${hue}, 85%, 62%)`
      ctx.beginPath()
      ctx.arc(x0 + pt.x * boxW, y0 + pt.y * boxH, 2.6, 0, Math.PI * 2)
      ctx.fill()
    }
  })

  // 압력 표시 갱신
  useEffect(() => {
    const id = setInterval(() => setPressure(pressureEma.current), 200)
    return () => clearInterval(id)
  }, [])

  const vRel = 0.35 + 0.65 * volume
  // PV/NT — 이상기체라면 일정해야 한다 (임의 단위 보정)
  const constant = (pressure * vRel) / (count * temp)

  return (
    <div className="sim-page">
      <h2>🔥 기체 분자 운동 (PV = NkT)</h2>
      <p className="law">
        기체의 압력은 <b>수많은 분자가 벽을 두드리는 충격</b>입니다. 온도를 올리면 분자가
        빨라져 더 세게·자주 부딪히고(압력↑), 피스톤을 밀어 부피를 줄이면 같은 분자가 더 좁은
        벽에 몰리며 압력이 올라갑니다. 이 화면의 압력계는 실제로 <b>분자가 벽에 준 충격량을
        세어서</b> 계산하고 있어요 — 이상기체 법칙이 통계에서 저절로 나옵니다.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider
          name="온도 T"
          min={0.3}
          max={3}
          step={0.1}
          value={temp}
          onChange={setTemp}
          format={(v) => v.toFixed(1)}
        />
        <Slider
          name="부피 (피스톤)"
          min={0.2}
          max={1}
          step={0.05}
          value={volume}
          onChange={setVolume}
          format={(v) => (0.35 + 0.65 * v).toFixed(2)}
        />
        <Slider name="분자 수 N" min={50} max={500} step={25} value={count} onChange={setCount} />
      </div>
      <div className="readouts">
        <Readout label="측정 압력 P (벽 충격량)" value={pressure.toFixed(1)} />
        <Readout label="PV / NT (일정해야 정상)" value={(constant * 1000).toFixed(2)} />
      </div>
      <p className="hint">
        💡 온도·부피·분자 수를 아무리 바꿔도 PV/NT 값이 거의 일정하게 유지되는 걸 확인해
        보세요. 온도를 올리면 입자 색이 빨갛게(빠르게) 변합니다. 절대영도(T→0)에 가까워지면
        모든 분자가 거의 멈춥니다.
      </p>
    </div>
  )
}
