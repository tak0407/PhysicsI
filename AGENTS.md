# 물리 놀이터 (PhysicsI) — 에이전트 가이드

일반 대중이 물리 법칙을 직접 만지며 배우는 한국어 인터랙티브 웹사이트.
갈릴레이(포물선 운동)부터 아인슈타인(상대성·광전 효과), 슈뢰딩거(터널링)까지 22개 실험을 담고 있다.

- **라이브**: https://tak0407.github.io/PhysicsI/
- **저장소**: https://github.com/tak0407/PhysicsI (public)

## 명령어

```bash
npm run dev      # 개발 서버 (포트 5173)
npm run build    # tsc -b && vite build → dist/
npx tsc -b --force   # 타입 체크만
```

배포는 `main`에 푸시하면 GitHub Actions(.github/workflows/deploy.yml)가 자동으로 빌드해서
GitHub Pages에 올린다. 별도 배포 명령 불필요.

## 기술 스택과 구조

Vite + React 18 + TypeScript (strict). 물리 계산은 외부 라이브러리 없이 직접 적분하고,
자유 놀이 페이지(놀이터)만 Matter.js를 쓴다.

```
src/
  App.tsx                 # 해시 라우터 + 실험 레지스트리(PAGES) + 홈 화면
  index.css               # 전체 스타일 (CSS 변수 테마, 모바일 대응)
  hooks/useAnimationCanvas.ts  # rAF 루프 캔버스 훅 (dpr 보정, dt 상한 0.05s)
  components/ui.tsx       # Slider, Readout 공용 컴포넌트
  sims/                   # 실험 1개 = 파일 1개 (자체 완결)
```

### 라우팅

`#/실험id` 해시 라우팅 (GitHub Pages 정적 호스팅 호환, 딥링크 공유 가능).
`App.tsx`의 `PAGES` 배열이 실험 레지스트리이고, `CATEGORIES` 배열 순서대로 홈에 표시된다.
카테고리: 운동과 힘 / 진동 / 파동과 소리 / 유체와 회전 / 전자기 / 열역학 / 우주 / 상대성 / 양자 / 자유 놀이.

### 시뮬레이션 컴포넌트 패턴

모든 실험이 같은 골격을 따른다 (예: `src/sims/Spring.tsx`, `src/sims/Tunneling.tsx` 참고):

```tsx
export default function MySim() {
  const [param, setParam] = useState(초기값)        // 슬라이더 파라미터는 React state
  const stateRef = useRef({...})                    // 물리 상태는 ref (리렌더 없이 매 프레임 갱신)
  const paramsRef = useRef({ param })               // draw 콜백에서 최신 파라미터를 읽기 위한 미러
  paramsRef.current = { param }

  const canvasRef = useAnimationCanvas((ctx, { w, h }, dt) => {
    // 1) 물리 적분 (정확도 필요하면 dt를 6~16개 substep으로 쪼갬, 카오스는 RK4)
    // 2) ctx로 그리기 (CSS 픽셀 좌표, 배경은 투명 — 캔버스 스타일이 처리)
  })

  return (
    <div className="sim-page">
      <h2>이모지 + 제목</h2>
      <p className="law">법칙 설명 — <b>강조</b>는 핵심 개념에만</p>
      <canvas ref={canvasRef} className="sim-canvas" />
      <div className="controls">  {/* Slider들 + 버튼 */}
      <div className="readouts">  {/* Readout: 공식과 계산값 */}
      <p className="hint">💡 해보면 좋은 실험 제안</p>
    </div>
  )
}
```

수치 readout을 자주 갱신해야 하면 매 프레임 setState 대신 `setInterval` 100~200ms를 쓴다
(Collision.tsx, GasBox.tsx 참고). 파라미터가 바뀌면 축적된 결과가 무의미해지는 실험은
`useEffect`로 리셋한다 (DoubleSlit.tsx, Tunneling.tsx 참고).

## 새 실험 추가하는 법

1. `src/sims/NewSim.tsx` 생성 (위 패턴)
2. `App.tsx`: import 추가 + `PAGES` 배열에 `{ id, emoji, title, desc, category, el }` 등록
   (id는 URL이 되므로 영문 소문자. desc는 카드에 보이는 한 줄 후킹 문구)
3. 새 카테고리면 `CATEGORIES` 배열에도 추가 (표시 순서 = 배열 순서)
4. `npx tsc -b --force`로 타입 체크 → 브라우저에서 물리 값 검증 → 커밋·푸시

## 컨벤션 (중요)

- **UI 언어는 한국어**. 설명은 일반 대중 눈높이 — 수식은 최소화하되 readout 라벨에 공식 표기
  (예: "주기 T = 2π√(L/g)")
- **물리는 정확하게**: 그럴듯한 애니메이션이 아니라 실제 방정식을 적분한다. 검증 가능한
  수치(보존량, 이론값 대비)를 readout으로 노출해서 확인할 수 있게
- **직관적 조작 우선**: 드래그(진자·용수철·부력), 슬라이더, 큰 버튼. 터치 타깃 44px 이상
  (CSS가 이미 처리 — `.btn`, 커스텀 슬라이더 스타일 유지할 것)
- **모바일 대응**: 캔버스 안 그림은 `w, h`에 상대적으로 배치. 화면이 좁아도 내용이 잘리면
  안 됨 (Projectile.tsx의 자동 축척 참고). 600px 이하 미디어 쿼리가 index.css에 있음
- 코드 주석은 한국어, 물리적 의미를 설명할 때만

## 배포 관련

- `vite.config.ts`: base가 빌드 시에만 `/PhysicsI/` (dev는 `/`)
- GitHub Pages가 가끔 일시 장애로 배포만 실패함 ("Deployment failed, try again later").
  빌드가 성공했다면 코드 문제 아님 — Actions에서 "Re-run failed jobs" 하면 해결
- 사용자 방침: **변경이 검증되면 바로 배포까지 진행**

## 작업 계획과 히스토리

- **ROADMAP.md** — 무엇을 만들지의 원본. 작업 전에 거기서 다음 항목을 고르고,
  완료하면 체크와 날짜를 남길 것
- **HISTORY.md** — 지금까지의 결정과 이유, 겪은 문제의 기록. 과거 맥락이 궁금하면
  여기부터. 작업 세션을 마치면 섹션을 추가할 것
- 이 문서(AGENTS.md)는 "어떻게"만 다룬다
