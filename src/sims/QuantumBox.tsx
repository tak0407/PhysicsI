import { useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const MAX_N = 6

export default function QuantumBox() {
  const [n, setN] = useState(2)
  const [L, setL] = useState(1) // 상자 너비 (상대값)
  const [superpose, setSuperpose] = useState(false)
  const [speed, setSpeed] = useState(1)

  const tRef = useRef(0)
  const paramsRef = useRef({ n, L, superpose, speed })
  paramsRef.current = { n, L, superpose, speed }

  // E_n = n²π²ħ²/2mL² — E₁(L=1)을 1로 두는 단위
  const energy = (k: number, boxL: number) => (k * k) / (boxL * boxL)

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const p = paramsRef.current
    tRef.current += dt * p.speed * 2
    const t = tRef.current

    ctx.clearRect(0, 0, w, h)

    // ---- 에너지 사다리 (왼쪽) ----
    const ladderX = 46
    const ladderW = Math.min(120, w * 0.18)
    const ladderTop = 40
    const ladderBottom = h - 50
    const eMax = energy(MAX_N, p.L) * 1.08
    const eToY = (e: number) => ladderBottom - (e / eMax) * (ladderBottom - ladderTop)

    ctx.fillStyle = '#93a0c4'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('에너지 준위', ladderX + ladderW / 2, h - 14)

    for (let k = 1; k <= MAX_N; k++) {
      const y = eToY(energy(k, p.L))
      const active = k === p.n || (p.superpose && k === Math.min(p.n + 1, MAX_N))
      ctx.strokeStyle = active ? '#ffb454' : '#2a3355'
      ctx.lineWidth = active ? 3 : 2
      ctx.beginPath()
      ctx.moveTo(ladderX, y)
      ctx.lineTo(ladderX + ladderW, y)
      ctx.stroke()
      ctx.fillStyle = active ? '#ffb454' : '#93a0c4'
      ctx.textAlign = 'left'
      ctx.fillText(`n=${k}`, ladderX + ladderW + 8, y + 4)
    }

    // 준위 사이가 넓어지는 것 강조 (n² 간격)
    ctx.textAlign = 'center'

    // ---- 상자와 파동함수 (오른쪽) ----
    const boxLeft = ladderX + ladderW + 70
    const boxRight = w - 36
    const boxW = (boxRight - boxLeft) * (0.55 + 0.45 * p.L) // L 슬라이더로 폭 변화
    const bx0 = (boxLeft + boxRight - boxW) / 2
    const bx1 = bx0 + boxW
    const midY = h * 0.52
    const plotH = h * 0.3

    // 무한 벽
    ctx.strokeStyle = '#93a0c4'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(bx0, midY - plotH - 24)
    ctx.lineTo(bx0, midY + plotH * 0.5)
    ctx.moveTo(bx1, midY - plotH - 24)
    ctx.lineTo(bx1, midY + plotH * 0.5)
    ctx.stroke()
    ctx.strokeStyle = '#2a3355'
    ctx.beginPath()
    ctx.moveTo(bx0, midY + plotH * 0.5)
    ctx.lineTo(bx1, midY + plotH * 0.5)
    ctx.stroke()

    const nn = p.n
    const mm = Math.min(p.n + 1, MAX_N)
    const En = energy(nn, p.L)
    const Em = energy(mm, p.L)
    const S = 140 // 화면상 진폭

    const SAMPLES = 160
    // |ψ|² (확률 분포) — 정상 상태면 멈춰 있고, 중첩이면 출렁인다
    ctx.beginPath()
    ctx.moveTo(bx0, midY + plotH * 0.5)
    for (let i = 0; i <= SAMPLES; i++) {
      const xi = i / SAMPLES
      const pn = Math.sin(nn * Math.PI * xi)
      const pm = Math.sin(mm * Math.PI * xi)
      let prob: number
      if (p.superpose) {
        prob = 0.5 * pn * pn + 0.5 * pm * pm + pn * pm * Math.cos((Em - En) * t)
      } else {
        prob = pn * pn
      }
      ctx.lineTo(bx0 + xi * boxW, midY + plotH * 0.5 - (prob / 2.1) * S * 1.6)
    }
    ctx.lineTo(bx1, midY + plotH * 0.5)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255, 180, 84, 0.35)'
    ctx.fill()
    ctx.strokeStyle = '#ffb454'
    ctx.lineWidth = 2
    ctx.stroke()

    // 파동함수 실수부 (위쪽) — 정상 상태에서도 이렇게 진동하고 있다
    ctx.beginPath()
    for (let i = 0; i <= SAMPLES; i++) {
      const xi = i / SAMPLES
      const pn = Math.sin(nn * Math.PI * xi)
      const pm = Math.sin(mm * Math.PI * xi)
      let re: number
      if (p.superpose) {
        re = (pn * Math.cos(En * t) + pm * Math.cos(Em * t)) / Math.SQRT2
      } else {
        re = pn * Math.cos(En * t)
      }
      const x = bx0 + xi * boxW
      const y = midY - plotH - 24 + plotH / 2 - re * (plotH / 2.4)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = '#5b8cff'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#5b8cff'
    ctx.font = '11px sans-serif'
    ctx.fillText('파동함수 ψ (실수부)', (bx0 + bx1) / 2, midY - plotH - 34)
    ctx.fillStyle = '#ffb454'
    ctx.fillText('발견 확률 |ψ|²', (bx0 + bx1) / 2, midY + plotH * 0.5 + 20)
  })

  const nodes = superpose ? '—' : String(n - 1)

  return (
    <div className="sim-page">
      <h2>📦 상자 속 입자 (에너지 양자화)</h2>
      <p className="law">
        좁은 공간에 갇힌 입자는 <b>아무 에너지나 가질 수 없습니다</b>. 파동함수가 양쪽 벽에서
        0이 되어야 하므로 반파장이 정수 개 들어가는 모양만 허용되고, 에너지는{' '}
        <b>E ∝ n²</b>으로 띄엄띄엄해집니다(양자화). 두 상태를 <b>중첩</b>하면 확률 분포가
        출렁이며 움직이기 시작해요 — 이게 양자 세계에서 "움직임"이 만들어지는 방식입니다.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider name="양자수 n" min={1} max={MAX_N} value={n} onChange={setN} />
        <Slider
          name="상자 너비 L"
          min={0.6}
          max={1.4}
          step={0.05}
          value={L}
          onChange={setL}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          name="시간 속도"
          min={0.2}
          max={3}
          step={0.1}
          value={speed}
          onChange={setSpeed}
          format={(v) => v.toFixed(1)}
        />
        <button
          className={superpose ? 'btn' : 'btn secondary'}
          onClick={() => setSuperpose((s) => !s)}
        >
          {superpose ? `중첩 켜짐: n=${n} + n=${Math.min(n + 1, MAX_N)}` : '두 상태 중첩하기'}
        </button>
      </div>
      <div className="readouts">
        <Readout label="에너지 Eₙ = n²E₁/L²" value={(energy(n, L)).toFixed(2)} unit="E₁" />
        <Readout label="마디(node) 수" value={nodes} unit="개" />
      </div>
      <p className="hint">
        💡 n을 올리면 마디가 하나씩 늘고 에너지는 n²으로 뜁니다(1, 4, 9, 16…). 상자를 좁히면(L↓)
        모든 준위가 위로 밀려요 — 입자를 가둘수록 에너지가 커지는 게 양자 세계의 규칙입니다.
        중첩 상태의 확률이 좌우로 출렁이는 것도 꼭 보세요.
      </p>
    </div>
  )
}
