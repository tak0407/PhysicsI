import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Projectile from './sims/Projectile'
import Pendulum from './sims/Pendulum'
import Spring from './sims/Spring'
import Incline from './sims/Incline'
import Buoyancy from './sims/Buoyancy'
import Seesaw from './sims/Seesaw'
import Collision from './sims/Collision'
import Orbit from './sims/Orbit'
import Sandbox from './sims/Sandbox'
import DoubleSlit from './sims/DoubleSlit'
import QuantumBox from './sims/QuantumBox'
import Tunneling from './sims/Tunneling'
import DoublePendulum from './sims/DoublePendulum'
import Doppler from './sims/Doppler'
import StandingWave from './sims/StandingWave'
import GasBox from './sims/GasBox'
import Entropy from './sims/Entropy'
import Photoelectric from './sims/Photoelectric'
import TimeDilation from './sims/TimeDilation'
import Resonance from './sims/Resonance'
import LorentzForce from './sims/LorentzForce'
import ElectricField from './sims/ElectricField'

interface PageDef {
  id: string
  emoji: string
  title: string
  desc: string
  category: string
  el: ReactNode
}

const PAGES: PageDef[] = [
  {
    id: 'projectile',
    emoji: '🚀',
    title: '포물선 운동',
    desc: '각도와 속도를 바꿔 쏘아보고, 45°가 최적인 이유를 확인하세요',
    category: '운동과 힘',
    el: <Projectile />,
  },
  {
    id: 'incline',
    emoji: '⛰️',
    title: '경사면과 마찰',
    desc: '각도를 올리다 보면 어느 순간 블록이 미끄러집니다 — 임계각 찾기',
    category: '운동과 힘',
    el: <Incline />,
  },
  {
    id: 'collision',
    emoji: '💥',
    title: '충돌과 운동량',
    desc: '어떤 충돌에서도 운동량의 합은 보존됩니다. 반발 계수로 실험해 보세요',
    category: '운동과 힘',
    el: <Collision />,
  },
  {
    id: 'pendulum',
    emoji: '🕰️',
    title: '단진자',
    desc: '추를 드래그해서 놓아보세요. 주기는 놓는 높이와 무관합니다',
    category: '진동',
    el: <Pendulum />,
  },
  {
    id: 'spring',
    emoji: '🌀',
    title: '용수철 진동',
    desc: '훅의 법칙 F=−kx가 만드는 사인 곡선을 실시간 그래프로',
    category: '진동',
    el: <Spring />,
  },
  {
    id: 'doublependulum',
    emoji: '🌪️',
    title: '이중 진자 (카오스)',
    desc: '0.01° 차이가 완전히 다른 운명으로 — 나비 효과를 눈으로',
    category: '진동',
    el: <DoublePendulum />,
  },
  {
    id: 'resonance',
    emoji: '🎡',
    title: '공명',
    desc: '리듬만 맞으면 작은 힘으로 그네가 폭발적으로 커집니다',
    category: '진동',
    el: <Resonance />,
  },
  {
    id: 'doppler',
    emoji: '🚑',
    title: '도플러 효과',
    desc: '지나가는 사이렌 소리가 변하는 이유 — 실제 소리로 들어보세요',
    category: '파동과 소리',
    el: <Doppler />,
  },
  {
    id: 'standingwave',
    emoji: '🎸',
    title: '정상파와 배음',
    desc: '기타 줄의 마디와 배를 보며 배음이 왜 정수배로만 나는지 들어보세요',
    category: '파동과 소리',
    el: <StandingWave />,
  },
  {
    id: 'gasbox',
    emoji: '🔥',
    title: '기체 분자 운동',
    desc: '분자 수백 개가 벽을 두드리면 압력이 됩니다 — PV=NkT',
    category: '열역학',
    el: <GasBox />,
  },
  {
    id: 'entropy',
    emoji: '⏳',
    title: '엔트로피와 시간의 화살',
    desc: '칸막이를 열면 기체는 섞입니다 — 작은 계에서만 드문 되돌림이 보입니다',
    category: '열역학',
    el: <Entropy />,
  },
  {
    id: 'buoyancy',
    emoji: '🌊',
    title: '부력',
    desc: '밀도 600이면 정확히 60%가 잠깁니다 — 아르키메데스 원리',
    category: '유체와 회전',
    el: <Buoyancy />,
  },
  {
    id: 'seesaw',
    emoji: '⚖️',
    title: '시소와 돌림힘',
    desc: '가벼운 추도 멀리 놓으면 이깁니다. m×d 균형 맞추기',
    category: '유체와 회전',
    el: <Seesaw />,
  },
  {
    id: 'orbit',
    emoji: '🪐',
    title: '행성 궤도',
    desc: '초기 속도에 따라 원, 타원, 탈출 — 만유인력과 케플러 법칙',
    category: '우주',
    el: <Orbit />,
  },
  {
    id: 'doubleslit',
    emoji: '⚛️',
    title: '이중슬릿 실험',
    desc: '전자를 한 알씩 쏘는데 파동 무늬가 — 관측하면 사라집니다',
    category: '양자',
    el: <DoubleSlit />,
  },
  {
    id: 'lorentz',
    emoji: '🧲',
    title: '자기장 속 하전입자',
    desc: '속도에 수직인 힘은 원운동을 만듭니다 — 오로라와 입자가속기',
    category: '전자기',
    el: <LorentzForce />,
  },
  {
    id: 'electricfield',
    emoji: '⚡',
    title: '전기장 놀이터',
    desc: '전하를 놓으면 보이지 않는 전기장이 화살표와 시험 전하 운동으로 드러납니다',
    category: '전자기',
    el: <ElectricField />,
  },
  {
    id: 'timedilation',
    emoji: '⏱️',
    title: '시간 지연',
    desc: '빠르게 움직이는 시계는 느리게 갑니다 — 빛 시계로 확인',
    category: '상대성',
    el: <TimeDilation />,
  },
  {
    id: 'photoelectric',
    emoji: '💡',
    title: '광전 효과',
    desc: '빨간빛은 아무리 세도 안 되는 이유 — 아인슈타인의 노벨상',
    category: '양자',
    el: <Photoelectric />,
  },
  {
    id: 'quantumbox',
    emoji: '📦',
    title: '상자 속 입자',
    desc: '갇힌 입자는 아무 에너지나 못 가집니다 — E ∝ n² 양자화',
    category: '양자',
    el: <QuantumBox />,
  },
  {
    id: 'tunneling',
    emoji: '🧱',
    title: '양자 터널링',
    desc: '에너지가 부족해도 벽을 통과합니다 — 슈뢰딩거 방정식 실시간 풀이',
    category: '양자',
    el: <Tunneling />,
  },
  {
    id: 'sandbox',
    emoji: '🧸',
    title: '물리 놀이터',
    desc: '물체를 쏟아붓고 집어 던지는 자유 공간 (Matter.js)',
    category: '자유 놀이',
    el: <Sandbox />,
  },
]

const CATEGORIES = [
  '운동과 힘',
  '진동',
  '파동과 소리',
  '유체와 회전',
  '전자기',
  '열역학',
  '우주',
  '상대성',
  '양자',
  '자유 놀이',
]

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash.replace(/^#\/?/, '')
}

function Home() {
  return (
    <>
      <header className="site-header hero">
        <h1>
          물리 놀이터 <span className="spark">⚡</span>
        </h1>
        <p>수식으로만 보던 물리 법칙을 직접 만지고, 던지고, 돌려보는 곳</p>
      </header>
      {CATEGORIES.map((cat) => (
        <section key={cat} className="category">
          <h3>{cat}</h3>
          <div className="card-grid">
            {PAGES.filter((p) => p.category === cat).map((p) => (
              <a key={p.id} className="card" href={`#/${p.id}`}>
                <span className="card-emoji">{p.emoji}</span>
                <span className="card-body">
                  <span className="card-title">{p.title}</span>
                  <span className="card-desc">{p.desc}</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

export default function App() {
  const route = useHashRoute()
  const idx = PAGES.findIndex((p) => p.id === route)
  const page = idx >= 0 ? PAGES[idx] : null

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  if (!page) return <Home />

  const prev = PAGES[(idx - 1 + PAGES.length) % PAGES.length]
  const next = PAGES[(idx + 1) % PAGES.length]

  return (
    <>
      <nav className="sim-topbar">
        <a className="back-link" href="#/">
          ← 실험 목록
        </a>
      </nav>
      {page.el}
      <nav className="sim-pager">
        <a href={`#/${prev.id}`}>
          ← {prev.emoji} {prev.title}
        </a>
        <a href={`#/${next.id}`}>
          {next.emoji} {next.title} →
        </a>
      </nav>
    </>
  )
}
