import { useEffect, useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const MAX_DOTS = 24000
const BINS = 81

// u: 스크린 위 위치 (-1 ~ 1)
const sinc = (x: number) => (Math.abs(x) < 1e-9 ? 1 : Math.sin(x) / x)

function intensity(u: number, d: number, lambda: number, observed: boolean): number {
  const envelope = sinc(2.6 * u) ** 2 // 단일 슬릿 회절 봉투
  if (observed) {
    // 경로를 관측하면 간섭항이 사라지고 슬릿별 분포의 단순 합만 남는다
    const u0 = 0.045 * d + 0.06
    const w = 0.16
    return (
      Math.exp(-(((u - u0) / w) ** 2)) + Math.exp(-(((u + u0) / w) ** 2))
    )
  }
  const k = (10 * d) / lambda
  return Math.cos(k * u) ** 2 * envelope
}

// 기각 샘플링으로 확률분포 I(u)에서 착지 위치를 뽑는다
function sampleU(d: number, lambda: number, observed: boolean): number {
  for (let i = 0; i < 60; i++) {
    const u = Math.random() * 2 - 1
    if (Math.random() < intensity(u, d, lambda, observed)) return u
  }
  return 0
}

interface Tracer {
  t: number // 0(전자총) → 1(스크린)
  u: number
  slit: -1 | 1
}

export default function DoubleSlit() {
  const [d, setD] = useState(2) // 슬릿 간격 (임의 단위)
  const [lambda, setLambda] = useState(1) // 드브로이 파장
  const [rate, setRate] = useState(80) // 초당 전자 수
  const [observe, setObserve] = useState(false)
  const [count, setCount] = useState(0)

  const dotsRef = useRef<{ u: number; jx: number }[]>([])
  const binsRef = useRef<number[]>(new Array(BINS).fill(0))
  const tracersRef = useRef<Tracer[]>([])
  const spawnAcc = useRef(0)
  const paramsRef = useRef({ d, lambda, rate, observe })
  paramsRef.current = { d, lambda, rate, observe }

  const clear = () => {
    dotsRef.current = []
    binsRef.current = new Array(BINS).fill(0)
    tracersRef.current = []
    setCount(0)
  }

  // 물리 조건이 바뀌면 무늬가 섞이지 않게 스크린을 비운다
  useEffect(clear, [d, lambda, observe])

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const p = paramsRef.current
    const cy = h / 2
    const gunX = 34
    const barrierX = w * 0.34
    const stripX = w - 140 // 스크린(점 쌓이는 곳)
    const stripW = 26
    const histX = stripX + stripW + 12 // 히스토그램 영역
    const histW = w - histX - 14
    const halfH = h / 2 - 26
    const slitGapPx = 10 + p.d * 9 // 슬릿 중심 간격의 절반 (px)

    // --- 전자 생성 ---
    spawnAcc.current += p.rate * dt
    let born = 0
    while (spawnAcc.current >= 1) {
      spawnAcc.current -= 1
      const u = sampleU(p.d, p.lambda, p.observe)
      dotsRef.current.push({ u, jx: Math.random() })
      if (dotsRef.current.length > MAX_DOTS) dotsRef.current.shift()
      const bin = Math.min(BINS - 1, Math.floor(((u + 1) / 2) * BINS))
      binsRef.current[bin]++
      born++
      // 낮은 발사율에서만 날아가는 전자를 그려준다 (한 알씩!)
      if (p.rate <= 150 && tracersRef.current.length < 40) {
        tracersRef.current.push({ t: 0, u, slit: Math.random() < 0.5 ? -1 : 1 })
      }
    }
    if (born > 0) setCount((c) => c + born)

    ctx.clearRect(0, 0, w, h)

    // --- 전자총 ---
    ctx.fillStyle = '#2a3355'
    ctx.beginPath()
    ctx.roundRect(gunX - 22, cy - 16, 34, 32, 6)
    ctx.fill()
    ctx.fillStyle = '#5b8cff'
    ctx.beginPath()
    ctx.roundRect(gunX + 12, cy - 6, 10, 12, 3)
    ctx.fill()
    ctx.fillStyle = '#93a0c4'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('전자총', gunX - 4, cy + 34)

    // --- 이중슬릿 장벽 ---
    const slitH = 14
    ctx.fillStyle = '#2a3355'
    ctx.fillRect(barrierX - 4, 20, 8, cy - slitGapPx - slitH / 2 - 20)
    ctx.fillRect(
      barrierX - 4,
      cy - slitGapPx + slitH / 2,
      8,
      2 * slitGapPx - slitH,
    )
    ctx.fillRect(barrierX - 4, cy + slitGapPx + slitH / 2, 8, h - 20 - (cy + slitGapPx + slitH / 2))
    ctx.fillStyle = '#93a0c4'
    ctx.fillText('이중슬릿', barrierX, h - 6)

    // 관측 장치
    if (p.observe) {
      ctx.fillStyle = '#f472b6'
      ctx.font = '15px sans-serif'
      ctx.fillText('👁️', barrierX + 22, cy - slitGapPx + 5)
      ctx.fillText('👁️', barrierX + 22, cy + slitGapPx + 5)
    }

    // --- 날아가는 전자 ---
    for (const tr of tracersRef.current) {
      tr.t += dt * 3.2
      let x: number, y: number
      if (tr.t < 0.45) {
        // 전자총 → 슬릿
        const f = tr.t / 0.45
        x = gunX + 22 + (barrierX - gunX - 22) * f
        y = cy + (tr.slit * slitGapPx - 0) * f
      } else {
        // 슬릿 → 스크린 (실제로는 경로가 없다 — 시각적 연출일 뿐)
        const f = (tr.t - 0.45) / 0.55
        x = barrierX + (stripX - barrierX) * f
        y = cy + tr.slit * slitGapPx + (tr.u * halfH - tr.slit * slitGapPx) * f
      }
      ctx.globalAlpha = 0.9 - tr.t * 0.4
      ctx.fillStyle = '#22d3ee'
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    tracersRef.current = tracersRef.current.filter((tr) => tr.t < 1)

    // --- 스크린(점 축적) ---
    ctx.fillStyle = '#141a2e'
    ctx.fillRect(stripX, cy - halfH, stripW, halfH * 2)
    ctx.fillStyle = p.observe ? '#f9a8d4' : '#7dd3fc'
    for (const dot of dotsRef.current) {
      ctx.fillRect(stripX + 2 + dot.jx * (stripW - 4), cy + dot.u * halfH, 1.4, 1.4)
    }
    ctx.fillStyle = '#93a0c4'
    ctx.fillText('스크린', stripX + stripW / 2, h - 6)

    // --- 히스토그램 + 이론 곡선 ---
    const maxBin = Math.max(...binsRef.current, 1)
    ctx.fillStyle = p.observe ? 'rgba(244,114,182,0.5)' : 'rgba(91,140,255,0.5)'
    const binH = (halfH * 2) / BINS
    binsRef.current.forEach((c, i) => {
      const y = cy - halfH + i * binH
      ctx.fillRect(histX, y, (c / maxBin) * histW, binH - 0.5)
    })
    // 이론 곡선 (충분히 쌓였을 때)
    if (dotsRef.current.length > 300) {
      let maxI = 0
      for (let i = 0; i < BINS; i++) {
        maxI = Math.max(maxI, intensity(-1 + (2 * i) / (BINS - 1), p.d, p.lambda, p.observe))
      }
      ctx.strokeStyle = '#ffb454'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < BINS; i++) {
        const u = -1 + (2 * i) / (BINS - 1)
        const iv = intensity(u, p.d, p.lambda, p.observe) / maxI
        const x = histX + iv * histW
        const y = cy + u * halfH
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  })

  return (
    <div className="sim-page">
      <h2>⚛️ 이중슬릿 실험</h2>
      <p className="law">
        전자를 <b>한 번에 한 개씩</b> 쏘는데도, 점이 쌓이면 파동처럼 <b>간섭무늬</b>가
        나타납니다. 전자 하나가 두 슬릿을 "동시에" 지나가 자기 자신과 간섭한 것처럼요. 더
        이상한 건 — <b>어느 슬릿으로 지나갔는지 관측하는 순간</b> 간섭무늬가 사라지고 평범한 두
        줄만 남는다는 것. 이것이 양자역학이 세상에서 가장 유명한 실험인 이유입니다.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider
          name="슬릿 간격 d"
          min={1}
          max={4}
          step={0.25}
          value={d}
          onChange={setD}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          name="전자의 파장 λ"
          min={0.5}
          max={2}
          step={0.1}
          value={lambda}
          onChange={setLambda}
          format={(v) => v.toFixed(1)}
        />
        <Slider name="초당 전자 수" unit="개/s" min={5} max={600} step={5} value={rate} onChange={setRate} />
        <button
          className={observe ? 'btn' : 'btn secondary'}
          onClick={() => setObserve((o) => !o)}
        >
          {observe ? '👁️ 관측 중 (끄기)' : '👁️ 슬릿 관측하기'}
        </button>
        <button className="btn secondary" onClick={clear}>
          스크린 지우기
        </button>
      </div>
      <div className="readouts">
        <Readout label="쌓인 전자 수" value={count.toLocaleString()} unit="개" />
        <Readout label="현재 무늬" value={observe ? '두 줄 (입자처럼)' : '간섭무늬 (파동처럼)'} />
      </div>
      <p className="hint">
        💡 파장 λ를 키우거나 슬릿 간격 d를 좁히면 무늬가 넓어집니다(간격 ∝ λ/d). 관측을 켜고
        끄면서 무늬가 바뀌는 걸 꼭 비교해 보세요 — 물리 조건은 그대로인데 "지켜봤다"는 것만
        다릅니다.
      </p>
    </div>
  )
}
