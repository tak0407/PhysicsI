import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

interface Charge {
  id: number
  nx: number
  ny: number
  q: number
}

interface Probe {
  x: number
  y: number
  vx: number
  vy: number
  trail: { x: number; y: number }[]
}

type ToolMode = 'positive' | 'negative' | 'erase' | 'probe'

const FIELD_K = 180000
const SOFTENING = 24
const PROBE_ACCEL = 75
const MAX_MOTION_FIELD = 7
const MAX_CHARGES = 36
const SHIELD_WIDTH = 16

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function shieldRadius(w: number, h: number) {
  return Math.min(w, h) * 0.26
}

function inShieldCavity(x: number, y: number, w: number, h: number, shield: boolean) {
  if (!shield) return false
  return Math.hypot(x - w / 2, y - h / 2) < shieldRadius(w, h) - SHIELD_WIDTH
}

function sampleField(charges: Charge[], x: number, y: number, w: number, h: number, shield: boolean) {
  // 도체 차폐 내부에서는 자유전하가 재배치되어 정전기장이 0이 되는 이상적 결과를 쓴다
  if (inShieldCavity(x, y, w, h, shield)) return { ex: 0, ey: 0, v: 0 }

  let ex = 0
  let ey = 0
  let v = 0
  for (const c of charges) {
    const cx = c.nx * w
    const cy = c.ny * h
    const dx = x - cx
    const dy = y - cy
    const r2 = dx * dx + dy * dy + SOFTENING * SOFTENING
    const invR = 1 / Math.sqrt(r2)
    const invR3 = invR * invR * invR
    ex += FIELD_K * c.q * dx * invR3
    ey += FIELD_K * c.q * dy * invR3
    v += FIELD_K * c.q * invR
  }
  return { ex, ey, v }
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ux: number,
  uy: number,
  len: number,
) {
  const sx = x - ux * len * 0.5
  const sy = y - uy * len * 0.5
  const tx = x + ux * len * 0.5
  const ty = y + uy * len * 0.5
  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.lineTo(tx, ty)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(tx, ty)
  ctx.lineTo(tx - ux * 7 - uy * 4, ty - uy * 7 + ux * 4)
  ctx.lineTo(tx - ux * 7 + uy * 4, ty - uy * 7 - ux * 4)
  ctx.closePath()
  ctx.fill()
}

function formatCharge(q: number) {
  const abs = Math.abs(q)
  return Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(1)
}

const initialCharges: Charge[] = [
  { id: 1, nx: 0.42, ny: 0.5, q: 2 },
  { id: 2, nx: 0.58, ny: 0.5, q: -2 },
]

export default function ElectricField() {
  const [charges, setCharges] = useState<Charge[]>(initialCharges)
  const [mode, setMode] = useState<ToolMode>('positive')
  const [chargeSize, setChargeSize] = useState(2)
  const [shield, setShield] = useState(false)
  const [probePositive, setProbePositive] = useState(true)
  const [probeActive, setProbeActive] = useState(false)
  const [live, setLive] = useState({ field: 0, potential: 0, speed: 0, qSum: 0 })

  const chargesRef = useRef(charges)
  const paramsRef = useRef({ shield, probePositive, probeActive })
  const canvasSizeRef = useRef({ w: 800, h: 460 })
  const probeRef = useRef<Probe>({ x: 400, y: 230, vx: 0, vy: 0, trail: [] })
  const dragIdRef = useRef<number | null>(null)
  const nextIdRef = useRef(3)

  chargesRef.current = charges
  paramsRef.current = { shield, probePositive, probeActive }

  const makeCharge = (nx: number, ny: number, q: number): Charge => ({
    id: nextIdRef.current++,
    nx,
    ny,
    q,
  })

  const placeProbe = (x: number, y: number) => {
    probeRef.current = { x, y, vx: 0, vy: 0, trail: [] }
    setProbeActive(true)
  }

  const placeProbeCenter = () => {
    const { w, h } = canvasSizeRef.current
    placeProbe(w / 2, h / 2)
  }

  const presetDipole = () => {
    setShield(false)
    setCharges([makeCharge(0.42, 0.5, 2), makeCharge(0.58, 0.5, -2)])
    placeProbeCenter()
  }

  const presetPlates = () => {
    setShield(false)
    setCharges(
      Array.from({ length: 7 }, (_, i) => 0.2 + i * 0.1).flatMap((ny) => [
        makeCharge(0.28, ny, 1.2),
        makeCharge(0.72, ny, -1.2),
      ]),
    )
    placeProbeCenter()
  }

  const presetShield = () => {
    setShield(true)
    setCharges(
      Array.from({ length: 7 }, (_, i) => 0.2 + i * 0.1).flatMap((ny) => [
        makeCharge(0.17, ny, 1.5),
        makeCharge(0.83, ny, -1.5),
      ]),
    )
    placeProbeCenter()
  }

  const clearAll = () => {
    setCharges([])
    setShield(false)
    setProbeActive(false)
  }

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    canvasSizeRef.current = { w, h }
    const currentCharges = chargesRef.current
    const prm = paramsRef.current
    const probe = probeRef.current

    if (prm.probeActive) {
      const steps = 8
      const sub = dt / steps
      const probeQ = prm.probePositive ? 1 : -1
      for (let i = 0; i < steps; i++) {
        const field = sampleField(currentCharges, probe.x, probe.y, w, h, prm.shield)
        const mag = Math.hypot(field.ex, field.ey)
        const cap = mag > MAX_MOTION_FIELD ? MAX_MOTION_FIELD / mag : 1
        probe.vx += probeQ * field.ex * cap * PROBE_ACCEL * sub
        probe.vy += probeQ * field.ey * cap * PROBE_ACCEL * sub
        probe.x += probe.vx * sub
        probe.y += probe.vy * sub

        if (probe.x < 10) {
          probe.x = 10
          probe.vx = Math.abs(probe.vx) * 0.75
        }
        if (probe.x > w - 10) {
          probe.x = w - 10
          probe.vx = -Math.abs(probe.vx) * 0.75
        }
        if (probe.y < 10) {
          probe.y = 10
          probe.vy = Math.abs(probe.vy) * 0.75
        }
        if (probe.y > h - 10) {
          probe.y = h - 10
          probe.vy = -Math.abs(probe.vy) * 0.75
        }
      }
      probe.trail.push({ x: probe.x, y: probe.y })
      if (probe.trail.length > 360) probe.trail.shift()
    }

    ctx.clearRect(0, 0, w, h)

    const cell = w < 560 ? 28 : 24
    for (let y = cell / 2; y < h; y += cell) {
      for (let x = cell / 2; x < w; x += cell) {
        const field = sampleField(currentCharges, x, y, w, h, prm.shield)
        const tone = Math.tanh(field.v / 9000)
        const alpha = Math.min(0.34, Math.abs(tone) * 0.34)
        if (alpha < 0.01) continue
        ctx.fillStyle =
          tone > 0 ? `rgba(244,114,182,${alpha})` : `rgba(91,140,255,${alpha})`
        ctx.fillRect(x - cell / 2, y - cell / 2, cell + 1, cell + 1)
      }
    }

    const spacing = w < 560 ? 54 : 50
    for (let y = 34; y < h - 20; y += spacing) {
      for (let x = 34; x < w - 20; x += spacing) {
        const field = sampleField(currentCharges, x, y, w, h, prm.shield)
        const mag = Math.hypot(field.ex, field.ey)
        if (mag < 0.05) continue
        const ux = field.ex / mag
        const uy = field.ey / mag
        const len = Math.min(25, 5 + Math.sqrt(mag) * 6)
        const alpha = Math.min(0.9, 0.25 + mag * 0.08)
        ctx.strokeStyle = `rgba(232,236,248,${alpha})`
        ctx.fillStyle = `rgba(232,236,248,${alpha})`
        ctx.lineWidth = 1.4
        drawArrow(ctx, x, y, ux, uy, len)
      }
    }

    if (prm.shield) {
      const r = shieldRadius(w, h)
      ctx.fillStyle = 'rgba(11,16,32,0.45)'
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, r - SHIELD_WIDTH, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(147,160,196,0.78)'
      ctx.lineWidth = SHIELD_WIDTH
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 7])
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, r - SHIELD_WIDTH, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#e8ecf8'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('도체 내부 E≈0', w / 2, h / 2 + 4)
    }

    if (prm.probeActive) {
      ctx.strokeStyle = prm.probePositive ? 'rgba(255,180,84,0.72)' : 'rgba(125,211,252,0.72)'
      ctx.lineWidth = 2
      ctx.beginPath()
      probe.trail.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.stroke()

      ctx.fillStyle = prm.probePositive ? '#ffb454' : '#7dd3fc'
      ctx.beginPath()
      ctx.arc(probe.x, probe.y, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#0b1020'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(prm.probePositive ? '+' : '−', probe.x, probe.y + 3)
    }

    for (const c of currentCharges) {
      const x = c.nx * w
      const y = c.ny * h
      const r = 13 + Math.min(7, Math.abs(c.q) * 2)
      ctx.fillStyle = c.q > 0 ? '#f472b6' : '#5b8cff'
      ctx.strokeStyle = c.q > 0 ? '#f9a8d4' : '#93c5fd'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 17px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(c.q > 0 ? '+' : '−', x, y + 6)
      ctx.fillStyle = '#e8ecf8'
      ctx.font = '11px sans-serif'
      ctx.fillText(`${formatCharge(c.q)}q`, x, y + r + 13)
    }

    if (currentCharges.length === 0) {
      ctx.fillStyle = '#93a0c4'
      ctx.font = 'bold 15px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('＋ 또는 − 전하를 캔버스에 놓아보세요', w / 2, h / 2)
    }
  })

  useEffect(() => {
    const id = setInterval(() => {
      const { w, h } = canvasSizeRef.current
      const prm = paramsRef.current
      const probe = probeRef.current
      const x = prm.probeActive ? probe.x : w / 2
      const y = prm.probeActive ? probe.y : h / 2
      const field = sampleField(chargesRef.current, x, y, w, h, prm.shield)
      setLive({
        field: Math.hypot(field.ex, field.ey),
        potential: field.v,
        speed: prm.probeActive ? Math.hypot(probe.vx, probe.vy) : 0,
        qSum: chargesRef.current.reduce((sum, c) => sum + c.q, 0),
      })
    }, 120)
    return () => clearInterval(id)
  }, [])

  const pointFromEvent = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      w: rect.width,
      h: rect.height,
    }
  }

  const nearestCharge = (x: number, y: number, w: number, h: number) => {
    let best: Charge | null = null
    let bestD = 28
    for (const c of chargesRef.current) {
      const d = Math.hypot(x - c.nx * w, y - c.ny * h)
      if (d < bestD) {
        best = c
        bestD = d
      }
    }
    return best
  }

  const updateChargePosition = (id: number, x: number, y: number, w: number, h: number) => {
    setCharges((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              nx: clamp(x / w, 0.04, 0.96),
              ny: clamp(y / h, 0.07, 0.93),
            }
          : c,
      ),
    )
  }

  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const { x, y, w, h } = pointFromEvent(e)
    const near = nearestCharge(x, y, w, h)
    if (near) {
      if (mode === 'erase') {
        setCharges((prev) => prev.filter((c) => c.id !== near.id))
        return
      }
      dragIdRef.current = near.id
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    if (mode === 'erase') return
    if (mode === 'probe') {
      placeProbe(x, y)
      return
    }
    const q = (mode === 'positive' ? 1 : -1) * chargeSize
    setCharges((prev) =>
      [...prev, makeCharge(clamp(x / w, 0.04, 0.96), clamp(y / h, 0.07, 0.93), q)].slice(
        -MAX_CHARGES,
      ),
    )
  }

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const id = dragIdRef.current
    if (id == null) return
    e.preventDefault()
    const { x, y, w, h } = pointFromEvent(e)
    updateChargePosition(id, x, y, w, h)
  }

  const stopDragging = (e: PointerEvent<HTMLCanvasElement>) => {
    if (dragIdRef.current == null) return
    dragIdRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <div className="sim-page">
      <h2>⚡ 전기장 놀이터</h2>
      <p className="law">
        전하는 주변 공간에 <b>전기장</b>을 만듭니다. 양전하에서는 바깥쪽으로, 음전하에는
        안쪽으로 향하고, 여러 전하가 있으면 벡터처럼 더해집니다. 캔버스의 화살표는
        E = kq/r²의 방향과 세기를 보여주고, 시험 전하는 F = qE에 따라 실제로 움직입니다.
      </p>
      <canvas
        ref={canvasRef}
        className="sim-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onLostPointerCapture={stopDragging}
      />
      <div className="controls">
        <button className={mode === 'positive' ? 'btn' : 'btn secondary'} onClick={() => setMode('positive')}>
          ＋ 전하
        </button>
        <button className={mode === 'negative' ? 'btn' : 'btn secondary'} onClick={() => setMode('negative')}>
          − 전하
        </button>
        <button className={mode === 'probe' ? 'btn' : 'btn secondary'} onClick={() => setMode('probe')}>
          시험 전하 놓기
        </button>
        <button className={mode === 'erase' ? 'btn' : 'btn secondary'} onClick={() => setMode('erase')}>
          지우개
        </button>
        <Slider
          name="새 전하량 |q|"
          min={0.5}
          max={4}
          step={0.5}
          value={chargeSize}
          onChange={setChargeSize}
          format={(v) => v.toFixed(1)}
        />
        <button className="btn secondary" onClick={() => setProbePositive((p) => !p)}>
          시험 전하: {probePositive ? '＋' : '−'}
        </button>
        <button className={shield ? 'btn' : 'btn secondary'} onClick={() => setShield((s) => !s)}>
          도체 차폐
        </button>
        <button className="btn secondary" onClick={presetDipole}>
          쌍극자
        </button>
        <button className="btn secondary" onClick={presetPlates}>
          평행판
        </button>
        <button className="btn secondary" onClick={presetShield}>
          차폐 실험
        </button>
        <button className="btn secondary" onClick={clearAll}>
          모두 지우기
        </button>
      </div>
      <div className="readouts">
        <Readout label="측정점 |E|" value={live.field.toFixed(2)} unit="상대 단위" />
        <Readout label="전위 V = kΣq/r" value={(live.potential / 1000).toFixed(1)} />
        <Readout label="총 전하 Σq" value={live.qSum.toFixed(1)} unit="q" />
        <Readout label="시험 전하 속력" value={live.speed.toFixed(0)} unit="px/s" />
      </div>
      <p className="hint">
        💡 전하는 드래그해서 옮길 수 있습니다. 쌍극자는 곡선처럼 휘는 장을, 평행판은 거의
        균일한 장을, 차폐 실험은 도체 안쪽에서 전기장이 사라지는 모습을 보여줍니다.
      </p>
    </div>
  )
}
