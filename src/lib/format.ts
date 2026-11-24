export function zar(n: number, roundTo = 1): string {
  const v = Math.round(n / roundTo) * roundTo
  return 'R' + Math.round(v).toLocaleString('en-GB')
}

// The main scenario's destination currency: pounds on the UK route, the plan's currency otherwise.
// Set by AppDataProvider on every render, before the screens render.
let mainSymbol = '£'
export function setMainCurrency(symbol: string) {
  mainSymbol = symbol
}
export function mainCurrency(): string {
  return mainSymbol
}

/** An amount in the main scenario's destination currency (named for the UK route, where it's pounds). */
export function gbp(n: number, roundTo = 1): string {
  return cur(n, mainSymbol, roundTo)
}

/** Short rand for tight spaces: R312k, R1.2m */
export function zarShort(n: number): string {
  if (n >= 1_000_000) return `R${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`
  if (n >= 10000) return `R${Math.round(n / 1000)}k`
  if (n >= 1000) return `R${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return zar(n)
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
export function words(n: number): string {
  return WORDS[n] ?? String(n)
}

/** Any currency, by symbol: £1,234, €1,234, $1,234. */
export function cur(n: number, symbol: string, roundTo = 1): string {
  const v = Math.round(n / roundTo) * roundTo
  const s = Math.round(Math.abs(v)).toLocaleString('en-GB')
  return (v < 0 ? '−' : '') + (symbol.length > 1 && /^[A-Z]/.test(symbol) ? `${symbol} ${s}` : symbol + s)
}
