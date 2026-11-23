import { CITIES, rentFor, type CityProfile } from './cities'
import { addMonths, maxDate, monthsBetween } from './dates'
import { rule, type RuleKey, type RuleOverrides } from './rules'
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
  /** Stable id, used to attach quotes. Never reuse a key for a different cost. */
  key: string
  label: string
  gbp: number
  /** Short "how it's worked out" line shown under the name */
  basis?: string
  /** The rules this figure uses, so the UI can link to them */
  ruleKeys?: RuleKey[]
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

// ---------- loans and credit ----------

/** Borrowing towards the move, in rand. Lives on the profile, so it applies to every scenario. */
export interface Borrowing {
  loanZar?: number
  loanMonths?: number
  /** Yearly interest rate, in percent */
  loanRatePct?: number
  /** Credit card limit you plan to use */
  cardZar?: number
  cardRatePct?: number
}

/** A credit card balance is planned as paid off over this many months. */
export const CARD_PAYOFF_MONTHS = 24

/** Standard amortisation: the fixed monthly payment that clears `principal` over `months` at `ratePct` a year. */
export function repayment(principal: number, ratePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  const r = ratePct / 100 / 12
  if (r === 0) return principal / months
  return (principal * r) / (1 - Math.pow(1 + r, -months))
}

export interface Repayments {
  /** Rand a month */
  loanZar: number
  cardZar: number
  totalZar: number
  /** Total borrowed, rand */
  borrowedZar: number
  /** Interest over the whole term, rand */
  interestZar: number
}

export function repayments(b: Borrowing | undefined): Repayments {
  const loan = Math.max(0, b?.loanZar ?? 0)
  const card = Math.max(0, b?.cardZar ?? 0)
  const loanMonths = b?.loanMonths && b.loanMonths > 0 ? b.loanMonths : 60
  const loanZar = repayment(loan, b?.loanRatePct ?? 0, loanMonths)
  const cardZar = repayment(card, b?.cardRatePct ?? 0, CARD_PAYOFF_MONTHS)
  return {
    loanZar,
    cardZar,
    totalZar: loanZar + cardZar,
    borrowedZar: loan + card,
    interestZar: Math.max(0, loanZar * loanMonths - loan) + Math.max(0, cardZar * CARD_PAYOFF_MONTHS - card),
  }
}

/**
 * What a month costs the household in the UK, and what's left once everyone is paid.
 * With borrowing, the loan and card repayments are lines too, so "left" includes them.
 * The runway (what you save before going) never includes repayments.
 */
export function monthlyBudget(s: ScenarioInput, onDate: string, ov?: RuleOverrides, borrowing?: Borrowing): MonthlyBudget {
  const c = CITIES[s.city]
  const p = people(s)
  const items: LineItem[] = [
    { key: 'rent', label: s.housing === 'room' ? 'Rent, room in a share' : s.housing === 'studio' ? 'Rent, studio' : 'Rent, 1-bed flat', gbp: rentFor(s.city, s.housing, s.area) },
    { key: 'food', label: 'Food', gbp: c.food * p },
    { key: 'bills', label: 'Bills and council tax', gbp: c.bills[s.housing] },
    { key: 'transport', label: s.city === 'manchester' ? 'Bus and tram' : 'Tube and bus', gbp: c.transport * p },
    { key: 'phone', label: 'Phone', gbp: c.phone * p },
    { key: 'other', label: 'Everything else', gbp: c.other * p },
  ]
  const rp = repayments(borrowing)
  if (rp.loanZar > 0) items.push({ key: 'loanRepay', label: 'Loan repayment', gbp: rp.loanZar / s.rate, basis: `${borrowing?.loanMonths ?? 60} months at ${borrowing?.loanRatePct ?? 0}%` })
  if (rp.cardZar > 0) items.push({ key: 'cardRepay', label: 'Card repayment', gbp: rp.cardZar / s.rate, basis: `Cleared over ${CARD_PAYOFF_MONTHS} months at ${borrowing?.cardRatePct ?? 0}%` })
  const outgoings = items.reduce((a, i) => a + i.gbp, 0)
  const mine = takeHome(salaryFor(s), onDate, ov).monthly
  const partner = s.partner && s.partnerWorks ? takeHome(s.partnerSalary, onDate, ov).monthly : 0
  return { takeHome: mine, partnerTakeHome: partner, items, outgoings, left: mine + partner - outgoings }
}

function deposit(_c: CityProfile, s: ScenarioInput, onDate: string, ov?: RuleOverrides): number {
  const weekly = (rentFor(s.city, s.housing, s.area) * 12) / 52
  return weekly * rule('depositWeeks', onDate, ov)
}

/** Months of living costs your savings must cover: the job hunt, plus your first month at work before payday. */
export function runwayMonths(s: ScenarioInput): number {
  return s.jobHuntMonths + 1
}

/** Everything you need saved before you go, grouped like the map's three lines. Pounds. This is the baseline: no quotes. */
export function upfrontCosts(s: ScenarioInput, landDate: string, ov?: RuleOverrides): { groups: CostGroup[]; total: number } {
  const c = CITIES[s.city]
  const p = people(s)
  const r = s.rate
  const visaYears = rule('visaYears', landDate, ov)
  const two = p > 1 ? ', 2 people' : ''
  const times = p > 1 ? ' × 2 people' : ''

  const visaFee = rule('visaFee', landDate, ov)
  const ihs = rule('ihsPerYear', landDate, ov)
  const tb = rule('tbTestZar', landDate, ov)
  const gro = rule('groCertificate', landDate, ov)
  const sa = rule('saUnabridgedZar', landDate, ov)
  const paper: LineItem[] = [
    { key: 'visaFee', label: `UK Ancestry visa fee${two}`, gbp: visaFee * p, basis: `${money(visaFee)} a person, set by the Home Office`, ruleKeys: ['visaFee'] },
    {
      key: 'ihs',
      label: `Immigration Health Surcharge, ${visaYears} years${two}`,
      gbp: ihs * visaYears * p,
      basis: `${money(ihs)} a year × ${visaYears} years${times}`,
      ruleKeys: ['ihsPerYear', 'visaYears'],
    },
    { key: 'tbTest', label: `TB test${two}`, gbp: (tb * p) / r, basis: `${money(tb, 'R')} at an approved clinic${times}`, ruleKeys: ['tbTestZar'] },
    { key: 'groCert', label: "Gran's birth certificate (GRO)", gbp: gro, basis: `${money(gro)} from the General Register Office`, ruleKeys: ['groCertificate'] },
    { key: 'saCerts', label: 'Unabridged birth certificates × 2', gbp: (sa * 2) / r, basis: `${money(sa, 'R')} each from Home Affairs`, ruleKeys: ['saUnabridgedZar'] },
  ]

  const living = monthlyBudget(s, landDate, ov)
  const rent = rentFor(s.city, s.housing, s.area)
  const depositWeeks = rule('depositWeeks', landDate, ov)
  const move: LineItem[] = [
    { key: 'flight', label: `One-way flight${two}`, gbp: s.flightGbp * p, basis: `Cape Town to ${c.name}, ${money(s.flightGbp)}${times}` },
    { key: 'monthlyLet', label: `Monthly let, first ${s.tempNights} nights`, gbp: s.tempNights * c.tempNightly, basis: `${s.tempNights} nights at ${money(c.tempNightly)} while you find a place` },
    { key: 'deposit', label: `Deposit (${depositWeeks} weeks)`, gbp: deposit(c, s, landDate, ov), basis: `${depositWeeks} weeks of ${money(rent)} a month rent, the legal maximum`, ruleKeys: ['depositWeeks'] },
    { key: 'firstRent', label: "First month's rent", gbp: rent, basis: 'Paid before you get the keys' },
    { key: 'basics', label: 'Bedding, SIM, basics', gbp: 300 + 100 * (p - 1), basis: p > 1 ? '£300, plus £100 for a second person' : 'A rough allowance of £300' },
  ]

  const months = runwayMonths(s)
  const runway: LineItem[] = [{ key: 'runway1', label: 'Month 1 living, rent already paid', gbp: living.outgoings - rent, basis: `${money(Math.round(living.outgoings))} a month, less the rent you paid up front` }]
  if (months > 1)
    runway.push({
      key: 'runwayRest',
      label: months === 2 ? 'Month 2 living' : `Months 2 to ${months} living`,
      gbp: living.outgoings * (months - 1),
      basis: `${money(Math.round(living.outgoings))} a month × ${months - 1}, until your first payday`,
    })
  if (s.bufferGbp > 0) runway.push({ key: 'buffer', label: 'Safety buffer', gbp: s.bufferGbp, basis: 'Your own cushion for surprises' })

  const groups: CostGroup[] = [
    { id: 'paper', label: 'Paperwork and visa', items: paper, total: sum(paper) },
    { id: 'move', label: 'Getting there', items: move, total: sum(move) },
    { id: 'runway', label: `Runway, ${months} month${months === 1 ? '' : 's'}`, items: runway, total: sum(runway) },
  ]
  return { groups, total: groups.reduce((a, g) => a + g.total, 0) }
}

function sum(items: LineItem[]): number {
  return items.reduce((a, i) => a + i.gbp, 0)
}

function money(n: number, sym: '£' | 'R' = '£'): string {
  const whole = Math.abs(n - Math.round(n)) < 1e-9
  return sym + n.toLocaleString('en-GB', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 })
}

// ---------- quotes and the plan total ----------

export type Currency = 'GBP' | 'ZAR'

/** A price found for one cost line, or for one of your own costs. */
export interface QuoteLike {
  itemKey: string
  amount: number
  currency: Currency
  /** ISO date */
  foundOn: string
  createdAt: number
}

/** A cost that isn't in the baseline. Its value is its newest quote. */
export interface CustomCostLike {
  id: string
  group: GroupId
  label: string
}

/** A quote in pounds. Rand quotes convert at the scenario's rate. */
export function quoteGbp(q: Pick<QuoteLike, 'amount' | 'currency'>, rate: number): number {
  return q.currency === 'GBP' ? q.amount : q.amount / rate
}

/** Newest first: the latest date found, then the latest added. */
export function sortQuotes<Q extends QuoteLike>(quotes: Q[]): Q[] {
  return [...quotes].sort((a, b) => (a.foundOn === b.foundOn ? b.createdAt - a.createdAt : a.foundOn < b.foundOn ? 1 : -1))
}

/** The quote that counts for each item: the newest one. */
export function newestQuotes<Q extends QuoteLike>(quotes: Q[]): Map<string, Q> {
  const out = new Map<string, Q>()
  for (const q of sortQuotes(quotes)) if (!out.has(q.itemKey)) out.set(q.itemKey, q)
  return out
}

export interface PlanLine {
  key: string
  label: string
  basis?: string
  ruleKeys?: RuleKey[]
  /** Northbound's figure. Null for your own extra costs. */
  baselineGbp: number | null
  /** Your newest quote in pounds, or null */
  mineGbp: number | null
  /** What the plan uses: your quote if you have one, else the baseline */
  planGbp: number
  custom: boolean
  quoteCount: number
}

export interface PlanGroup {
  id: GroupId
  label: string
  lines: PlanLine[]
  baselineGbp: number
  planGbp: number
}

export interface PlanTotal {
  groups: PlanGroup[]
  baselineGbp: number
  /** The number: your quotes where you have them, the baseline everywhere else, plus your own costs */
  planGbp: number
  /** Sum of your newest quotes, baseline items and your own costs */
  mineGbp: number
  /** Baseline items, and how many of them have a price and a quote */
  itemCount: number
  pricedCount: number
  quotedCount: number
  customCount: number
}

/** Plan total = Σ baseline items (newest quote if any, else baseline) + Σ your own costs. */
export function planTotal(costs: { groups: CostGroup[] }, quotes: QuoteLike[] = [], customs: CustomCostLike[] = [], rate: number): PlanTotal {
  const newest = newestQuotes(quotes)
  const counts = new Map<string, number>()
  for (const q of quotes) counts.set(q.itemKey, (counts.get(q.itemKey) ?? 0) + 1)
  let itemCount = 0
  let pricedCount = 0
  let quotedCount = 0
  let mineGbp = 0
  const groups: PlanGroup[] = costs.groups.map((g) => {
    const lines: PlanLine[] = g.items.map((i) => {
      const q = newest.get(i.key)
      const mine = q ? quoteGbp(q, rate) : null
      itemCount++
      if (i.gbp > 0) pricedCount++
      if (mine !== null) {
        quotedCount++
        mineGbp += mine
      }
      return { key: i.key, label: i.label, basis: i.basis, ruleKeys: i.ruleKeys, baselineGbp: i.gbp, mineGbp: mine, planGbp: mine ?? i.gbp, custom: false, quoteCount: counts.get(i.key) ?? 0 }
    })
    for (const c of customs.filter((x) => x.group === g.id)) {
      const q = newest.get(c.id)
      const mine = q ? quoteGbp(q, rate) : null
      if (mine !== null) mineGbp += mine
      lines.push({ key: c.id, label: c.label, baselineGbp: null, mineGbp: mine, planGbp: mine ?? 0, custom: true, quoteCount: counts.get(c.id) ?? 0 })
    }
    return { id: g.id, label: g.label, lines, baselineGbp: g.total, planGbp: lines.reduce((a, l) => a + l.planGbp, 0) }
  })
  return {
    groups,
    baselineGbp: groups.reduce((a, g) => a + g.baselineGbp, 0),
    planGbp: groups.reduce((a, g) => a + g.planGbp, 0),
    mineGbp,
    itemCount,
    pricedCount,
    quotedCount,
    customCount: customs.length,
  }
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
  const rent = rentFor(s.city, s.housing, s.area)
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
  /** Northbound's figure before your quotes, pounds */
  baselineGbp: number
  /** The plan total in pounds: your quotes where you have them */
  targetGbp: number
  targetZar: number
  /** Borrowing towards the move, rand */
  borrowedZar: number
  /** What you need to save yourself: the full cost less what you borrow */
  saveTargetZar: number
  /** Still to save: the save target less what you have */
  remainingZar: number
  /** When your savings reach the target at your current pace, or null if they never will */
  readyDate: string | null
  /** In date mode: what you'd need to save each month to hit the deadline */
  neededPerMonthZar: number
  onTrack: boolean
  /** In date mode: the landing date your current pace supports */
  paceLandDate: string | null
}

export interface PlanExtras {
  quotes?: QuoteLike[]
  customs?: CustomCostLike[]
  borrowing?: Borrowing
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

/**
 * Works out the number, and in "when I've saved enough" mode, the landing date too.
 * The number is the plan total: your quotes where you have them, the baseline everywhere else.
 */
export function plan(s: ScenarioInput, savings: SavingsState, today: string, ov?: RuleOverrides, extras: PlanExtras = {}): Plan {
  const window = rule('applyWindowMonths', today, ov)
  const earliestLand = earliestLanding(s, today, ov)
  const target = (land: string) => planTotal(upfrontCosts(s, land, ov), extras.quotes, extras.customs, s.rate).planGbp

  const borrowed = repayments(extras.borrowing).borrowedZar
  let land = s.landMode === 'date' ? s.landDate : earliestLand
  if (s.landMode === 'saved') {
    // The number depends on the date (rules in force) and the date on the number, so settle them together.
    for (let i = 0; i < 4; i++) {
      const zar = target(land) * s.rate - borrowed
      const ready = readyDateFor(zar - savings.savedZar, savings.monthlyZar, today)
      const next = ready ? maxDate(addMonths(ready, window), earliestLand) : addMonths(today, 120)
      if (next === land) break
      land = next
    }
  }

  const targetGbp = target(land)
  const baselineGbp = upfrontCosts(s, land, ov).total
  const targetZar = targetGbp * s.rate
  const saveTargetZar = Math.max(0, targetZar - borrowed)
  const remainingZar = Math.max(0, saveTargetZar - savings.savedZar)
  const fundsDeadline = addMonths(land, -window)
  const readyDate = readyDateFor(remainingZar, savings.monthlyZar, today)
  const monthsToDeadline = Math.max(1, monthsBetween(today, fundsDeadline))
  const neededPerMonthZar = remainingZar / monthsToDeadline
  const onTrack = readyDate !== null && readyDate <= fundsDeadline && land >= earliestLand
  const paceLandDate = readyDate ? maxDate(addMonths(readyDate, window), earliestLand) : null
  return { landDate: land, fundsDeadline, earliestLand, baselineGbp, targetGbp, targetZar, borrowedZar: Math.min(borrowed, targetZar), saveTargetZar, remainingZar, readyDate, neededPerMonthZar, onTrack, paceLandDate }
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
