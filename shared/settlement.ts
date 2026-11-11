import { addMonths } from './dates'
import { rule, ruleText, type RuleOverrides } from './rules'

/** UK tax years run 6 April to 5 April. "2029-30" covers 6 Apr 2029 to 5 Apr 2030. */
export function taxYearOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const start = m > 4 || (m === 4 && d >= 6) ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}

/** The tax years you'll be in the UK for, from landing to the settlement date. */
export function taxYearsBetween(from: string, to: string): string[] {
  const out: string[] = []
  let y = taxYearOf(from)
  const last = taxYearOf(to)
  while (out.length < 12) {
    out.push(y)
    if (y === last) break
    const start = Number(y.slice(0, 4)) + 1
    y = `${start}-${String((start + 1) % 100).padStart(2, '0')}`
  }
  return out
}

export interface SettlementCheck {
  settleDate: string
  years: number
  minEarnings: number
  english: string
  yearsMet: number
  yearsNeeded: number
}

export function settlementCheck(landDate: string, earnings: Record<string, number>, ov?: RuleOverrides): SettlementCheck {
  const years = rule('settlementYears', landDate, ov)
  const settleDate = addMonths(landDate, years * 12)
  const minEarnings = rule('settlementMinEarnings', settleDate, ov)
  const english = ruleText('settlementEnglish', settleDate, ov)
  const ty = taxYearsBetween(landDate, settleDate)
  const yearsMet = ty.filter((y) => (earnings[y] ?? 0) >= minEarnings && (earnings[y] ?? 0) > 0).length
  return { settleDate, years, minEarnings, english, yearsMet, yearsNeeded: years }
}
