import { useState } from 'react'
import Projectile from './sims/Projectile'
import Pendulum from './sims/Pendulum'
import Collision from './sims/Collision'
import Orbit from './sims/Orbit'
import Sandbox from './sims/Sandbox'

const PAGES = [
  { id: 'projectile', label: '🚀 포물선 운동', el: <Projectile /> },
  { id: 'pendulum', label: '🕰️ 진자', el: <Pendulum /> },
  { id: 'collision', label: '💥 충돌', el: <Collision /> },
  { id: 'orbit', label: '🪐 행성 궤도', el: <Orbit /> },
  { id: 'sandbox', label: '🧸 놀이터', el: <Sandbox /> },
] as const

export default function App() {
  const [page, setPage] = useState<string>('projectile')

  return (
    <>
      <header className="site-header">
        <h1>
          물리 놀이터 <span className="spark">⚡</span>
        </h1>
        <p>수식으로만 보던 물리 법칙을 직접 만지고, 던지고, 돌려보는 곳</p>
      </header>
      <nav className="tabs">
        {PAGES.map((p) => (
          <button
            key={p.id}
            className={page === p.id ? 'active' : ''}
            onClick={() => setPage(p.id)}
          >
            {p.label}
          </button>
        ))}
      </nav>
      {PAGES.find((p) => p.id === page)?.el}
    </>
  )
}
