import { CITIES, type CityProfile } from './cities'
import { addMonths, maxDate, monthsBetween } from './dates'
import { rule, type RuleOverrides } from './rules'
import type { SavingsState, ScenarioInput } from './types'

// ---------- UK pay ----------

export interface TakeHome {
  gross: number
  tax: number
  ni: number
  yearly: number
  monthly: number
}

/** Gross salary to take-home pay, using the tax rules in force on the given date. */
export function takeHome(gross: number, onDate: string, ov?: RuleOverrides): TakeHome {
  const pa = rule('personalAllowance', onDate, ov)
  const brl = rule('basicRateLimit', onDate, ov)
  const basic = rule('basicRate', onDate, ov)
  const higher = rule('higherRate', onDate, ov)
  const niMain = rule('niRateMain', onDate, ov)
  const niUpper = rule('niRateUpper', onDate, ov)
  // Personal allowance tapers away above £100k: £1 for every £2 over.
  const allowance = Math.max(0, pa - Math.max(0, gross - 100000) / 2)
  const taxable = Math.max(0, gross - allowance)
  const basicBand = brl - pa
  const tax = Math.min(taxable, basicBand) * basic + Math.max(0, taxable - basicBand) * higher
  const ni = Math.max(0, Math.min(gross, brl) - pa) * niMain + Math.max(0, gross - brl) * niUpper
  const yearly = gross - tax - ni
  return { gross, tax, ni, yearly, monthly: yearly / 12 }
}

// ---------- shared helpers ----------

export function people(s: ScenarioInput): number {
  return s.partner ? 2 : 1
}

export function salaryFor(s: ScenarioInput): number {
  return s.ukSalary > 0 ? s.ukSalary : CITIES[s.city].itSupportSalary
}

export interface LineItem {
  label: string
  gbp: number
}

export type GroupId = 'paper' | 'move' | 'runway'

export interface CostGroup {
  id: GroupId
  label: string
  items: LineItem[]
  total: number
}

export interface MonthlyBudget {
  takeHome: number
  partnerTakeHome: number
  items: LineItem[]
  outgoings: number
  left: number
}

/** What a month costs the household in the UK, and what's left once everyone is paid. */
export function monthlyBudget(s: ScenarioInput, onDate: string, ov?: RuleOverrides): MonthlyBudget {
  const c = CITIES[s.city]
  const p = people(s)
  const items: LineItem[] = [
    { label: s.housing === 'room' ? 'Rent, room in a share' : s.housing === 'studio' ? 'Rent, studio' : 'Rent, 1-bed flat', gbp: c.rent[s.housing] },
    { label: 'Food', gbp: c.food * p },
    { label: 'Bills and council tax', gbp: c.bills[s.housing] },
    { label: s.city === 'manchester' ? 'Bus and tram' : 'Tube and bus', gbp: c.transport * p },
    { label: 'Phone', gbp: c.phone * p },
    { label: 'Everything else', gbp: c.other * p },
  ]
  const outgoings = items.reduce((a, i) => a + i.gbp, 0)
  const mine = takeHome(salaryFor(s), onDate, ov).monthly
  const partner = s.partner && s.partnerWorks ? takeHome(s.partnerSalary, onDate, ov).monthly : 0
  return { takeHome: mine, partnerTakeHome: partner, items, outgoings, left: mine + partner - outgoings }
}

function deposit(c: CityProfile, s: ScenarioInput, onDate: string, ov?: RuleOverrides): number {
  const weekly = (c.rent[s.housing] * 12) / 52
  return weekly * rule('depositWeeks', onDate, ov)
}

/** Months of living costs your savings must cover: the job hunt, plus your first month at work before payday. */
export function runwayMonths(s: ScenarioInput): number {
  return s.jobHuntMonths + 1
}

/** Everything you need saved before you go, grouped like the map's three lines. Pounds. */
export function upfrontCosts(s: ScenarioInput, landDate: string, ov?: RuleOverrides): { groups: CostGroup[]; total: number } {
  const c = CITIES[s.city]
  const p = people(s)
  const r = s.rate
  const visaYears = rule('visaYears', landDate, ov)

  const paper: LineItem[] = [
    { label: p > 1 ? 'Visa fees, 2 people' : 'Visa fee', gbp: rule('visaFee', landDate, ov) * p },
    { label: `Health surcharge, ${visaYears} years${p > 1 ? ', 2 people' : ''}`, gbp: rule('ihsPerYear', landDate, ov) * visaYears * p },
    {
      label: 'TB test and certificates',
      gbp: (rule('tbTestZar', landDate, ov) * p) / r + rule('groCertificate', landDate, ov) + (rule('saUnabridgedZar', landDate, ov) * 2) / r,
    },
  ]

  const living = monthlyBudget(s, landDate, ov)
  const rent = c.rent[s.housing]
  const move: LineItem[] = [
    { label: p > 1 ? 'Flights, 2 people' : 'Flight', gbp: s.flightGbp * p },
    { label: `First ${s.tempNights} nights`, gbp: s.tempNights * c.tempNightly },
    { label: "Deposit and first month's rent", gbp: deposit(c, s, landDate, ov) + rent },
    { label: 'Bedding, SIM, basics', gbp: 300 + 100 * (p - 1) },
  ]

  const months = runwayMonths(s)
  const runway: LineItem[] = [{ label: 'Month 1, rent already paid', gbp: living.outgoings - rent }]
  if (months > 1) runway.push({ label: months === 2 ? 'Month 2' : `Months 2 to ${months}`, gbp: living.outgoings * (months - 1) })
  if (s.bufferGbp > 0) runway.push({ label: 'Safety buffer', gbp: s.bufferGbp })

  const groups: CostGroup[] = [
    { id: 'paper', label: 'Paperwork and visa', items: paper, total: sum(paper) },
    { id: 'move', label: 'Getting there', items: move, total: sum(move) },
    { id: 'runway', label: `Runway, ${months} month${months === 1 ? '' : 's'}`, items: runway, total: sum(runway) },
  ]
  return { groups, total: sum(groups.map((g) => ({ label: g.label, gbp: g.total }))) }
}

function sum(items: LineItem[]): number {
  return items.reduce((a, i) => a + i.gbp, 0)
}

/**
 * Your savings month by month after landing, in pounds.
 * Starts with what's left after paperwork and getting there, falls through the job hunt,
 * then rises once pay arrives. Index 0 is the day you land.
 */
export function runwaySeries(s: ScenarioInput, landDate: string, ov?: RuleOverrides, extraMonths = 3): number[] {
  const costs = upfrontCosts(s, landDate, ov)
  const runway = costs.groups.find((g) => g.id === 'runway')!.total
  const living = monthlyBudget(s, landDate, ov)
  const rent = CITIES[s.city].rent[s.housing]
  const months = runwayMonths(s)
  const out = [runway]
  let bal = runway
  for (let m = 1; m <= months + extraMonths; m++) {
    if (m === 1) bal -= living.outgoings - rent
    else if (m <= months) bal -= living.outgoings
    else bal += living.left
    out.push(bal)
  }
  return out
}

// ---------- the number and the date ----------

export interface Plan {
  landDate: string
  /** When the money must be in your account: statements are needed when you apply */
  fundsDeadline: string
  /** Earliest landing allowed by the paperwork lead time */
  earliestLand: string
  targetGbp: number
  targetZar: number
  remainingZar: number
  /** When your savings reach the target at your current pace, or null if they never will */
  readyDate: string | null
  /** In date mode: what you'd need to save each month to hit the deadline */
  neededPerMonthZar: number
  onTrack: boolean
  /** In date mode: the landing date your current pace supports */
  paceLandDate: string | null
}

function readyDateFor(remainingZar: number, monthlyZar: number, today: string): string | null {
  if (remainingZar <= 0) return today
  if (monthlyZar <= 0) return null
  return addMonths(today, Math.ceil(remainingZar / monthlyZar))
}

export function earliestLanding(s: ScenarioInput, today: string, ov?: RuleOverrides): string {
  // Certificates first, then a month for the TB test and application, then the decision.
  return addMonths(today, s.certLeadMonths + 1 + Math.ceil(rule('decisionWeeks', today, ov) / 4))
}

/** Works out the number, and in "when I've saved enough" mode, the landing date too. */
export function plan(s: ScenarioInput, savings: SavingsState, today: string, ov?: RuleOverrides): Plan {
  const window = rule('applyWindowMonths', today, ov)
  const earliestLand = earliestLanding(s, today, ov)
  const target = (land: string) => upfrontCosts(s, land, ov).total

  let land = s.landMode === 'date' ? s.landDate : earliestLand
  if (s.landMode === 'saved') {
    // The number depends on the date (rules in force) and the date on the number, so settle them together.
    for (let i = 0; i < 4; i++) {
      const zar = target(land) * s.rate
      const ready = readyDateFor(zar - savings.savedZar, savings.monthlyZar, today)
      const next = ready ? maxDate(addMonths(ready, window), earliestLand) : addMonths(today, 120)
      if (next === land) break
      land = next
    }
  }

  const targetGbp = target(land)
  const targetZar = targetGbp * s.rate
  const remainingZar = Math.max(0, targetZar - savings.savedZar)
  const fundsDeadline = addMonths(land, -window)
  const readyDate = readyDateFor(remainingZar, savings.monthlyZar, today)
  const monthsToDeadline = Math.max(1, monthsBetween(today, fundsDeadline))
  const neededPerMonthZar = remainingZar / monthsToDeadline
  const onTrack = readyDate !== null && readyDate <= fundsDeadline && land >= earliestLand
  const paceLandDate = readyDate ? maxDate(addMonths(readyDate, window), earliestLand) : null
  return { landDate: land, fundsDeadline, earliestLand, targetGbp, targetZar, remainingZar, readyDate, neededPerMonthZar, onTrack, paceLandDate }
}

// ---------- partner ----------

export function partnerCanCome(s: ScenarioInput, applyDate: string, ov?: RuleOverrides): boolean {
  if (!s.partner) return true
  if (s.partnerMarried) return true
  if (!s.partnerSince) return false
  return monthsBetween(s.partnerSince, applyDate) >= rule('partnerRelationshipYears', applyDate, ov) * 12
}

// ---------- progress ----------

export const ROUTE_PLACES: { at: number; name: string; over: string }[] = [
  { at: 0, name: 'Cape Town', over: 'still in Cape Town' },
  { at: 0.06, name: 'Namaqualand', over: 'over Namaqualand' },
  { at: 0.15, name: 'Namibia', over: 'over Namibia' },
  { at: 0.27, name: 'Angola', over: 'over Angola' },
  { at: 0.35, name: 'Congo River', over: 'over the Congo River' },
  { at: 0.45, name: 'Cameroon', over: 'over Cameroon' },
  { at: 0.55, name: 'Lake Chad', over: 'over Lake Chad' },
  { at: 0.7, name: 'Sahara', over: 'over the Sahara' },
  { at: 0.85, name: 'Mediterranean', over: 'over the Mediterranean' },
  { at: 0.94, name: 'France', over: 'over France' },
  { at: 1, name: 'Manchester', over: 'there' },
]

export function progress(savedZar: number, targetZar: number) {
  const pct = targetZar > 0 ? Math.min(1, Math.max(0, savedZar / targetZar)) : 0
  const place = [...ROUTE_PLACES].reverse().find((p) => pct >= p.at) ?? ROUTE_PLACES[0]
  return { pct, place }
}
