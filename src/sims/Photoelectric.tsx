import { useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

// 진동수 f와 일함수 W는 eV 단위 (hf 값으로 바로 표기)
interface Photon {
  x: number
  y: number
  tx: number
  ty: number
  t: number
}

interface Electron {
  x: number
  y: number
  vx: number
  vy: number
}

// 진동수(광자 에너지 eV) → 색
function photonColor(e: number): string {
  if (e < 1.8) return '#ff6b6b' // 적외선~빨강
  if (e < 2.1) return '#ffa94d'
  if (e < 2.5) return '#ffd43b'
  if (e < 2.9) return '#69db7c'
  if (e < 3.3) return '#4dabf7'
  if (e < 3.8) return '#9775fa'
  return '#e5dbff' // 자외선
}

export default function Photoelectric() {
  const [energy, setEnergy] = useState(2.0) // 광자 에너지 hf (eV)
  const [intensity, setIntensity] = useState(60) // 초당 광자 수
  const [work, setWork] = useState(2.8) // 일함수 (eV)

  const photons = useRef<Photon[]>([])
  const electrons = useRef<Electron[]>([])
  const spawnAcc = useRef(0)
  const flashes = useRef<{ x: number; y: number; a: number }[]>([])
  const paramsRef = useRef({ energy, intensity, work })
  paramsRef.current = { energy, intensity, work }

  const ke = Math.max(0, energy - work)
  const emits = energy > work

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const p = paramsRef.current
    const plateX = w * 0.32
    const lampX = w * 0.06
    const lampY = h * 0.18

    // 광자 생성
    spawnAcc.current += p.intensity * dt
    while (spawnAcc.current >= 1) {
      spawnAcc.current -= 1
      const ty = h * 0.18 + Math.random() * h * 0.62
      photons.current.push({ x: lampX, y: lampY, tx: plateX, ty, t: 0 })
    }

    // 광자 이동 → 도착 시 전자 방출 여부 판정
    for (const ph of photons.current) {
      ph.t += dt * 1.6
      if (ph.t >= 1) {
        if (p.energy > p.work) {
          const speed = 60 + Math.sqrt(p.energy - p.work) * 130
          const ang = (Math.random() - 0.5) * 0.9
          electrons.current.push({
            x: ph.tx + 8,
            y: ph.ty,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
          })
        } else {
          flashes.current.push({ x: ph.tx, y: ph.ty, a: 0.8 })
        }
      }
    }
    photons.current = photons.current.filter((ph) => ph.t < 1)
    if (electrons.current.length > 400) electrons.current.splice(0, electrons.current.length - 400)

    for (const e of electrons.current) {
      e.x += e.vx * dt
      e.y += e.vy * dt
    }
    electrons.current = electrons.current.filter((e) => e.x < w + 20 && e.y > -20 && e.y < h + 20)
    for (const f of flashes.current) f.a -= dt * 2
    flashes.current = flashes.current.filter((f) => f.a > 0)

    ctx.clearRect(0, 0, w, h)

    // 램프
    ctx.font = '30px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🔦', lampX, lampY + 10)

    // 금속판
    ctx.fillStyle = '#2a3355'
    ctx.fillRect(plateX - 8, h * 0.12, 12, h * 0.74)
    ctx.fillStyle = '#93a0c4'
    ctx.font = '11px sans-serif'
    ctx.fillText('금속판', plateX - 2, h * 0.12 - 8)
    ctx.fillText(`일함수 W = ${p.work.toFixed(1)} eV`, plateX - 2, h * 0.9)

    // 광자 (램프→판, 물결 느낌으로 흔들며)
    const col = photonColor(p.energy)
    for (const ph of photons.current) {
      const x = lampX + (ph.tx - lampX) * ph.t
      const y = lampY + (ph.ty - lampY) * ph.t + Math.sin(ph.t * 26) * 4
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // 흡수 플래시 (전자 안 나올 때)
    for (const f of flashes.current) {
      ctx.fillStyle = `rgba(147,160,196,${f.a})`
      ctx.beginPath()
      ctx.arc(f.x, f.y, 5, 0, Math.PI * 2)
      ctx.fill()
    }

    // 전자
    ctx.fillStyle = '#4ade80'
    for (const e of electrons.current) {
      ctx.beginPath()
      ctx.arc(e.x, e.y, 3.2, 0, Math.PI * 2)
      ctx.fill()
    }

    // 상태 문구
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'left'
    if (p.energy > p.work) {
      ctx.fillStyle = '#4ade80'
      ctx.fillText(`전자 방출! 광자 하나가 전자 하나를 칩니다 (KE = ${(p.energy - p.work).toFixed(1)} eV)`, 14, 26)
    } else {
      ctx.fillStyle = '#f472b6'
      ctx.fillText('전자가 안 나옵니다 — 빛을 아무리 세게 비춰도!', 14, 26)
    }
  })

  return (
    <div className="sim-page">
      <h2>💡 광전 효과</h2>
      <p className="law">
        금속에 빛을 쬐면 전자가 튀어나오는데, 이상하게도 <b>빛의 세기가 아니라 색(진동수)</b>이
        중요합니다. 빨간빛은 아무리 강해도 전자가 안 나오고, 파란빛은 약해도 바로 나와요.
        아인슈타인의 답: 빛은 <b>E = hf 에너지를 가진 알갱이(광자)</b>이고, 광자 하나의
        에너지가 일함수 W를 넘어야만 전자를 칠 수 있다. 이 설명으로 그는 노벨상을 받았고,
        양자역학이 시작됐습니다.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider
          name="광자 에너지 hf (빛의 색)"
          unit="eV"
          min={1.2}
          max={4.5}
          step={0.1}
          value={energy}
          onChange={setEnergy}
          format={(v) => v.toFixed(1)}
        />
        <Slider name="빛의 세기" unit="광자/s" min={10} max={200} step={10} value={intensity} onChange={setIntensity} />
        <Slider
          name="금속의 일함수 W"
          unit="eV"
          min={1.5}
          max={4}
          step={0.1}
          value={work}
          onChange={setWork}
          format={(v) => v.toFixed(1)}
        />
      </div>
      <div className="readouts">
        <Readout label="광자 에너지 hf" value={energy.toFixed(1)} unit="eV" />
        <Readout label="전자 운동 에너지 hf − W" value={emits ? ke.toFixed(1) : '방출 없음'} unit={emits ? 'eV' : ''} />
      </div>
      <p className="hint">
        💡 문턱 아래에서 세기를 최대로 올려보세요 — 광자 수만 늘 뿐 전자는 안 나옵니다. 문턱을
        넘으면 세기는 전자 <b>개수</b>를, 진동수는 전자의 <b>속도</b>를 정합니다. 세슘 W≈1.9,
        아연 W≈3.6 eV.
      </p>
    </div>
  )
}
