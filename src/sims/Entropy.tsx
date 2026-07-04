import { useEffect, useRef, useState } from 'react'
import { useAnimationCanvas } from '../hooks/useAnimationCanvas'
import { Readout, Slider } from '../components/ui'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  gas: 'blue' | 'orange'
}

interface EntropyStats {
  blueLeft: number
  orangeLeft: number
  blueTotal: number
  orangeTotal: number
  entropy: number
  maxEntropy: number
  mixing: number
}

const INITIAL_COUNT = 80
const BASE_SPEED = 0.34
const MAX_HISTORY = 260

function logFactorial(n: number) {
  let s = 0
  for (let i = 2; i <= n; i++) s += Math.log(i)
  return s
}

function logChoose(n: number, k: number) {
  if (k < 0 || k > n) return 0
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k)
}

function makeParticle(gas: 'blue' | 'orange', temp: number): Particle {
  const angle = Math.random() * Math.PI * 2
  const speed = BASE_SPEED * Math.sqrt(temp) * (0.7 + Math.random() * 0.6)
  const left = gas === 'blue'
  return {
    x: left ? 0.05 + Math.random() * 0.4 : 0.55 + Math.random() * 0.4,
    y: 0.06 + Math.random() * 0.88,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    gas,
  }
}

function makeParticles(count: number, temp: number) {
  const blueCount = Math.floor(count / 2)
  const orangeCount = count - blueCount
  return [
    ...Array.from({ length: blueCount }, () => makeParticle('blue', temp)),
    ...Array.from({ length: orangeCount }, () => makeParticle('orange', temp)),
  ]
}

function entropyStats(parts: Particle[]): EntropyStats {
  const blueTotal = parts.filter((p) => p.gas === 'blue').length
  const orangeTotal = parts.length - blueTotal
  const blueLeft = parts.filter((p) => p.gas === 'blue' && p.x < 0.5).length
  const orangeLeft = parts.filter((p) => p.gas === 'orange' && p.x < 0.5).length
  const entropy = logChoose(blueTotal, blueLeft) + logChoose(orangeTotal, orangeLeft)
  const maxEntropy =
    logChoose(blueTotal, Math.floor(blueTotal / 2)) +
    logChoose(orangeTotal, Math.floor(orangeTotal / 2))
  const mixing = maxEntropy > 0 ? entropy / maxEntropy : 0
  return { blueLeft, orangeLeft, blueTotal, orangeTotal, entropy, maxEntropy, mixing }
}

function formatReturnProbability(count: number) {
  const log10 = -count * Math.log10(2)
  const p = 2 ** -count
  if (p >= 0.001) return `${(p * 100).toFixed(2)}%`
  return `10^${log10.toFixed(1)}`
}

function drawMiniGraph(
  ctx: CanvasRenderingContext2D,
  history: number[],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = 'rgba(20,26,46,0.82)'
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 10)
  ctx.fill()
  ctx.strokeStyle = '#2a3355'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = '#93a0c4'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('엔트로피 증가', x + 12, y + 18)
  ctx.textAlign = 'right'
  ctx.fillText('최대', x + w - 10, y + 18)

  ctx.strokeStyle = 'rgba(147,160,196,0.25)'
  ctx.beginPath()
  ctx.moveTo(x + 10, y + h - 16)
  ctx.lineTo(x + w - 10, y + h - 16)
  ctx.moveTo(x + 10, y + 26)
  ctx.lineTo(x + w - 10, y + 26)
  ctx.stroke()

  if (history.length < 2) return
  ctx.strokeStyle = '#ffb454'
  ctx.lineWidth = 2
  ctx.beginPath()
  history.forEach((v, i) => {
    const px = x + 10 + (i / (MAX_HISTORY - 1)) * (w - 20)
    const py = y + h - 16 - Math.min(v, 1) * (h - 44)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.stroke()
}

export default function Entropy() {
  const [count, setCount] = useState(INITIAL_COUNT)
  const [temp, setTemp] = useState(1)
  const [open, setOpen] = useState(false)
  const [live, setLive] = useState({
    entropy: 0,
    mixing: 0,
    blueLeft: INITIAL_COUNT / 2,
    orangeLeft: 0,
    returns: 0,
    time: 0,
  })

  const partsRef = useRef<Particle[]>(makeParticles(INITIAL_COUNT, 1))
  const paramsRef = useRef({ open, temp })
  const historyRef = useRef<number[]>([0])
  const timeRef = useRef(0)
  const returnCountRef = useRef(0)
  const separatedLastFrameRef = useRef(true)
  const prevTempRef = useRef(temp)

  paramsRef.current = { open, temp }

  const reset = (nextCount = count) => {
    partsRef.current = makeParticles(nextCount, paramsRef.current.temp)
    historyRef.current = [0]
    timeRef.current = 0
    returnCountRef.current = 0
    separatedLastFrameRef.current = true
    setOpen(false)
  }

  useEffect(() => reset(count), [count])

  useEffect(() => {
    const f = Math.sqrt(temp / prevTempRef.current)
    prevTempRef.current = temp
    for (const p of partsRef.current) {
      p.vx *= f
      p.vy *= f
    }
  }, [temp])

  const setSmallSystem = () => {
    setCount(6)
    reset(6)
  }

  const setLargeSystem = () => {
    setCount(120)
    reset(120)
  }

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    const prm = paramsRef.current
    const boxX = 24
    const boxY = 24
    const graphH = Math.min(92, h * 0.24)
    const boxW = w - boxX * 2
    const boxH = h - boxY * 2 - graphH - 14
    const r = partsRef.current.length <= 12 ? 6 : partsRef.current.length <= 50 ? 4.2 : 2.8

    if (prm.open) timeRef.current += dt

    for (const p of partsRef.current) {
      p.x += p.vx * dt
      p.y += p.vy * dt

      if (p.x < 0) {
        p.x = -p.x
        p.vx = Math.abs(p.vx)
      }
      if (p.x > 1) {
        p.x = 2 - p.x
        p.vx = -Math.abs(p.vx)
      }
      if (p.y < 0) {
        p.y = -p.y
        p.vy = Math.abs(p.vy)
      }
      if (p.y > 1) {
        p.y = 2 - p.y
        p.vy = -Math.abs(p.vy)
      }

      if (!prm.open) {
        if (p.gas === 'blue' && p.x > 0.5) {
          p.x = 1 - p.x
          p.vx = -Math.abs(p.vx)
        }
        if (p.gas === 'orange' && p.x < 0.5) {
          p.x = 1 - p.x
          p.vx = Math.abs(p.vx)
        }
      }
    }

    const stats = entropyStats(partsRef.current)
    const separated = stats.blueLeft === stats.blueTotal && stats.orangeLeft === 0
    if (prm.open && timeRef.current > 1.2 && separated && !separatedLastFrameRef.current) {
      returnCountRef.current++
    }
    separatedLastFrameRef.current = separated

    if (prm.open || historyRef.current.length === 1) {
      historyRef.current.push(stats.mixing)
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift()
    }

    ctx.clearRect(0, 0, w, h)

    ctx.fillStyle = 'rgba(91,140,255,0.08)'
    ctx.fillRect(boxX, boxY, boxW / 2, boxH)
    ctx.fillStyle = 'rgba(244,114,182,0.08)'
    ctx.fillRect(boxX + boxW / 2, boxY, boxW / 2, boxH)

    ctx.strokeStyle = '#2a3355'
    ctx.lineWidth = 3
    ctx.strokeRect(boxX, boxY, boxW, boxH)

    if (prm.open) {
      ctx.strokeStyle = 'rgba(147,160,196,0.35)'
      ctx.lineWidth = 1
      ctx.setLineDash([8, 8])
      ctx.beginPath()
      ctx.moveTo(boxX + boxW / 2, boxY)
      ctx.lineTo(boxX + boxW / 2, boxY + boxH)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#93a0c4'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('칸막이 제거', boxX + boxW / 2, boxY + 18)
    } else {
      ctx.fillStyle = '#ffb454'
      ctx.fillRect(boxX + boxW / 2 - 4, boxY, 8, boxH)
      ctx.fillStyle = '#0b1020'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('칸막이', boxX + boxW / 2, boxY + boxH / 2 + 4)
    }

    for (const p of partsRef.current) {
      const px = boxX + p.x * boxW
      const py = boxY + p.y * boxH
      ctx.fillStyle = p.gas === 'blue' ? '#5b8cff' : '#f472b6'
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = '#e8ecf8'
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`파란 기체 왼쪽: ${stats.blueLeft}/${stats.blueTotal}`, boxX + 12, boxY + boxH - 14)
    ctx.textAlign = 'right'
    ctx.fillText(
      `주황 기체 오른쪽: ${stats.orangeTotal - stats.orangeLeft}/${stats.orangeTotal}`,
      boxX + boxW - 12,
      boxY + boxH - 14,
    )

    drawMiniGraph(ctx, historyRef.current, boxX, boxY + boxH + 14, boxW, graphH)
  })

  useEffect(() => {
    const id = setInterval(() => {
      const stats = entropyStats(partsRef.current)
      setLive({
        entropy: stats.entropy,
        mixing: stats.mixing,
        blueLeft: stats.blueLeft,
        orangeLeft: stats.orangeLeft,
        returns: returnCountRef.current,
        time: timeRef.current,
      })
    }, 150)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="sim-page">
      <h2>⏳ 엔트로피와 시간의 화살</h2>
      <p className="law">
        칸막이 양쪽에 나뉘어 있던 두 기체가 섞이는 일은 자연스럽지만, 저절로 다시 분리되는
        일은 거의 보이지 않습니다. 입자 하나하나는 뉴턴 법칙대로 <b>되돌릴 수 있게</b>
        움직이지만, 섞인 배치의 경우의 수 W가 압도적으로 많아서 <b>S = k ln W</b>가 커지는
        방향이 우리가 느끼는 시간의 방향이 됩니다.
      </p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">
        <Slider name="분자 수 N" min={4} max={160} step={2} value={count} onChange={setCount} />
        <Slider
          name="온도 T"
          min={0.5}
          max={2.5}
          step={0.1}
          value={temp}
          onChange={setTemp}
          format={(v) => v.toFixed(1)}
        />
        <button className={open ? 'btn secondary' : 'btn'} onClick={() => setOpen(true)}>
          {open ? '칸막이 열림' : '칸막이 열기'}
        </button>
        <button className="btn secondary" onClick={() => reset()}>
          초기 상태로
        </button>
        <button className="btn secondary" onClick={setSmallSystem}>
          작은 계 6개
        </button>
        <button className="btn secondary" onClick={setLargeSystem}>
          큰 계 120개
        </button>
      </div>
      <div className="readouts">
        <Readout label="엔트로피 증가 ΔS/k = ln W" value={live.entropy.toFixed(2)} />
        <Readout label="최대 대비 섞임" value={(live.mixing * 100).toFixed(0)} unit="%" />
        <Readout label="한 순간 완전 복귀 확률" value={formatReturnProbability(count)} />
        <Readout label="관찰된 완전 분리 복귀" value={String(live.returns)} unit="회" />
        <Readout label="열린 뒤 시간" value={live.time.toFixed(1)} unit="s" />
      </div>
      <p className="hint">
        💡 분자 수를 6개로 줄이고 기다려 보세요. 가끔 처음처럼 분리되는 요동이 보입니다. 120개로
        키우면 같은 법칙인데도 되돌아갈 확률이 사실상 0이 되어 시간의 화살이 단단해집니다.
      </p>
    </div>
  )
}
