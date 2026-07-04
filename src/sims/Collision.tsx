import { useEffect, useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const SCALE = 44 // px per meter

interface Block {
  x: number // 중심 위치 (m)
  v: number // m/s
  m: number // kg
  color: string
}

export default function Collision() {
  const [m1, setM1] = useState(2)
  const [m2, setM2] = useState(2)
  const [v1, setV1] = useState(3)
  const [v2, setV2] = useState(-1)
  const [e, setE] = useState(1)
  const [live, setLive] = useState({ p: 0, ke: 0, bv1: 0, bv2: 0 })

  const blocksRef = useRef<Block[]>([])
  const eRef = useRef(e)
  eRef.current = e

  const halfW = (m: number) => (0.35 * Math.cbrt(m)) / 1 // m

  const reset = () => {
    blocksRef.current = [
      { x: 3, v: v1, m: m1, color: '#5b8cff' },
      { x: 12, v: v2, m: m2, color: '#ffb454' },
    ]
  }

  // 슬라이더가 바뀌면 그 값으로 재배치
  useEffect(reset, [m1, m2, v1, v2])

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const [a, b] = blocksRef.current
    if (!a || !b) return
    const trackLen = w / SCALE
    const floorY = h / 2 + 70

    // 이동
    a.x += a.v * dt
    b.x += b.v * dt

    // 두 블록 충돌 (반발 계수 e 적용)
    const gap = b.x - a.x - (halfW(a.m) + halfW(b.m))
    if (gap <= 0 && a.v > b.v) {
      const rest = eRef.current
      const pSum = a.m * a.v + b.m * b.v
      const rel = a.v - b.v
      const na = (pSum - b.m * rest * rel) / (a.m + b.m)
      const nb = (pSum + a.m * rest * rel) / (a.m + b.m)
      a.v = na
      b.v = nb
      // 겹침 해소
      const push = -gap / 2 + 0.001
      a.x -= push
      b.x += push
    }

    // 벽 반사 (완전 탄성)
    for (const blk of [a, b]) {
      const hw = halfW(blk.m)
      if (blk.x - hw < 0 && blk.v < 0) blk.v = -blk.v
      if (blk.x + hw > trackLen && blk.v > 0) blk.v = -blk.v
    }

    // 그리기
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = '#2a3355'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, floorY)
    ctx.lineTo(w, floorY)
    ctx.stroke()

    for (const blk of [a, b]) {
      const hw = halfW(blk.m) * SCALE
      const size = hw * 2
      const px = blk.x * SCALE
      ctx.fillStyle = blk.color
      ctx.beginPath()
      ctx.roundRect(px - hw, floorY - size, size, size, 8)
      ctx.fill()

      ctx.fillStyle = '#0b1020'
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${blk.m}kg`, px, floorY - size / 2 + 5)

      // 속도 화살표
      if (Math.abs(blk.v) > 0.05) {
        const ay = floorY - size - 18
        const len = blk.v * 14
        ctx.strokeStyle = blk.color
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(px, ay)
        ctx.lineTo(px + len, ay)
        ctx.stroke()
        ctx.beginPath()
        const dir = Math.sign(len)
        ctx.moveTo(px + len + dir * 7, ay)
        ctx.lineTo(px + len, ay - 5)
        ctx.lineTo(px + len, ay + 5)
        ctx.closePath()
        ctx.fillStyle = blk.color
        ctx.fill()
      }
    }
  })

  // 수치 표시는 프레임마다가 아니라 주기적으로 갱신 (리렌더 절약)
  useEffect(() => {
    const id = setInterval(() => {
      const [a, b] = blocksRef.current
      if (!a || !b) return
      setLive({
        p: a.m * a.v + b.m * b.v,
        ke: 0.5 * a.m * a.v ** 2 + 0.5 * b.m * b.v ** 2,
        bv1: a.v,
        bv2: b.v,
      })
    }, 100)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="sim-page">
      <h2>💥 충돌과 운동량 보존</h2>
      <p className="law">
        두 물체가 충돌해도 <b>운동량의 합(m₁v₁ + m₂v₂)은 항상 보존</b>됩니다. 반발 계수 e=1이면
        운동 에너지까지 보존되는 <b>완전 탄성 충돌</b>, e=0이면 두 물체가 붙어버리는{' '}
        <b>완전 비탄성 충돌</b>입니다. e를 낮춰 보세요 — 운동량은 그대로지만 운동 에너지는
        줄어듭니다.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider name="파란 질량 m₁" unit="kg" min={1} max={10} value={m1} onChange={setM1} />
        <Slider name="주황 질량 m₂" unit="kg" min={1} max={10} value={m2} onChange={setM2} />
        <Slider name="파란 초기 속도 v₁" unit="m/s" min={-5} max={5} step={0.5} value={v1} onChange={setV1} />
        <Slider name="주황 초기 속도 v₂" unit="m/s" min={-5} max={5} step={0.5} value={v2} onChange={setV2} />
        <Slider
          name="반발 계수 e"
          min={0}
          max={1}
          step={0.05}
          value={e}
          onChange={setE}
          format={(v) => v.toFixed(2)}
        />
        <button className="btn" onClick={reset}>
          다시 시작
        </button>
      </div>
      <div className="readouts">
        <Readout label="총 운동량 Σp" value={live.p.toFixed(2)} unit="kg·m/s" />
        <Readout label="총 운동에너지 ΣKE" value={live.ke.toFixed(2)} unit="J" />
        <Readout label="파란 속도" value={live.bv1.toFixed(2)} unit="m/s" />
        <Readout label="주황 속도" value={live.bv2.toFixed(2)} unit="m/s" />
      </div>
      <p className="hint">
        💡 벽에 부딪히면 운동량 부호가 바뀝니다 — 그 운동량은 벽(지구)이 받아 간 것이에요. 두 블록끼리
        충돌하는 순간에는 Σp가 변하지 않는 것을 확인해 보세요.
      </p>
    </div>
  )
}
