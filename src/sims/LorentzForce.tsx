import { useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const MASS = 1

export default function LorentzForce() {
  const [bField, setBField] = useState(1.5) // 자기장 세기 (화면 밖으로 나오는 방향)
  const [speed, setSpeed] = useState(120) // 초기 속력 (px/s)
  const [positive, setPositive] = useState(true)

  const pRef = useRef<{ x: number; y: number; vx: number; vy: number; trail: { x: number; y: number }[] } | null>(null)
  const paramsRef = useRef({ bField, positive })
  paramsRef.current = { bField, positive }

  const radius = (MASS * speed) / (Math.abs(bField) || 1e-9) // r = mv/qB (q=1)

  const launch = (w: number) => {
    pRef.current = { x: w * 0.2, y: 0, vx: speed, vy: 0, trail: [] }
  }

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const prm = paramsRef.current
    const p = pRef.current
    if (p && p.y === 0 && p.trail.length === 0) p.y = h / 2 // 첫 프레임에 세로 중앙 배치

    if (p) {
      // 자기력은 속도에 수직 → 속력 불변. 매 스텝 속도 벡터를 ω·dt만큼 회전 (에너지 보존 정확)
      const q = prm.positive ? 1 : -1
      const omega = (q * prm.bField) / MASS
      const steps = 8
      const sub = dt / steps
      for (let i = 0; i < steps; i++) {
        const a = omega * sub
        const cos = Math.cos(a)
        const sin = Math.sin(a)
        const nvx = p.vx * cos + p.vy * sin
        const nvy = -p.vx * sin + p.vy * cos
        p.vx = nvx
        p.vy = nvy
        p.x += p.vx * sub
        p.y += p.vy * sub
      }
      p.trail.push({ x: p.x, y: p.y })
      if (p.trail.length > 1500) p.trail.shift()
    }

    ctx.clearRect(0, 0, w, h)

    // 자기장 표시: 화면 밖으로 나오는 방향 ⊙ 격자
    ctx.fillStyle = 'rgba(147,160,196,0.35)'
    ctx.strokeStyle = 'rgba(147,160,196,0.35)'
    ctx.font = '10px sans-serif'
    for (let gx = 40; gx < w; gx += 70) {
      for (let gy = 40; gy < h; gy += 70) {
        ctx.beginPath()
        ctx.arc(gx, gy, 6, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(gx, gy, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.fillStyle = '#93a0c4'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('⊙ = 자기장이 화면 밖으로 나오는 방향', 14, h - 12)

    if (p) {
      // 궤적
      ctx.strokeStyle = prm.positive ? 'rgba(91,140,255,0.7)' : 'rgba(244,114,182,0.7)'
      ctx.lineWidth = 2
      ctx.beginPath()
      p.trail.forEach((t, i) => (i === 0 ? ctx.moveTo(t.x, t.y) : ctx.lineTo(t.x, t.y)))
      ctx.stroke()

      // 입자와 힘 화살표 (F = qv×B, 항상 원 중심 방향)
      ctx.fillStyle = prm.positive ? '#5b8cff' : '#f472b6'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(prm.positive ? '+' : '−', p.x, p.y + 4)

      const sp = Math.hypot(p.vx, p.vy) || 1
      const q = prm.positive ? 1 : -1
      // 힘 방향 = 속도를 -90°(q>0, B>0) 회전
      const fx = (q * p.vy) / sp
      const fy = (-q * p.vx) / sp
      ctx.strokeStyle = '#ffb454'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + fx * 34, p.y + fy * 34)
      ctx.stroke()
      ctx.fillStyle = '#ffb454'
      ctx.font = '11px sans-serif'
      ctx.fillText('F', p.x + fx * 46, p.y + fy * 46 + 4)
    } else {
      ctx.fillStyle = '#93a0c4'
      ctx.font = 'bold 15px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('▶ "입자 발사"를 누르세요', w / 2, h / 2)
    }
  })

  return (
    <div className="sim-page">
      <h2>🧲 자기장 속 하전입자 (로렌츠 힘)</h2>
      <p className="law">
        자기장은 움직이는 전하에 <b>속도와 수직인 힘</b>(F = qv×B)을 줍니다. 수직이라
        속력은 안 변하고 방향만 계속 꺾여서 — 입자는 <b>원</b>을 그립니다. 반지름은
        r = mv/qB. 전하 부호를 바꾸면 반대로 돌아요. 입자가속기(사이클로트론), 오로라,
        브라운관 TV가 모두 이 힘으로 작동합니다.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider name="자기장 세기 B" min={0.4} max={4} step={0.1} value={bField} onChange={setBField} format={(v) => v.toFixed(1)} />
        <Slider name="초기 속력 v" unit="px/s" min={40} max={260} step={10} value={speed} onChange={setSpeed} />
        <button className={positive ? 'btn' : 'btn secondary'} onClick={() => setPositive((s) => !s)}>
          전하: {positive ? '＋ 양전하' : '− 음전하'}
        </button>
        <button
          className="btn"
          onClick={() => launch(document.querySelector('.sim-canvas')?.clientWidth ?? 800)}
        >
          입자 발사
        </button>
        <button className="btn secondary" onClick={() => (pRef.current = null)}>
          지우기
        </button>
      </div>
      <div className="readouts">
        <Readout label="회전 반지름 r = mv/qB" value={radius.toFixed(0)} unit="px" />
      </div>
      <p className="hint">
        💡 B를 키우면 원이 작아지고(r∝1/B), 속력을 키우면 커집니다(r∝v). 도는 중에
        슬라이더를 움직이면 궤적이 실시간으로 휘는 걸 볼 수 있어요. 속력이 변해도 한 바퀴
        도는 시간은 같다는 것(사이클로트론의 비밀)도 확인해 보세요.
      </p>
    </div>
  )
}
