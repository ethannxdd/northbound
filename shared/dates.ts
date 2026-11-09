// Dates are plain ISO strings (YYYY-MM-DD) so they store cleanly in Convex and compare as text.

export function todayIso(): string {
  const d = new Date()
  return iso(d.getFullYear(), d.getMonth(), d.getDate())
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parts(s: string): [number, number, number] {
  const [y, m, d] = s.split('-').map(Number)
  return [y, m - 1, d]
}

export function addMonths(s: string, n: number): string {
  const [y, m, d] = parts(s)
  const total = y * 12 + m + Math.trunc(n)
  const ny = Math.floor(total / 12)
  const nm = total - ny * 12
  const last = new Date(ny, nm + 1, 0).getDate()
  return iso(ny, nm, Math.min(d, last))
}

export function addDays(s: string, n: number): string {
  const [y, m, d] = parts(s)
  const dt = new Date(y, m, d + n)
  return iso(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

/** Whole months from a to b (negative if b is earlier). Partial months round down. */
export function monthsBetween(a: string, b: string): number {
  const [ay, am, ad] = parts(a)
  const [by, bm, bd] = parts(b)
  let n = (by - ay) * 12 + (bm - am)
  if (bd < ad) n -= 1
  return n
}

export function maxDate(a: string, b: string): string {
  return a > b ? a : b
}

export function firstOfMonth(s: string): string {
  return s.slice(0, 8) + '01'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function monthYear(s: string): string {
  const [y, m] = parts(s)
  return `${MONTHS[m]} ${y}`
}

export function longMonthYear(s: string): string {
  const [y, m] = parts(s)
  return `${MONTHS_LONG[m]} ${y}`
}

export function dayMonthYear(s: string): string {
  const [y, m, d] = parts(s)
  return `${d} ${MONTHS[m]} ${y}`
}

export function longDate(s: string): string {
  const [y, m, d] = parts(s)
  return `${d} ${MONTHS_LONG[m]} ${y}`
}

export function monthIndex(s: string): number {
  return parts(s)[1]
}
