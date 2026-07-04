import { useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const TICK_PERIOD = 1 // 정지 시계의 광자 왕복 시간 (s)

export default function TimeDilation() {
  const [beta, setBeta] = useState(0.8) // v/c

  const stateRef = useRef({ earthT: 0, shipT: 0, shipX: -1 })
  const trailRef = useRef<{ x: number; y: number }[]>([])
  const paramsRef = useRef({ beta })
  paramsRef.current = { beta }

  const gamma = 1 / Math.sqrt(1 - beta * beta)

  const reset = () => {
    stateRef.current = { earthT: 0, shipT: 0, shipX: -1 }
    trailRef.current = []
  }

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const p = paramsRef.current
    const s = stateRef.current
    const g = 1 / Math.sqrt(1 - p.beta * p.beta)

    s.earthT += dt
    s.shipT += dt / g // 움직이는 시계는 느리게 간다
    const shipW = 150
    const laneStart = w * 0.34 // 지구 시계와 겹치지 않게 오른쪽 구간만 주행
    if (s.shipX < 0) s.shipX = laneStart
    s.shipX += p.beta * 190 * dt
    if (s.shipX > w + 40) s.shipX = laneStart

    ctx.clearRect(0, 0, w, h)

    const clockH = 120
    const mirrorW = 54

    // ---- 지구 시계 (왼쪽, 정지) ----
    const ex = w * 0.16
    const ey = h * 0.28
    const drawClock = (cx: number, cy: number, phase: number, label: string, color: string) => {
      // 거울 두 장
      ctx.fillStyle = '#93a0c4'
      ctx.fillRect(cx - mirrorW / 2, cy - 4, mirrorW, 4)
      ctx.fillRect(cx - mirrorW / 2, cy + clockH, mirrorW, 4)
      // 광자 (위아래 왕복)
      const f = phase % 1
      const yy = f < 0.5 ? f * 2 : (1 - f) * 2
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(cx, cy + yy * clockH, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#93a0c4'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label, cx, cy + clockH + 26)
    }

    drawClock(ex, ey, s.earthT / TICK_PERIOD, '지구의 빛 시계', '#ffb454')

    // ---- 우주선 시계 (오른쪽으로 이동 중) ----
    const sy = h * 0.28
    const cx = s.shipX + shipW / 2
    // 우주선 몸체
    ctx.strokeStyle = '#5b8cff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(s.shipX, sy - 26, shipW, clockH + 60, 14)
    ctx.stroke()
    ctx.fillStyle = '#5b8cff'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🚀', s.shipX + shipW - 18, sy - 8)

    drawClock(cx, sy, s.shipT / TICK_PERIOD, '우주선의 빛 시계', '#4ade80')

    // 광자의 지그재그 궤적 (우리 눈에 보이는 실제 경로)
    const f = (s.shipT / TICK_PERIOD) % 1
    const yy = f < 0.5 ? f * 2 : (1 - f) * 2
    trailRef.current.push({ x: cx, y: sy + yy * clockH })
    if (trailRef.current.length > 220) trailRef.current.shift()
    ctx.strokeStyle = 'rgba(74,222,128,0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    trailRef.current.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y)
      else if (Math.abs(pt.x - trailRef.current[i - 1].x) < 60) ctx.lineTo(pt.x, pt.y)
      else ctx.moveTo(pt.x, pt.y) // 우주선이 화면을 넘어간 지점은 잇지 않는다
    })
    ctx.stroke()

    // 시간 표시
    ctx.font = 'bold 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffb454'
    ctx.fillText(`${s.earthT.toFixed(1)}초`, ex, h - 30)
    ctx.fillStyle = '#4ade80'
    ctx.fillText(`${s.shipT.toFixed(1)}초`, w * 0.6, h - 30)
    ctx.fillStyle = '#93a0c4'
    ctx.font = '12px sans-serif'
    ctx.fillText('지구에서 흐른 시간', ex, h - 12)
    ctx.fillText('우주선에서 흐른 시간', w * 0.6, h - 12)
  })

  return (
    <div className="sim-page">
      <h2>⏱️ 시간 지연 (특수 상대성이론)</h2>
      <p className="law">
        빛의 속도는 <b>누가 봐도 똑같다</b>는 사실 하나에서 놀라운 결론이 나옵니다. 우주선 안의
        빛 시계는 광자가 위아래로 튕기지만, 밖에서 보면 광자가 <b>대각선</b>으로 더 먼 거리를
        가야 해요. 빛의 속도는 같은데 거리가 머니까 — <b>움직이는 시계는 느리게 갑니다</b>.
        시간 그 자체가 관점에 따라 다르게 흐르는 겁니다.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider
          name="우주선 속도 v/c"
          min={0}
          max={0.99}
          step={0.01}
          value={beta}
          onChange={setBeta}
          format={(v) => v.toFixed(2)}
        />
        <button className="btn" onClick={reset}>
          시계 동시에 0으로
        </button>
      </div>
      <div className="readouts">
        <Readout label="γ (감마) = 1/√(1−v²/c²)" value={gamma.toFixed(2)} unit="배" />
        <Readout label="우주선 1초 = 지구" value={gamma.toFixed(2)} unit="초" />
      </div>
      <p className="hint">
        💡 0.99c에서 γ≈7 — 우주선의 1년이 지구의 7년입니다. GPS 위성은 이 효과(+중력 효과)를
        보정하지 않으면 하루에 수 km씩 오차가 나요. 상대성이론은 매일 당신의 내비게이션 속에서
        작동 중입니다.
      </p>
    </div>
  )
}
