import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { prefersReducedMotion, rubberBand, spring, useAnimatedNumber } from './motion'

/** Removes the "pre" class after first paint, which plays each screen's one opening animation. */
export function useOpening(dep?: unknown) {
  useEffect(() => {
    const root = document.documentElement
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    root.classList.add('pre')
    const id = requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('pre')))
    return () => cancelAnimationFrame(id)
  }, [dep])
}

export type ThemeChoice = 'dark' | 'light' | 'auto'

function applyTheme(choice: ThemeChoice) {
  const light = choice === 'light' || (choice === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches)
  document.documentElement.dataset.theme = light ? 'light' : 'dark'
}

/** Dark by default. "auto" follows the device. */
export function useTheme(): [ThemeChoice, (t: ThemeChoice) => void] {
  const [t, setT] = useState<ThemeChoice>(() => {
    try {
      const v = localStorage.getItem('nb-theme')
      return v === 'light' || v === 'auto' ? v : 'dark'
    } catch {
      return 'dark'
    }
  })
  useEffect(() => {
    if (t !== 'auto') return
    const m = window.matchMedia('(prefers-color-scheme: light)')
    const on = () => applyTheme('auto')
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [t])
  const set = (next: ThemeChoice) => {
    applyTheme(next)
    try {
      localStorage.setItem('nb-theme', next)
    } catch {
      // Private mode: the choice lasts for this visit only.
    }
    setT(next)
  }
  return [t, set]
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" className="toggle" aria-pressed={on} aria-label={label} onClick={() => onChange(!on)} />
}

export function MoneyInput({ value, onChange, prefix = 'R', id, step = 100 }: { value: number; onChange: (n: number) => void; prefix?: string; id?: string; step?: number }) {
  const [text, setText] = useState(value ? String(value) : '')
  useEffect(() => {
    setText(value ? String(value) : '')
  }, [value])
  return (
    <div className="money-input">
      <span aria-hidden="true">{prefix}</span>
      <input
        id={id}
        className="input"
        inputMode="numeric"
        step={step}
        value={text}
        placeholder="0"
        onChange={(e) => {
          const clean = e.target.value.replace(/[^\d.]/g, '')
          setText(clean)
          onChange(Number(clean) || 0)
        }}
      />
    </div>
  )
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="splash" role="status">
      <img src="/icon.svg" width="64" height="64" alt="" />
      <span className="muted">{label}…</span>
    </div>
  )
}

/**
 * A sheet that moves on springs, so it can be grabbed mid-flight and reversed.
 * Phone: slides up from the bottom. Desktop: a centred dialog that grows out of
 * the button that opened it. Drag it down to dismiss (rubber-bands at the top,
 * and a flick carries its speed into the exit). Reduced motion: a short cross-fade.
 */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const [mounted, setMounted] = useState(open)
  const wide = useWide()
  const panel = useRef<HTMLDivElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const m = useRef({ t: 0, drag: 0, dx: 0, dy: 0, stop: () => {}, stopDrag: () => {}, dismissed: false })
  const drag = useRef<{ id: number; y0: number; active: boolean; samples: { y: number; at: number }[] } | null>(null)

  const paint = () => {
    const el = panel.current
    const sc = scrim.current
    if (!el || !sc) return
    const { t, drag: d, dx, dy } = m.current
    const reduce = prefersReducedMotion()
    const h = el.offsetHeight + 24
    const fade = Math.max(0, Math.min(1, t))
    if (reduce) {
      el.style.transform = wide ? 'translate(-50%, -50%)' : 'translateY(0)'
      el.style.opacity = String(fade)
    } else if (wide) {
      const k = 1 - t
      el.style.transform = `translate(-50%, -50%) translate(${dx * k}px, ${dy * k + d}px) scale(${0.55 + 0.45 * t})`
      el.style.opacity = String(Math.min(1, fade * 1.6) * (1 - Math.max(0, Math.min(1, d / 500))))
    } else {
      el.style.transform = `translateY(${(1 - t) * h + d}px)`
      el.style.opacity = '1'
    }
    sc.style.opacity = String(fade * (1 - Math.max(0, Math.min(1, d / h))))
  }

  const animateT = (to: number, done?: () => void) => {
    m.current.stop()
    m.current.stop = spring({
      from: m.current.t,
      to,
      response: prefersReducedMotion() ? 0.22 : 0.35,
      onUpdate: (x) => {
        m.current.t = x
        paint()
      },
      onDone: done,
    })
  }

  useLayoutEffect(() => {
    if (open) {
      opener.current = document.activeElement as HTMLElement | null
      m.current.dismissed = false
      setMounted(true)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!mounted) return
    if (open) {
      const r = opener.current && opener.current !== document.body ? opener.current.getBoundingClientRect() : null
      m.current.dx = r ? r.left + r.width / 2 - window.innerWidth / 2 : 0
      m.current.dy = r ? r.top + r.height / 2 - window.innerHeight / 2 : 40
      m.current.drag = 0
      paint()
      animateT(1)
      panel.current?.focus({ preventScroll: true })
      return
    }
    const finish = () => {
      setMounted(false)
      m.current.t = 0
      m.current.drag = 0
    }
    if (m.current.dismissed) finish()
    else animateT(0, finish)
    opener.current?.focus?.({ preventScroll: true })
  }, [open, mounted])

  useEffect(() => {
    if (!mounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      m.current.stop()
      m.current.stopDrag()
    }
  }, [mounted])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const inGrab = !!target.closest('.sheet-grab')
    const interactive = !!target.closest('input, select, textarea, button, a, label, [contenteditable]')
    if (!inGrab && (e.pointerType !== 'mouse' || interactive || (panel.current?.scrollTop ?? 0) > 0)) return
    drag.current = { id: e.pointerId, y0: e.clientY - m.current.drag, active: inGrab, samples: [{ y: e.clientY, at: e.timeStamp }] }
    if (inGrab) panel.current?.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const g = drag.current
    if (!g || g.id !== e.pointerId) return
    const dy = e.clientY - g.y0
    if (!g.active) {
      if (dy < 6) return
      g.active = true
      panel.current?.setPointerCapture(e.pointerId)
    }
    m.current.stopDrag()
    m.current.drag = dy >= 0 ? dy : -rubberBand(-dy, 120)
    g.samples.push({ y: e.clientY, at: e.timeStamp })
    if (g.samples.length > 6) g.samples.shift()
    paint()
  }
  const onPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    const g = drag.current
    drag.current = null
    if (!g || g.id !== e.pointerId || !g.active) return
    const first = g.samples[0]
    const last = g.samples[g.samples.length - 1]
    const dt = Math.max(1, last.at - first.at) / 1000
    const v = last.at - first.at > 120 ? 0 : (last.y - first.y) / dt
    const d = m.current.drag
    const reduce = prefersReducedMotion()
    if (d > 120 || (v > 650 && d > 0)) {
      m.current.dismissed = true
      if (reduce) {
        onClose()
        return
      }
      m.current.stopDrag = spring({
        from: d,
        to: window.innerHeight,
        velocity: Math.max(v, 900),
        response: 0.35,
        onUpdate: (x) => {
          m.current.drag = x
          paint()
        },
        onDone: onClose,
      })
      return
    }
    m.current.stopDrag = spring({
      from: d,
      to: 0,
      velocity: v,
      response: 0.35,
      onUpdate: (x) => {
        m.current.drag = x
        paint()
      },
    })
  }

  if (!mounted) return null
  return (
    <>
      <div ref={scrim} className="scrim" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="sheet-grab" aria-hidden="true">
          <div className="handle" />
        </div>
        <button type="button" className="iconbtn sheet-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        {children}
      </div>
    </>
  )
}

/** The big number, gliding between values. */
export function AnimatedMoney({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const shown = useAnimatedNumber(value)
  return (
    <span className={className}>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}

/** A short "Saved" confirmation that fades after a moment. */
export function useSavedFlash(): [boolean, () => void] {
  const [on, setOn] = useState(false)
  const t = useRef<number | undefined>(undefined)
  const flash = () => {
    setOn(true)
    window.clearTimeout(t.current)
    t.current = window.setTimeout(() => setOn(false), 1600)
  }
  return [on, flash]
}

/** Money field that saves when you leave it, not on every keystroke. */
export function SavedMoneyField({ id, label, value, onSave, prefix = 'R', hint }: { id: string; label: string; value: number; onSave: (n: number) => Promise<unknown> | void; prefix?: string; hint?: string }) {
  const [draft, setDraft] = useState(value)
  const [saved, flash] = useSavedFlash()
  useEffect(() => setDraft(value), [value])
  return (
    <div className="sfield">
      <label htmlFor={id}>
        {label}
        <span className={`saved-flash${saved ? ' on' : ''}`} aria-live="polite">
          {saved ? 'Saved' : ''}
        </span>
      </label>
      <div
        onBlur={async () => {
          if (draft === value) return
          await onSave(draft)
          flash()
        }}
      >
        <MoneyInput id={id} prefix={prefix} value={draft} onChange={setDraft} />
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

/** True on screens wide enough for the desktop layout. */
export function useWide(): boolean {
  const q = '(min-width: 900px)'
  const [wide, setWide] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}
