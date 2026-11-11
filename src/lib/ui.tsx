import { useEffect, useRef, useState, type ReactNode } from 'react'

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

export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (open) {
      returnTo.current = document.activeElement as HTMLElement | null
      setMounted(true)
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setEntered(true)
          panel.current?.focus()
        }),
      )
      return () => cancelAnimationFrame(id)
    }
    setEntered(false)
    returnTo.current?.focus?.()
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
      <div ref={panel} tabIndex={-1} className={`sheet${entered ? '' : ' enter'}`} role="dialog" aria-modal="true" aria-label={label}>
        <div className="handle" />
        <button type="button" className="iconbtn sheet-close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        {children}
      </div>
    </>
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
