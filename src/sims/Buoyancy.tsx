import { useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const G = 9.8
const SCALE = 150 // px per meter
const SURFACE_FRAC = 0.35 // 수면의 세로 위치 (캔버스 높이 비율)

export default function Buoyancy() {
  const [rhoObj, setRhoObj] = useState(600) // 물체 밀도
  const [rhoFluid, setRhoFluid] = useState(1000) // 유체 밀도
  const [size, setSize] = useState(0.8) // 정육면체 한 변 (m)

  // y: 수면 기준 물체 중심 깊이(m, 아래가 +), v: 속도
  const stateRef = useRef({ y: -1.2, v: 0, dragging: false })
  const paramsRef = useRef({ rhoObj, rhoFluid, size })
  paramsRef.current = { rhoObj, rhoFluid, size }

  const floats = rhoObj < rhoFluid
  const submergedFrac = Math.min(rhoObj / rhoFluid, 1)

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const s = stateRef.current
    const p = paramsRef.current
    const surfaceY = h * SURFACE_FRAC
    const bottomY = h - 26
    const tankDepth = (bottomY - surfaceY) / SCALE // m
    const L = p.size
    const V = L ** 3
    const mass = p.rhoObj * V

    // 잠긴 높이와 부력
    const subH = Math.max(0, Math.min(s.y + L / 2, L))
    const vSub = L * L * subH
    const fBuoy = p.rhoFluid * G * vSub
    const fGrav = mass * G

    if (!s.dragging) {
      // 물속에서는 저항이 크고 공기 중에서는 거의 없다
      const dragC = subH > 0 ? 4.5 : 0.05
      const a = (fGrav - fBuoy) / mass - dragC * s.v
      s.v += a * dt
      s.y += s.v * dt
      const maxY = tankDepth - L / 2 // 바닥에 닿는 깊이
      if (s.y > maxY) {
        s.y = maxY
        s.v = 0
      }
      if (s.y < -2.2) {
        s.y = -2.2
        s.v = 0
      }
    }

    const cx = w / 2
    const cy = surfaceY + s.y * SCALE
    const sidePx = L * SCALE

    ctx.clearRect(0, 0, w, h)

    // 수조 벽
    ctx.strokeStyle = '#2a3355'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(40, surfaceY - 40)
    ctx.lineTo(40, bottomY)
    ctx.lineTo(w - 40, bottomY)
    ctx.lineTo(w - 40, surfaceY - 40)
    ctx.stroke()

    // 물
    ctx.fillStyle = 'rgba(59, 130, 246, 0.18)'
    ctx.fillRect(41.5, surfaceY, w - 83, bottomY - surfaceY - 1.5)
    ctx.strokeStyle = 'rgba(91, 140, 255, 0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(41.5, surfaceY)
    ctx.lineTo(w - 41.5, surfaceY)
    ctx.stroke()
    ctx.fillStyle = '#93a0c4'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`유체 밀도 ${p.rhoFluid} kg/m³`, 52, surfaceY + 18)

    // 물체
    ctx.fillStyle = floatsNow(p) ? '#ffb454' : '#93a0c4'
    ctx.beginPath()
    ctx.roundRect(cx - sidePx / 2, cy - sidePx / 2, sidePx, sidePx, 6)
    ctx.fill()
    ctx.fillStyle = '#0b1020'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${p.rhoObj} kg/m³`, cx, cy + 4)

    // 힘 화살표 (N 크기에 비례, 너무 길지 않게 축소)
    const fScale = 40 / Math.max(fGrav, 1)
    const arrow = (dy: number, mag: number, color: string, label: string, side: number) => {
      if (mag < 1) return
      const len = Math.min(mag * fScale, 110)
      const ax = cx + side * (sidePx / 2 + 26)
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(ax, cy)
      ctx.lineTo(ax, cy + dy * len)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ax, cy + dy * (len + 8))
      ctx.lineTo(ax - 5, cy + dy * len)
      ctx.lineTo(ax + 5, cy + dy * len)
      ctx.closePath()
      ctx.fill()
      ctx.font = '11px sans-serif'
      ctx.fillText(label, ax, cy + dy * (len + 22))
    }
    arrow(1, fGrav, '#f472b6', `중력 ${fGrav.toFixed(0)}N`, -1)
    arrow(-1, fBuoy, '#4ade80', `부력 ${fBuoy.toFixed(0)}N`, 1)

    // 잠긴 비율 표시
    if (subH > 0.01 && subH < L - 0.01 && Math.abs(s.v) < 0.05) {
      ctx.fillStyle = '#e8ecf8'
      ctx.font = 'bold 13px sans-serif'
      ctx.fillText(`${((subH / L) * 100).toFixed(0)}% 잠김`, cx, cy - sidePx / 2 - 12)
    }
  })

  const floatsNow = (p: { rhoObj: number; rhoFluid: number }) => p.rhoObj < p.rhoFluid

  const setFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const surfaceY = rect.height * SURFACE_FRAC
    stateRef.current.y = (e.clientY - rect.top - surfaceY) / SCALE
    stateRef.current.v = 0
  }

  return (
    <div className="sim-page">
      <h2>🌊 부력 (아르키메데스 원리)</h2>
      <p className="law">
        물에 잠긴 물체는 <b>밀어낸 유체의 무게만큼 위로 뜨는 힘</b>(부력 = ρ유체·g·V잠긴부피)을
        받습니다. 물체 밀도가 유체보다 작으면 뜨고, 크면 가라앉아요. 떠 있을 때 잠기는 비율은
        정확히 <b>밀도비(ρ물체/ρ유체)</b>입니다 — 밀도 600이면 60%가 잠깁니다. 빙산의 90%가
        물속에 있는 이유죠(얼음 917/바닷물 1025).
      </p>
      <canvas
        ref={canvasRef}
        className="sim-canvas"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          stateRef.current.dragging = true
          setFromPointer(e)
        }}
        onPointerMove={(e) => {
          if (stateRef.current.dragging) setFromPointer(e)
        }}
        onPointerUp={() => {
          stateRef.current.dragging = false
        }}
      />
      <div className="controls">
        <Slider
          name="물체 밀도"
          unit="kg/m³"
          min={100}
          max={2000}
          step={50}
          value={rhoObj}
          onChange={setRhoObj}
        />
        <Slider
          name="유체 밀도"
          unit="kg/m³"
          min={600}
          max={1600}
          step={25}
          value={rhoFluid}
          onChange={setRhoFluid}
        />
        <Slider
          name="물체 크기"
          unit="m"
          min={0.4}
          max={1.2}
          step={0.1}
          value={size}
          onChange={setSize}
          format={(v) => v.toFixed(1)}
        />
        <button
          className="btn"
          onClick={() => {
            stateRef.current.y = -1.2
            stateRef.current.v = 0
          }}
        >
          공중에서 떨어뜨리기
        </button>
      </div>
      <div className="readouts">
        <Readout
          label="예상 결과"
          value={floats ? `뜸 (${(submergedFrac * 100).toFixed(0)}% 잠김)` : '가라앉음'}
        />
        <Readout label="밀도비 ρ물체/ρ유체" value={(rhoObj / rhoFluid).toFixed(2)} />
      </div>
      <p className="hint">
        💡 나무 ≈ 600, 얼음 ≈ 917, 물 = 1000, 콘크리트 ≈ 2400. 물체를 드래그해서 물속 깊이
        눌렀다 놓으면 통통 튀어오르는 것도 볼 수 있어요. 유체 밀도를 1600(사해 수준 이상)으로
        올리면 돌도 뜹니다.
      </p>
    </div>
  )
}
