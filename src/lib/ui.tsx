import { useEffect, useState, type ReactNode } from 'react'

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

export type ThemeChoice = 'auto' | 'light' | 'dark'

export function useTheme(): [ThemeChoice, (t: ThemeChoice) => void] {
  const [t, setT] = useState<ThemeChoice>(() => (document.documentElement.dataset.theme as ThemeChoice) || 'auto')
  const set = (next: ThemeChoice) => {
    if (next === 'auto') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = next
    try {
      if (next === 'auto') localStorage.removeItem('nb-theme')
      else localStorage.setItem('nb-theme', next)
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
    <div className="center-screen" role="status">
      <span className="muted">{label}…</span>
    </div>
  )
}

export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
      return () => cancelAnimationFrame(id)
    }
    setEntered(false)
    const t = window.setTimeout(() => setMounted(false), 300)
    return () => window.clearTimeout(t)
  }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!mounted) return null
  return (
    <>
      <div className={`scrim${entered ? '' : ' enter'}`} onClick={onClose} />
      <div className={`sheet${entered ? '' : ' enter'}`} role="dialog" aria-modal="true" aria-label={label}>
        <div className="handle" />
        {children}
      </div>
    </>
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
