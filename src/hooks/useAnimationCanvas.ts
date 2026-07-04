import { useEffect, useRef } from 'react'

export interface CanvasSize {
  w: number
  h: number
}

/**
 * requestAnimationFrame 루프를 도는 캔버스 ref를 돌려준다.
 * draw는 매 프레임 CSS 픽셀 좌표계(ctx는 dpr 보정됨)로 호출된다.
 */
export function useAnimationCanvas(
  draw: (ctx: CanvasRenderingContext2D, size: CanvasSize, dt: number) => void,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  drawRef.current = draw

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      // 탭 전환 등으로 프레임이 밀려도 물리가 폭주하지 않게 dt 상한을 둔다
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const pw = Math.round(rect.width * dpr)
      const ph = Math.round(rect.height * dpr)
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw
        canvas.height = ph
      }

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        drawRef.current(ctx, { w: rect.width, h: rect.height }, dt)
      }
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return canvasRef
}
