import { useEffect, useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

// 1차원 슈뢰딩거 방정식을 실시간 수치적분한다 (ħ=1, m=1, dx=1)
// ψ = R + iI 로 나눠 번갈아 갱신하는 leapfrog(Visscher) 방식
const N = 560 // 격자 수
const DT = 0.08 // 시간 간격 (dx=1 기준 안정 범위)
const STEPS_PER_FRAME = 55
const X0 = 130 // 파동 묶음 시작 위치
const SIGMA = 26 // 파동 묶음 폭

export default function Tunneling() {
  const [v0, setV0] = useState(1.0) // 장벽 높이 (에너지 단위)
  const [width, setWidth] = useState(14) // 장벽 두께 (격자 수)
  const [k0, setK0] = useState(1.2) // 초기 운동량 → E = k²/2
  const [live, setLive] = useState({ left: 0, right: 0, inside: 0 })

  const R = useRef(new Float64Array(N))
  const I = useRef(new Float64Array(N))
  const V = useRef(new Float64Array(N))
  const running = useRef(false)
  const paramsRef = useRef({ v0, width })
  paramsRef.current = { v0, width }

  const E = (k0 * k0) / 2
  const barrierStart = Math.floor(N / 2)

  const buildPotential = () => {
    const p = paramsRef.current
    V.current.fill(0)
    for (let i = barrierStart; i < barrierStart + p.width; i++) {
      V.current[i] = p.v0
    }
  }

  const launch = () => {
    buildPotential()
    // 가우시안 파동 묶음 × 평면파 (오른쪽으로 이동)
    for (let i = 0; i < N; i++) {
      const g = Math.exp(-((i - X0) ** 2) / (2 * SIGMA * SIGMA))
      R.current[i] = g * Math.cos(k0 * i)
      I.current[i] = g * Math.sin(k0 * i)
    }
    // 정규화
    let norm = 0
    for (let i = 0; i < N; i++) norm += R.current[i] ** 2 + I.current[i] ** 2
    const s = 1 / Math.sqrt(norm)
    for (let i = 0; i < N; i++) {
      R.current[i] *= s
      I.current[i] *= s
    }
    running.current = true
  }

  const stop = () => {
    running.current = false
    R.current.fill(0)
    I.current.fill(0)
    buildPotential()
    setLive({ left: 0, right: 0, inside: 0 })
  }

  // 장벽 조건이 바뀌면 재발사 준비
  useEffect(() => {
    stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v0, width, k0])

  const canvasRef = useAnimationCanvas((ctx, { w, h }, _dt) => {
    const p = paramsRef.current
    const r = R.current
    const im = I.current
    const v = V.current

    if (running.current) {
      for (let s = 0; s < STEPS_PER_FRAME; s++) {
        // R += dt·(−½∇²I + V·I)
        for (let i = 1; i < N - 1; i++) {
          const lap = im[i - 1] - 2 * im[i] + im[i + 1]
          r[i] += DT * (-0.5 * lap + v[i] * im[i])
        }
        // I −= dt·(−½∇²R + V·R)
        for (let i = 1; i < N - 1; i++) {
          const lap = r[i - 1] - 2 * r[i] + r[i + 1]
          im[i] -= DT * (-0.5 * lap + v[i] * r[i])
        }
      }
    }

    // 확률 분포와 영역별 확률
    let pLeft = 0
    let pRight = 0
    let pIn = 0
    const prob = new Float64Array(N)
    for (let i = 0; i < N; i++) {
      prob[i] = r[i] ** 2 + im[i] ** 2
      if (i < barrierStart) pLeft += prob[i]
      else if (i < barrierStart + p.width) pIn += prob[i]
      else pRight += prob[i]
    }
    const total = pLeft + pIn + pRight
    if (running.current && total > 1e-12) {
      setLive((prev) => {
        const nl = pLeft / total
        const nr = pRight / total
        if (Math.abs(prev.left - nl) < 0.005 && Math.abs(prev.right - nr) < 0.005) return prev
        return { left: nl, right: nr, inside: pIn / total }
      })
    }

    // ---- 그리기 ----
    const baseY = h - 70
    const xScale = w / N
    const eScale = 120 // 에너지 → px

    ctx.clearRect(0, 0, w, h)

    // 장벽
    const bx = barrierStart * xScale
    const bw = p.width * xScale
    const bh = p.v0 * eScale
    ctx.fillStyle = '#2a3355'
    ctx.fillRect(bx, baseY - bh, bw, bh)
    ctx.fillStyle = '#93a0c4'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`장벽 V₀`, bx + bw / 2, baseY - bh - 8)

    // 입자 에너지 기준선
    const eY = baseY - E * eScale
    ctx.strokeStyle = '#4ade80'
    ctx.setLineDash([6, 6])
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, eY)
    ctx.lineTo(w, eY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#4ade80'
    ctx.textAlign = 'left'
    ctx.fillText(`입자 에너지 E = ${E.toFixed(2)}`, 12, eY - 8)

    // 바닥선
    ctx.strokeStyle = '#2a3355'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, baseY)
    ctx.lineTo(w, baseY)
    ctx.stroke()

    // |ψ|² — 장벽 왼쪽은 파랑, 오른쪽(터널링 성공)은 초록
    // 정규화된 분포의 피크(≈1/σ√2π)가 화면의 ~1/3 높이가 되도록
    const probScale = h * 22
    const drawRegion = (from: number, to: number, color: string, fill: string) => {
      ctx.beginPath()
      ctx.moveTo(from * xScale, baseY)
      for (let i = from; i < to; i++) {
        ctx.lineTo(i * xScale, baseY - Math.min(prob[i] * probScale, baseY - 10))
      }
      ctx.lineTo((to - 1) * xScale, baseY)
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    drawRegion(0, barrierStart + 1, '#5b8cff', 'rgba(91,140,255,0.3)')
    drawRegion(barrierStart, barrierStart + p.width + 1, '#f472b6', 'rgba(244,114,182,0.3)')
    drawRegion(barrierStart + p.width, N, '#4ade80', 'rgba(74,222,128,0.35)')

    if (!running.current) {
      ctx.fillStyle = '#93a0c4'
      ctx.font = 'bold 15px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('▶ "파동 묶음 발사"를 눌러 시작하세요', w / 2, h * 0.3)
    }
  })

  const ratio = E / v0

  return (
    <div className="sim-page">
      <h2>🧱 양자 터널링</h2>
      <p className="law">
        고전역학에서는 에너지가 부족하면(E &lt; V₀) 벽을 <b>절대</b> 넘을 수 없습니다. 하지만
        양자 입자의 파동함수는 장벽 안에서 지수적으로 줄어들 뿐 0이 되지 않아서, <b>일부가
        반대편으로 새어 나갑니다</b>. 이것이 터널링 — 태양이 빛나는 이유(수소핵 융합)이자
        플래시 메모리가 작동하는 원리입니다. 이 화면은 슈뢰딩거 방정식을 실시간으로 풀고
        있어요.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider
          name="장벽 높이 V₀"
          min={0.3}
          max={2}
          step={0.05}
          value={v0}
          onChange={setV0}
          format={(v) => v.toFixed(2)}
        />
        <Slider name="장벽 두께" min={6} max={30} value={width} onChange={setWidth} />
        <Slider
          name="입자 운동량 k₀"
          min={0.6}
          max={1.6}
          step={0.05}
          value={k0}
          onChange={setK0}
          format={(v) => v.toFixed(2)}
        />
        <button className="btn" onClick={launch}>
          파동 묶음 발사
        </button>
        <button className="btn secondary" onClick={stop}>
          리셋
        </button>
      </div>
      <div className="readouts">
        <Readout label="E / V₀" value={ratio.toFixed(2)} />
        <Readout label="반사됨 (왼쪽)" value={(live.left * 100).toFixed(1)} unit="%" />
        <Readout label="터널링 성공 (오른쪽)" value={(live.right * 100).toFixed(1)} unit="%" />
      </div>
      <p className="hint">
        💡 E/V₀ &lt; 1인데도 초록 영역(통과)이 생기는 게 터널링입니다. 장벽을 얇게 하거나 높이를
        낮추면 투과율이 급격히 올라가요. 화면 끝에 닿으면 반사되어 돌아오니 그 전에 리셋하세요.
      </p>
    </div>
  )
}
