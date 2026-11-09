export function zar(n: number, roundTo = 1): string {
  const v = Math.round(n / roundTo) * roundTo
  return 'R' + Math.round(v).toLocaleString('en-GB')
}

export function gbp(n: number, roundTo = 1): string {
  const v = Math.round(n / roundTo) * roundTo
  return '£' + Math.round(v).toLocaleString('en-GB')
}

/** Short rand for tight spaces: R312k, R1.2m */
export function zarShort(n: number): string {
  if (n >= 1_000_000) return `R${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`
  if (n >= 1000) return `R${Math.round(n / 1000)}k`
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
