import { useEffect, useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

const C = 130 // 음속 (px/s)
const EMIT_INTERVAL = 0.22 // 파면 방출 간격 (s)
const BASE_TONE = 440 // 실제 소리 기본 진동수 (Hz)

interface Wavefront {
  x: number
  y: number
  r: number
}

export default function Doppler() {
  const [mach, setMach] = useState(0.6) // 음원 속도 / 음속
  const [soundOn, setSoundOn] = useState(false)

  const srcX = useRef(0)
  const fronts = useRef<Wavefront[]>([])
  const emitAcc = useRef(0)
  const paramsRef = useRef({ mach })
  paramsRef.current = { mach }

  const audioCtx = useRef<AudioContext | null>(null)
  const osc = useRef<OscillatorNode | null>(null)
  const gain = useRef<GainNode | null>(null)

  const toggleSound = () => {
    if (soundOn) {
      osc.current?.stop()
      audioCtx.current?.close()
      audioCtx.current = null
      osc.current = null
      gain.current = null
      setSoundOn(false)
    } else {
      const ac = new AudioContext()
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.type = 'triangle'
      o.frequency.value = BASE_TONE
      g.gain.value = 0
      o.connect(g)
      g.connect(ac.destination)
      o.start()
      audioCtx.current = ac
      osc.current = o
      gain.current = g
      setSoundOn(true)
    }
  }

  // 페이지를 떠나면 소리를 끈다
  useEffect(() => {
    return () => {
      osc.current?.stop()
      audioCtx.current?.close()
    }
  }, [])

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const p = paramsRef.current
    const laneY = h * 0.42
    const obsX = w * 0.72
    const obsY = h * 0.72
    const vs = p.mach * C

    // 음원 이동 (왼쪽에서 오른쪽으로, 화면 밖으로 나가면 되돌아옴)
    srcX.current += vs * dt
    if (srcX.current > w + 80) {
      srcX.current = -60
      fronts.current = []
    }

    // 파면 방출
    emitAcc.current += dt
    while (emitAcc.current >= EMIT_INTERVAL) {
      emitAcc.current -= EMIT_INTERVAL
      fronts.current.push({ x: srcX.current, y: laneY, r: 0 })
    }
    for (const f of fronts.current) f.r += C * dt
    fronts.current = fronts.current.filter((f) => f.r < Math.max(w, h) * 1.4)

    // 소리: 관측자에게 들리는 진동수 f' = f·c/(c − vs·cosθ)
    if (osc.current && gain.current && audioCtx.current) {
      const dx = obsX - srcX.current
      const dy = obsY - laneY
      const dist = Math.hypot(dx, dy)
      const cosT = dx / (dist || 1) // 음원 진행 방향(+x)과 관측자 방향 사이
      const denom = 1 - (vs / C) * cosT
      const fHeard = denom > 0.05 ? BASE_TONE / denom : BASE_TONE * 8
      osc.current.frequency.setTargetAtTime(
        Math.min(fHeard, 2500),
        audioCtx.current.currentTime,
        0.03,
      )
      const vol = Math.min(0.25, 30 / Math.max(dist, 40))
      gain.current.gain.setTargetAtTime(vol, audioCtx.current.currentTime, 0.05)
    }

    ctx.clearRect(0, 0, w, h)

    // 파면
    for (const f of fronts.current) {
      const a = Math.max(0, 1 - f.r / (Math.max(w, h) * 0.9))
      ctx.strokeStyle = `rgba(91, 140, 255, ${a * 0.75})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
      ctx.stroke()
    }

    // 이동 경로
    ctx.strokeStyle = 'rgba(147,160,196,0.2)'
    ctx.setLineDash([4, 8])
    ctx.beginPath()
    ctx.moveTo(0, laneY)
    ctx.lineTo(w, laneY)
    ctx.stroke()
    ctx.setLineDash([])

    // 음원 (구급차)
    ctx.font = '30px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🚑', srcX.current, laneY + 10)

    // 관측자
    ctx.font = '26px sans-serif'
    ctx.fillText('🧍', obsX, obsY + 10)
    ctx.fillStyle = '#93a0c4'
    ctx.font = '11px sans-serif'
    ctx.fillText('관측자', obsX, obsY + 28)

    // 초음속 표시
    if (p.mach >= 1) {
      ctx.fillStyle = '#f472b6'
      ctx.font = 'bold 15px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`💥 초음속! (마하 ${p.mach.toFixed(2)}) — 충격파 원뿔이 보이나요?`, 16, 30)
    }
  })

  const fApproach = mach < 1 ? BASE_TONE / (1 - mach) : Infinity
  const fRecede = BASE_TONE / (1 + mach)

  return (
    <div className="sim-page">
      <h2>🚑 도플러 효과</h2>
      <p className="law">
        다가오는 구급차 사이렌은 높게, 멀어지면 낮게 들립니다. 음원이 다가오면 파면이{' '}
        <b>앞쪽으로 압축</b>되어 진동수가 올라가고(f′ = f·c/(c−v)), 멀어지면 늘어져 내려가기
        때문이에요. 속도를 <b>마하 1 이상</b>으로 올리면 파면이 음원을 못 따라와 겹치면서{' '}
        <b>충격파(소닉붐)</b> 원뿔이 만들어집니다.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider
          name="음원 속도 (마하)"
          unit="×음속"
          min={0}
          max={1.4}
          step={0.05}
          value={mach}
          onChange={setMach}
          format={(v) => v.toFixed(2)}
        />
        <button className={soundOn ? 'btn' : 'btn secondary'} onClick={toggleSound}>
          {soundOn ? '🔊 소리 끄기' : '🔈 소리 켜기 (도플러 체험)'}
        </button>
      </div>
      <div className="readouts">
        <Readout label="원래 음 높이" value={String(BASE_TONE)} unit="Hz" />
        <Readout
          label="다가올 때 들리는 음"
          value={mach < 1 ? fApproach.toFixed(0) : '∞ (소닉붐)'}
          unit={mach < 1 ? 'Hz' : ''}
        />
        <Readout label="멀어질 때 들리는 음" value={fRecede.toFixed(0)} unit="Hz" />
      </div>
      <p className="hint">
        🎧 소리를 켜면 구급차가 관측자를 지나치는 순간 음이 뚝 떨어지는 걸 실제로 들을 수
        있습니다. 경찰 스피드건, 기상 레이더, 우주 팽창(적색편이) 관측이 모두 이 원리를 씁니다.
      </p>
    </div>
  )
}
