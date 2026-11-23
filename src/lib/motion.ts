import { useEffect, useRef, useState } from 'react'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export interface SpringOptions {
  from: number
  to: number
  /** Units per second at the start, for velocity handoff from a drag */
  velocity?: number
  /** Seconds for one period of the undamped spring. Northbound's sheets use 0.35. */
  response?: number
  /** 0 = no bounce (critically damped) */
  bounce?: number
  onUpdate: (value: number, velocity: number) => void
  onDone?: () => void
}

/**
 * A spring stepped on requestAnimationFrame. Unlike a CSS keyframe it can be
 * interrupted at any point and restarted from the current value and velocity.
 * Returns a function that stops it.
 */
export function spring({ from, to, velocity = 0, response = 0.35, bounce = 0, onUpdate, onDone }: SpringOptions): () => void {
  const omega = (2 * Math.PI) / response
  const zeta = 1 - Math.max(0, Math.min(0.9, bounce))
  let x = from
  let v = velocity
  let last = performance.now()
  let raf = 0
  const step = (now: number) => {
    // Fixed small substeps keep the integration stable on slow frames.
    let dt = Math.min(0.064, (now - last) / 1000)
    last = now
    while (dt > 0) {
      const h = Math.min(dt, 1 / 240)
      const a = -omega * omega * (x - to) - 2 * zeta * omega * v
      v += a * h
      x += v * h
      dt -= h
    }
    const settled = Math.abs(x - to) < Math.max(1e-3, Math.abs(to - from) * 1e-3) && Math.abs(v) < 0.05
    if (settled) {
      onUpdate(to, 0)
      onDone?.()
      return
    }
    onUpdate(x, v)
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}

/** Apple-style rubber band: resistance grows the further you pull past the edge. */
export function rubberBand(distance: number, dimension: number, c = 0.55): number {
  return (1 - 1 / ((distance * c) / dimension + 1)) * dimension
}

/**
 * A number that glides to its new value instead of jumping. Used for the big
 * number when sliders or the rate change. Reduced motion: it just updates.
 */
export function useAnimatedNumber(target: number, response = 0.5): number {
  const [shown, setShown] = useState(target)
  const current = useRef(target)
  const vel = useRef(0)
  useEffect(() => {
    if (prefersReducedMotion() || !Number.isFinite(target)) {
      current.current = target
      setShown(target)
      return
    }
    return spring({
      from: current.current,
      to: target,
      velocity: vel.current,
      response,
      onUpdate: (x, v) => {
        current.current = x
        vel.current = v
        setShown(x)
      },
    })
  }, [target, response])
  return shown
}
