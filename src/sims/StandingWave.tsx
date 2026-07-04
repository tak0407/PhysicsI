import { useEffect, useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const MAX_HARMONIC = 8
const BASE_F1 = 220 // L=1일 때 기본 진동수 (Hz)

interface AudioState {
  ctx: AudioContext
  master: GainNode
  oscillators: OscillatorNode[]
  gains: GainNode[]
}

function pluckAmp(n: number, pluck: number) {
  return Math.sin(n * Math.PI * pluck) / (n * n)
}

function harmonicAmps(selected: number, pluck: number, pure: boolean) {
  if (pure) {
    return Array.from({ length: MAX_HARMONIC }, (_, i) => (i + 1 === selected ? 1 : 0))
  }
  const raw = Array.from({ length: MAX_HARMONIC }, (_, i) => pluckAmp(i + 1, pluck))
  const max = Math.max(...raw.map(Math.abs), 1e-6)
  return raw.map((a) => a / max)
}

function harmonicName(n: number) {
  if (n === 1) return '기본음'
  return `${n}배음`
}

export default function StandingWave() {
  const [harmonic, setHarmonic] = useState(3)
  const [length, setLength] = useState(1)
  const [pluck, setPluck] = useState(0.32)
  const [pure, setPure] = useState(true)
  const [soundOn, setSoundOn] = useState(false)

  const tRef = useRef(0)
  const paramsRef = useRef({ harmonic, length, pluck, pure })
  const audioRef = useRef<AudioState | null>(null)
  paramsRef.current = { harmonic, length, pluck, pure }

  const f1 = BASE_F1 / length
  const selectedFreq = harmonic * f1
  const wavelength = (2 * length) / harmonic
  const nodeCount = harmonic - 1

  const closeAudio = (updateState = true) => {
    const audio = audioRef.current
    if (!audio) return
    audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.015)
    window.setTimeout(() => {
      audio.oscillators.forEach((osc) => osc.stop())
      audio.ctx.close()
    }, 80)
    audioRef.current = null
    if (updateState) setSoundOn(false)
  }

  const updateAudio = () => {
    const audio = audioRef.current
    if (!audio) return
    const p = paramsRef.current
    const now = audio.ctx.currentTime
    const amps = harmonicAmps(p.harmonic, p.pluck, p.pure)
    const base = BASE_F1 / p.length
    amps.forEach((amp, i) => {
      const target = Math.min(0.16, Math.abs(amp) * (p.pure ? 0.18 : 0.11))
      audio.oscillators[i].frequency.setTargetAtTime(base * (i + 1), now, 0.025)
      audio.gains[i].gain.setTargetAtTime(target, now, 0.035)
    })
    audio.master.gain.setTargetAtTime(0.85, now, 0.02)
  }

  const toggleSound = () => {
    if (audioRef.current) {
      closeAudio()
      return
    }

    const ctx = new AudioContext()
    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)

    const oscillators: OscillatorNode[] = []
    const gains: GainNode[] = []
    for (let i = 0; i < MAX_HARMONIC; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      gain.gain.value = 0
      osc.connect(gain)
      gain.connect(master)
      osc.start()
      oscillators.push(osc)
      gains.push(gain)
    }

    audioRef.current = { ctx, master, oscillators, gains }
    setSoundOn(true)
    updateAudio()
  }

  useEffect(() => updateAudio(), [harmonic, length, pluck, pure])

  useEffect(() => () => closeAudio(false), [])

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const p = paramsRef.current
    tRef.current += dt
    const t = tRef.current

    const stringX0 = 46
    const stringX1 = w - 46
    const stringW = stringX1 - stringX0
    const midY = h * 0.43
    const ampScale = Math.min(84, h * 0.19)
    const amps = harmonicAmps(p.harmonic, p.pluck, p.pure)
    const visualF1 = 0.72 / p.length

    ctx.clearRect(0, 0, w, h)

    // 기타 몸통과 고정점
    ctx.fillStyle = 'rgba(255,180,84,0.1)'
    ctx.beginPath()
    ctx.roundRect(stringX0 - 28, midY - 58, stringW + 56, 116, 18)
    ctx.fill()
    ctx.strokeStyle = '#2a3355'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = '#93a0c4'
    ctx.beginPath()
    ctx.arc(stringX0, midY, 7, 0, Math.PI * 2)
    ctx.arc(stringX1, midY, 7, 0, Math.PI * 2)
    ctx.fill()

    // 정지한 줄 기준선
    ctx.strokeStyle = 'rgba(147,160,196,0.35)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([7, 7])
    ctx.beginPath()
    ctx.moveTo(stringX0, midY)
    ctx.lineTo(stringX1, midY)
    ctx.stroke()
    ctx.setLineDash([])

    // 현재 진동 모양
    ctx.strokeStyle = '#ffb454'
    ctx.lineWidth = 3
    ctx.beginPath()
    const samples = 220
    for (let i = 0; i <= samples; i++) {
      const xNorm = i / samples
      let y = 0
      amps.forEach((amp, k) => {
        const n = k + 1
        y += amp * Math.sin(n * Math.PI * xNorm) * Math.cos(2 * Math.PI * n * visualF1 * t)
      })
      const x = stringX0 + xNorm * stringW
      const py = midY - y * ampScale * (p.pure ? 0.85 : 0.55)
      if (i === 0) ctx.moveTo(x, py)
      else ctx.lineTo(x, py)
    }
    ctx.stroke()

    // 선택한 배음의 마디와 배
    for (let i = 0; i <= p.harmonic; i++) {
      const x = stringX0 + (i / p.harmonic) * stringW
      ctx.strokeStyle = i === 0 || i === p.harmonic ? '#93a0c4' : 'rgba(244,114,182,0.72)'
      ctx.lineWidth = i === 0 || i === p.harmonic ? 2 : 1.5
      ctx.beginPath()
      ctx.moveTo(x, midY - ampScale * 0.95)
      ctx.lineTo(x, midY + ampScale * 0.95)
      ctx.stroke()
      if (i > 0 && i < p.harmonic) {
        ctx.fillStyle = '#f472b6'
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('마디', x, midY + ampScale + 18)
      }
    }

    for (let i = 0; i < p.harmonic; i++) {
      const x = stringX0 + ((i + 0.5) / p.harmonic) * stringW
      ctx.fillStyle = 'rgba(91,140,255,0.2)'
      ctx.beginPath()
      ctx.arc(x, midY, 9, 0, Math.PI * 2)
      ctx.fill()
    }

    // 튕기는 위치
    const pickX = stringX0 + p.pluck * stringW
    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(pickX, midY - ampScale - 18)
    ctx.lineTo(pickX, midY + ampScale + 18)
    ctx.stroke()
    ctx.fillStyle = '#4ade80'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('뜯는 위치', pickX, midY - ampScale - 26)

    // 배음 스펙트럼
    const sx = 46
    const sy = h - 120
    const sw = w - 92
    const sh = 76
    ctx.fillStyle = 'rgba(20,26,46,0.82)'
    ctx.beginPath()
    ctx.roundRect(sx, sy, sw, sh, 10)
    ctx.fill()
    ctx.strokeStyle = '#2a3355'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#93a0c4'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(p.pure ? '선택한 배음만 울림' : '기타 줄 배음 스펙트럼', sx + 12, sy + 18)

    const barGap = sw / MAX_HARMONIC
    amps.forEach((amp, i) => {
      const mag = Math.abs(amp)
      const bx = sx + i * barGap + barGap * 0.25
      const bw = barGap * 0.5
      const bh = mag * (sh - 34)
      ctx.fillStyle = i + 1 === p.harmonic ? '#ffb454' : '#5b8cff'
      ctx.fillRect(bx, sy + sh - 14 - bh, bw, bh)
      ctx.fillStyle = '#93a0c4'
      ctx.textAlign = 'center'
      ctx.fillText(String(i + 1), bx + bw / 2, sy + sh - 2)
    })
  })

  return (
    <div className="sim-page">
      <h2>🎸 정상파와 배음</h2>
      <p className="law">
        양끝이 고정된 줄은 아무 모양으로나 울리지 않습니다. 줄 길이 L 안에 <b>반파장</b>이
        정수 개 들어가는 모양만 오래 남고, 그래서 λₙ = 2L/n, fₙ = nf₁인 <b>배음</b>이
        생깁니다. 상자 속 입자도 양끝에서 파동함수가 0이 되어야 하므로 같은 수학을 씁니다 —
        기타 줄의 마디가 양자 에너지 준위의 마디와 닮아 있어요.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider name="배음 n" min={1} max={MAX_HARMONIC} value={harmonic} onChange={setHarmonic} />
        <Slider
          name="줄 길이 L"
          min={0.65}
          max={1.35}
          step={0.05}
          value={length}
          onChange={setLength}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          name="뜯는 위치"
          min={0.12}
          max={0.88}
          step={0.01}
          value={pluck}
          onChange={setPluck}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <button className={pure ? 'btn' : 'btn secondary'} onClick={() => setPure((v) => !v)}>
          {pure ? '순수 배음' : '기타 줄 합성'}
        </button>
        <button className={soundOn ? 'btn' : 'btn secondary'} onClick={toggleSound}>
          {soundOn ? '소리 끄기' : '소리 켜기'}
        </button>
      </div>
      <div className="readouts">
        <Readout label="현재 모드" value={`${harmonicName(harmonic)} (n=${harmonic})`} />
        <Readout label="마디 수" value={String(nodeCount)} unit="개" />
        <Readout label="파장 λₙ = 2L/n" value={wavelength.toFixed(2)} unit="L₀" />
        <Readout label="주파수 fₙ = nf₁" value={selectedFreq.toFixed(0)} unit="Hz" />
      </div>
      <p className="hint">
        💡 n을 올리면 마디가 하나씩 늘고 소리는 더 높아집니다. 뜯는 위치를 가운데로 두면 짝수
        배음이 약해져 더 둥근 소리가 나고, 끝쪽을 뜯으면 날카로운 배음이 살아납니다.
      </p>
    </div>
  )
}
