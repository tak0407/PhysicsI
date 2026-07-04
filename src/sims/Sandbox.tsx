import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import { Slider } from '../components/ui'

const HEIGHT = 460
const COLORS = ['#5b8cff', '#ffb454', '#4ade80', '#f472b6', '#22d3ee', '#c084fc']

export default function Sandbox() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const widthRef = useRef(900)
  const [gravity, setGravity] = useState(1)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const width = container.clientWidth
    widthRef.current = width

    const engine = Matter.Engine.create()
    engineRef.current = engine

    const render = Matter.Render.create({
      element: container,
      engine,
      options: {
        width,
        height: HEIGHT,
        wireframes: false,
        background: 'transparent',
      },
    })
    render.canvas.className = 'sim-canvas'
    render.canvas.style.height = `${HEIGHT}px`

    const wallOpts = { isStatic: true, render: { fillStyle: '#2a3355' } }
    Matter.Composite.add(engine.world, [
      Matter.Bodies.rectangle(width / 2, HEIGHT - 12, width, 24, wallOpts),
      Matter.Bodies.rectangle(12, HEIGHT / 2, 24, HEIGHT, wallOpts),
      Matter.Bodies.rectangle(width - 12, HEIGHT / 2, 24, HEIGHT, wallOpts),
      // 가운데 경사면 — 굴려 보라고 하나 놓아둔다
      Matter.Bodies.rectangle(width * 0.32, HEIGHT * 0.62, width * 0.34, 16, {
        ...wallOpts,
        angle: 0.28,
      }),
    ])

    const mouse = Matter.Mouse.create(render.canvas)
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    })
    Matter.Composite.add(engine.world, mouseConstraint)
    render.mouse = mouse

    const runner = Matter.Runner.create()
    Matter.Runner.run(runner, engine)
    Matter.Render.run(render)

    return () => {
      Matter.Render.stop(render)
      Matter.Runner.stop(runner)
      Matter.Engine.clear(engine)
      render.canvas.remove()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    if (engineRef.current) engineRef.current.gravity.y = gravity
  }, [gravity])

  const randColor = () => COLORS[Math.floor(Math.random() * COLORS.length)]
  const spawnX = () => 60 + Math.random() * (widthRef.current - 120)

  const spawn = (kind: 'ball' | 'box' | 'poly') => {
    const engine = engineRef.current
    if (!engine) return
    const common = { restitution: kind === 'ball' ? 0.85 : 0.3, render: { fillStyle: randColor() } }
    let body: Matter.Body
    if (kind === 'ball') {
      body = Matter.Bodies.circle(spawnX(), 40, 14 + Math.random() * 18, common)
    } else if (kind === 'box') {
      const s = 26 + Math.random() * 34
      body = Matter.Bodies.rectangle(spawnX(), 40, s, s, common)
    } else {
      body = Matter.Bodies.polygon(spawnX(), 40, 3 + Math.floor(Math.random() * 4), 22 + Math.random() * 16, common)
    }
    Matter.Composite.add(engine.world, body)
  }

  const clearAll = () => {
    const engine = engineRef.current
    if (!engine) return
    Matter.Composite.allBodies(engine.world)
      .filter((b) => !b.isStatic)
      .forEach((b) => Matter.Composite.remove(engine.world, b))
  }

  return (
    <div className="sim-page">
      <h2>🧸 물리 놀이터</h2>
      <p className="law">
        여기는 자유롭게 노는 공간입니다. 물체를 떨어뜨리고, <b>마우스로 집어 던져</b> 보세요.
        모든 움직임 뒤에는 중력, 마찰, <b>충돌 시 운동량 교환</b>이 실시간으로 계산되고 있습니다.
        (물리 엔진 Matter.js 사용)
      </p>
      <div ref={containerRef} />
      <div className="controls">
        <button className="btn" onClick={() => spawn('ball')}>
          ⚽ 공 떨어뜨리기
        </button>
        <button className="btn" onClick={() => spawn('box')}>
          📦 상자 떨어뜨리기
        </button>
        <button className="btn" onClick={() => spawn('poly')}>
          🔷 다각형 떨어뜨리기
        </button>
        <Slider
          name="중력 (지구=1)"
          min={-0.5}
          max={2}
          step={0.1}
          value={gravity}
          onChange={setGravity}
          format={(v) => v.toFixed(1)}
        />
        <button className="btn secondary" onClick={clearAll}>
          전부 지우기
        </button>
      </div>
      <p className="hint">💡 중력을 음수로 만들면 모든 게 떠오릅니다. 0.16은 달, 2는 목성 느낌!</p>
    </div>
  )
}
