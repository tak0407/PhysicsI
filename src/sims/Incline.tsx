import { useEffect, useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const G = 9.8
const SLOPE_LEN = 10 // 빗면 길이 (m)

export default function Incline() {
  const [thetaDeg, setThetaDeg] = useState(15)
  const [mus, setMus] = useState(0.5)
  const [muk, setMuk] = useState(0.3)
  const [m, setM] = useState(3)
  const [live, setLive] = useState({ sliding: false, friction: 0, accel: 0 })

  // s: 빗면 꼭대기에서 잰 거리(m), v: 빗면 방향 속도(m/s)
  const stateRef = useRef({ s: 1.5, v: 0 })
  const paramsRef = useRef({ thetaDeg, mus, muk, m })
  paramsRef.current = { thetaDeg, mus, muk, m }

  const theta = (thetaDeg * Math.PI) / 180
  const criticalDeg = (Math.atan(mus) * 180) / Math.PI

  const reset = () => {
    stateRef.current.s = 1.5
    stateRef.current.v = 0
  }

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const st = stateRef.current
    const p = paramsRef.current
    const th = (p.thetaDeg * Math.PI) / 180
    const sinT = Math.sin(th)
    const cosT = Math.cos(th)

    // --- 물리 ---
    const gravAlong = p.m * G * sinT // 빗면 방향 중력 성분
    const normal = p.m * G * cosT
    let sliding = st.v > 0

    // 정지 상태: 정지 마찰이 버틸 수 있는지 검사
    if (!sliding && Math.tan(th) > p.mus && st.s < SLOPE_LEN) {
      sliding = true
    }
    if (sliding) {
      const accel = (gravAlong - p.muk * normal) / p.m
      st.v += accel * dt
      if (st.v < 0) {
        st.v = 0 // 운동 마찰이 더 커서 멈춤
        sliding = false
      }
      st.s += st.v * dt
      if (st.s >= SLOPE_LEN) {
        st.s = SLOPE_LEN
        st.v = 0
        sliding = false
      }
    }

    // --- 기하 ---
    const baseRight = w - 60
    const groundY = h - 50
    const slopePx = Math.min(w - 140, 620)
    const scale = slopePx / SLOPE_LEN
    const topX = baseRight - slopePx * cosT
    const topY = groundY - slopePx * sinT

    ctx.clearRect(0, 0, w, h)

    // 바닥
    ctx.strokeStyle = '#2a3355'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, groundY)
    ctx.lineTo(w, groundY)
    ctx.stroke()

    // 경사면 삼각형
    ctx.fillStyle = '#1b2340'
    ctx.strokeStyle = '#2a3355'
    ctx.beginPath()
    ctx.moveTo(topX, topY)
    ctx.lineTo(baseRight, groundY)
    ctx.lineTo(topX, groundY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // 각도 호와 라벨
    ctx.strokeStyle = '#93a0c4'
    ctx.beginPath()
    ctx.arc(baseRight, groundY, 44, Math.PI, Math.PI + th)
    ctx.stroke()
    ctx.fillStyle = '#93a0c4'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(
      `${p.thetaDeg}°`,
      baseRight - 62 * Math.cos(th / 2),
      groundY - 62 * Math.sin(th / 2) + 4,
    )

    // 블록 (빗면 위, s만큼 내려온 위치)
    const cx = topX + st.s * scale * cosT
    const cy = topY + st.s * scale * sinT
    const side = 30 + p.m * 2.5

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(th)
    ctx.fillStyle = sliding ? '#f472b6' : '#5b8cff'
    ctx.beginPath()
    ctx.roundRect(-side / 2, -side, side, side, 6)
    ctx.fill()
    ctx.fillStyle = '#0b1020'
    ctx.font = 'bold 12px sans-serif'
    ctx.fillText(`${p.m}kg`, 0, -side / 2 + 4)
    ctx.restore()

    // 블록 중심 (화살표 시작점)
    const bx = cx + (side / 2) * sinT
    const by = cy - (side / 2) * cosT

    // 힘 화살표
    const arrow = (dx: number, dy: number, mag: number, color: string, label: string) => {
      if (mag < 0.5) return
      const len = mag * 2.2
      const ex = bx + dx * len
      const ey = by + dy * len
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(ex, ey)
      ctx.stroke()
      const a = Math.atan2(dy, dx)
      ctx.beginPath()
      ctx.moveTo(ex + 8 * Math.cos(a), ey + 8 * Math.sin(a))
      ctx.lineTo(ex + 8 * Math.cos(a + 2.5), ey + 8 * Math.sin(a + 2.5))
      ctx.lineTo(ex + 8 * Math.cos(a - 2.5), ey + 8 * Math.sin(a - 2.5))
      ctx.closePath()
      ctx.fill()
      ctx.font = '11px sans-serif'
      ctx.fillText(label, ex + dx * 16, ey + dy * 16 + 4)
    }

    const fNow = sliding ? p.muk * normal : gravAlong
    arrow(0, 1, p.m * G, '#ffb454', `중력 ${(p.m * G).toFixed(0)}N`)
    arrow(sinT, -cosT, normal, '#5b8cff', `수직항력 ${normal.toFixed(0)}N`)
    arrow(-cosT, -sinT, fNow, '#4ade80', `마찰력 ${fNow.toFixed(0)}N`)

    // 상태 배지
    ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'left'
    if (st.s >= SLOPE_LEN) {
      ctx.fillStyle = '#93a0c4'
      ctx.fillText('바닥 도착', 20, 34)
    } else if (sliding) {
      ctx.fillStyle = '#f472b6'
      ctx.fillText('미끄러지는 중! (운동 마찰)', 20, 34)
    } else {
      ctx.fillStyle = '#4ade80'
      ctx.fillText('정지 (정지 마찰이 버티는 중)', 20, 34)
    }
  })

  // readout용 상태를 주기적으로 갱신
  useEffect(() => {
    const id = setInterval(() => {
      const p = paramsRef.current
      const th = (p.thetaDeg * Math.PI) / 180
      const sliding = stateRef.current.v > 0
      const normal = p.m * G * Math.cos(th)
      const gravAlong = p.m * G * Math.sin(th)
      setLive({
        sliding,
        friction: sliding ? p.muk * normal : gravAlong,
        accel: sliding ? (gravAlong - p.muk * normal) / p.m : 0,
      })
    }, 120)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="sim-page">
      <h2>⛰️ 경사면과 마찰</h2>
      <p className="law">
        경사면 위의 물체는 빗면 방향 중력(<b>mg sinθ</b>)이 <b>최대 정지 마찰력(μ·mg cosθ)</b>
        보다 커지는 순간 미끄러집니다. 그 임계각은 질량과 무관하게 <b>tanθ = μ</b>로 정해져요.
        각도를 천천히 올려서 블록이 언제 미끄러지는지 찾아보세요 — 아래 임계각과 일치할 겁니다.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider name="경사각 θ" unit="°" min={0} max={45} value={thetaDeg} onChange={setThetaDeg} />
        <Slider
          name="정지 마찰 계수 μs"
          min={0.1}
          max={1}
          step={0.05}
          value={mus}
          onChange={setMus}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          name="운동 마찰 계수 μk"
          min={0}
          max={1}
          step={0.05}
          value={muk}
          onChange={setMuk}
          format={(v) => v.toFixed(2)}
        />
        <Slider name="질량 m" unit="kg" min={1} max={10} value={m} onChange={setM} />
        <button className="btn" onClick={reset}>
          블록 다시 올리기
        </button>
      </div>
      <div className="readouts">
        <Readout label="미끄러지는 임계각 tan⁻¹(μs)" value={criticalDeg.toFixed(1)} unit="°" />
        <Readout label="빗면 방향 중력 mg sinθ" value={(m * G * Math.sin(theta)).toFixed(1)} unit="N" />
        <Readout label="현재 마찰력" value={live.friction.toFixed(1)} unit="N" />
        <Readout label="가속도" value={live.accel.toFixed(2)} unit="m/s²" />
      </div>
      <p className="hint">
        💡 질량을 바꿔도 임계각은 그대로입니다 — 무거운 물체도 가벼운 물체와 같은 각도에서
        미끄러져요. 보통 μk &lt; μs라서 한번 미끄러지면 계속 가속합니다.
      </p>
    </div>
  )
}
