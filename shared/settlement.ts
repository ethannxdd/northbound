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

const DAY = 86_400_000
function days(a: string, b: string): number {
  return Math.max(0, (Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY)
}

export interface YearEarnings {
  taxYear: string
  /** Months of pay in this tax year, rounded to one decimal */
  months: number
  gross: number
}

/**
 * What your plan expects you to earn in each tax year from landing to settling.
 * Pay starts after the job hunt; tax years run 6 April to 5 April.
 */
export function expectedEarnings(landDate: string, jobHuntMonths: number, salary: number, settleDate: string): YearEarnings[] {
  const start = addMonths(landDate, jobHuntMonths)
  return taxYearsBetween(landDate, settleDate).map((ty) => {
    const y = Number(ty.slice(0, 4))
    const tyStart = `${y}-04-06`
    const tyEnd = `${y + 1}-04-06`
    const from = start > tyStart ? start : tyStart
    const to = settleDate < tyEnd ? settleDate : tyEnd
    const worked = days(from, to)
    const share = worked / days(tyStart, tyEnd)
    return { taxYear: ty, months: Math.round(share * 120) / 10, gross: Math.round(salary * share) }
  })
}

export interface FirstYearCheck {
  taxYear: string
  months: number
  gross: number
  minEarnings: number
  /** True when the first tax year's pay is below the settlement threshold */
  short: boolean
  /** The latest you could start work in that tax year and still reach the threshold, or null if you can't */
  startBy: string | null
}

/** The 2027 rules need a minimum each year: the first, part-year, is the one most likely to fall short. */
export function firstYearCheck(landDate: string, jobHuntMonths: number, salary: number, ov?: RuleOverrides): FirstYearCheck {
  const years = rule('settlementYears', landDate, ov)
  const settleDate = addMonths(landDate, years * 12)
  const minEarnings = rule('settlementMinEarnings', settleDate, ov)
  const first = expectedEarnings(landDate, jobHuntMonths, salary, settleDate)[0]
  const y = Number(first.taxYear.slice(0, 4))
  const yearDays = days(`${y}-04-06`, `${y + 1}-04-06`)
  const needDays = salary > 0 ? (minEarnings / salary) * yearDays : Infinity
  const startBy = needDays <= yearDays ? new Date(Date.parse(`${y + 1}-04-06T00:00:00Z`) - Math.ceil(needDays) * DAY).toISOString().slice(0, 10) : null
  return { ...first, minEarnings, short: minEarnings > 0 && first.gross < minEarnings, startBy }
}
