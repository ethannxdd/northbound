import { AREAS, CITIES, rentFor, type Area } from './cities'
import { packTakeHome, type DestinationPack } from './pack'
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
  return s.ukSalary > 0 ? s.ukSalary : cityOf(s).salary
}

// ---------- the destination: built-in UK, or an imported plan ----------

/** What the screens need to know about the city you're moving to, wherever it is. */
export interface CityView {
  id: string
  name: string
  rent: Record<'room' | 'studio' | 'onebed', number>
  bills: Record<'room' | 'studio' | 'onebed', number>
  food: number
  transport: number
  phone: number
  other: number
  salary: number
  tempNightly: number
  daylight?: number[]
  wetDays?: number
  transportNote?: string
  coffee?: number
  photo?: string
  photoCredit?: string
  areas: Area[]
}

export function packCity(pack: DestinationPack, id: string | undefined) {
  return pack.cities.find((c) => c.id === id) ?? pack.cities[0]
}

export function cityOf(s: ScenarioInput): CityView {
  const fromClaude = claudeJob(s)
  if (s.pack) {
    const c = packCity(s.pack, s.destCity)
    return { ...c, salary: fromClaude?.salary ?? c.typicalSalary, areas: c.areas ?? [] }
  }
  const c = CITIES[s.city]
  return { ...c, salary: fromClaude?.salary ?? c.itSupportSalary, areas: AREAS[s.city] }
}

export const DEFAULT_JOB = 'IT technical support'

const sameJob = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ')

/** Claude's research on the job, if it was done for the job this scenario targets now. */
function claudeJob(s: ScenarioInput) {
  const j = s.details?.job
  if (!j || !(j.salary > 0)) return undefined
  return !s.jobTitle || sameJob(j.title, s.jobTitle) ? j : undefined
}

export interface TargetJob {
  /** The job title this scenario aims for */
  title: string
  /** The salary the plan uses, yearly, in the destination currency */
  salary: number
  /** True when you set the salary yourself */
  yours: boolean
  /** The typical salary for the job in this city */
  typical: number
  range?: { low: number; high: number }
  /** Where the typical figure comes from */
  source: 'claude' | 'plan' | 'northbound'
  basis?: string
  /** The date the research was done, when it's from Claude */
  researchedOn?: string
  /** You changed the job title after Claude's research, so its salary isn't used */
  stale: boolean
}

/** The job this scenario targets, with the salary the plan uses and where that figure comes from. */
export function targetJob(s: ScenarioInput): TargetJob {
  const title = s.jobTitle?.trim() || s.details?.job?.title || DEFAULT_JOB
  const fromClaude = claudeJob(s)
  const typical = cityOf(s).salary
  const stale = !!s.details?.job && !fromClaude
  return {
    title,
    salary: s.ukSalary > 0 ? s.ukSalary : typical,
    yours: s.ukSalary > 0,
    typical,
    range: fromClaude?.range,
    source: fromClaude ? 'claude' : s.pack ? 'plan' : 'northbound',
    basis: fromClaude?.basis ?? (s.pack ? `The typical salary in your plan "${s.pack.title}"` : `Northbound's typical IT support salary in ${CITIES[s.city].name}`),
    researchedOn: fromClaude ? s.details?.createdOn : undefined,
    stale,
  }
}

/** Rent for the scenario's housing, scaled to the neighbourhood if one is picked. */
export function rentOf(s: ScenarioInput, area: string | undefined = s.area): number {
  if (!s.pack) return rentFor(s.city, s.housing, area)
  const c = cityOf(s)
  const a = c.areas.find((x) => x.id === area)
  if (!a) return c.rent[s.housing]
  return Math.round((c.rent[s.housing] * a.room) / c.rent.room / 10) * 10
}

/** Take-home pay under the destination's tax rules. */
export function takeHomeFor(s: ScenarioInput, gross: number, onDate: string, ov?: RuleOverrides): TakeHome {
  return s.pack ? packTakeHome(gross, s.pack.tax) : takeHome(gross, onDate, ov)
}

/** How long before travel you can apply. */
export function applyWindow(s: ScenarioInput, onDate: string, ov?: RuleOverrides): number {
  return s.pack ? s.pack.visa.applyMonthsBefore : rule('applyWindowMonths', onDate, ov)
}

export function decisionWeeks(s: ScenarioInput, onDate: string, ov?: RuleOverrides): number {
  return s.pack ? s.pack.visa.decisionWeeks : rule('decisionWeeks', onDate, ov)
}

/** The destination currency's symbol: £ for the UK route. */
export function currencyOf(s: ScenarioInput): { code: string; symbol: string; name: string } {
  if (!s.pack) return { code: 'GBP', symbol: '£', name: 'pound' }
  const c = s.pack.currency
  return { code: c.code, symbol: c.symbol, name: c.name ?? c.code }
}

export function visaName(s: ScenarioInput): string {
  return s.pack ? s.pack.visa.name : 'UK Ancestry visa'
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
  /** Added or corrected by Claude's details file */
  fromDetails?: boolean
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
  const hidden = new Set(s.hidden ?? [])
  const items: LineItem[] = allMonthlyItems(s).filter((i) => !hidden.has(`month:${i.key}`))
  const rp = repayments(borrowing)
  if (rp.loanZar > 0) items.push({ key: 'loanRepay', label: 'Loan repayment', gbp: rp.loanZar / s.rate, basis: `${borrowing?.loanMonths ?? 60} months at ${borrowing?.loanRatePct ?? 0}%` })
  if (rp.cardZar > 0) items.push({ key: 'cardRepay', label: 'Card repayment', gbp: rp.cardZar / s.rate, basis: `Cleared over ${CARD_PAYOFF_MONTHS} months at ${borrowing?.cardRatePct ?? 0}%` })
  const outgoings = items.reduce((a, i) => a + i.gbp, 0)
  const mine = takeHomeFor(s, salaryFor(s), onDate, ov).monthly
  const partner = s.partner && s.partnerWorks ? takeHomeFor(s, s.partnerSalary, onDate, ov).monthly : 0
  return { takeHome: mine, partnerTakeHome: partner, items, outgoings, left: mine + partner - outgoings }
}

/**
 * Every living cost in a month there, before loan repayments, including ones removed from the scenario.
 * Claude's details file can correct a figure or add a monthly cost.
 */
export function allMonthlyItems(s: ScenarioInput): LineItem[] {
  const c = cityOf(s)
  const p = people(s)
  const each = p > 1 ? ' for 2 people' : ''
  const items: LineItem[] = [
    { key: 'rent', label: s.housing === 'room' ? 'Rent, room in a share' : s.housing === 'studio' ? 'Rent, studio' : 'Rent, 1-bed flat', gbp: rentOf(s), basis: s.area ? 'Your chosen neighbourhood' : `The ${c.name} average` },
    { key: 'food', label: 'Food', gbp: c.food * p, basis: `Groceries and some eating out${each}` },
    { key: 'bills', label: s.pack ? 'Bills' : 'Bills and council tax', gbp: c.bills[s.housing], basis: s.pack ? 'Energy, water, internet and local tax' : 'Energy, water, internet and council tax' },
    { key: 'transport', label: s.pack ? 'Getting around' : s.city === 'manchester' ? 'Bus and tram' : 'Tube and bus', gbp: c.transport * p, basis: `A monthly pass${each}` },
    { key: 'phone', label: 'Phone', gbp: c.phone * p, basis: `A SIM-only contract${each}` },
    { key: 'other', label: 'Everything else', gbp: c.other * p, basis: `Clothes, going out, toiletries, subscriptions${each}` },
  ]
  const d = s.details
  if (!d) return items
  const toLocal = (amount: number, currency: 'ZAR' | 'local' | undefined) => (currency === 'ZAR' ? amount / s.rate : amount)
  const fixed = items.map((i) => {
    const fix = d.items.find((x) => x.ref === `month:${i.key}` && x.amount !== undefined)
    return fix ? { ...i, gbp: toLocal(fix.amount!, fix.currency), basis: fix.cost ?? fix.summary ?? 'Figure from Claude\'s update', fromDetails: true } : i
  })
  for (const x of d.addMonthly ?? []) fixed.push({ key: `d-${x.key}`, label: x.label + (x.perPerson && p > 1 ? ', 2 people' : ''), gbp: toLocal(x.amount, x.currency) * (x.perPerson ? p : 1), basis: x.basis, fromDetails: true })
  return fixed
}

/** Rent in the monthly budget: 0 if you removed it (say, staying with family). */
function rentInBudget(living: MonthlyBudget): number {
  return living.items.find((i) => i.key === 'rent')?.gbp ?? 0
}

function deposit(s: ScenarioInput, onDate: string, ov?: RuleOverrides): number {
  const weekly = (rentOf(s) * 12) / 52
  return weekly * rule('depositWeeks', onDate, ov)
}

/** Months of living costs your savings must cover: the job hunt, plus your first month at work before payday. */
export function runwayMonths(s: ScenarioInput): number {
  return s.jobHuntMonths + 1
}

/**
 * Everything you need saved before you go, grouped like the map's three lines. Pounds. This is the baseline: no quotes.
 * Claude's details file can correct a figure or add a cost; items you removed from the scenario are left out.
 */
export function upfrontCosts(s: ScenarioInput, landDate: string, ov?: RuleOverrides): { groups: CostGroup[]; total: number } {
  const hidden = new Set(s.hidden ?? [])
  const groups = allUpfrontCosts(s, landDate, ov).groups.map((g) => {
    const items = g.items.filter((i) => !hidden.has(`cost:${i.key}`))
    return { ...g, items, total: sum(items) }
  })
  return { groups, total: groups.reduce((a, g) => a + g.total, 0) }
}

/** Every cost line, including the ones removed from the scenario, so they can be listed and restored. */
export function allUpfrontCosts(s: ScenarioInput, landDate: string, ov?: RuleOverrides): { groups: CostGroup[]; total: number } {
  const base = s.pack ? packUpfrontCosts(s, s.pack, landDate) : ukUpfrontCosts(s, landDate, ov)
  const d = s.details
  if (!d) return base
  const p = people(s)
  const toLocal = (amount: number, currency: 'ZAR' | 'local' | undefined) => (currency === 'ZAR' ? amount / s.rate : amount)
  const groups = base.groups.map((g) => {
    const items = g.items.map((i) => {
      const fix = d.items.find((x) => x.ref === `cost:${i.key}` && x.amount !== undefined)
      return fix ? { ...i, gbp: toLocal(fix.amount!, fix.currency), basis: fix.cost ?? fix.summary ?? 'Figure from Claude\'s update', ruleKeys: undefined, fromDetails: true } : i
    })
    for (const x of (d.addCosts ?? []).filter((c) => c.group === g.id))
      items.push({ key: `d-${x.key}`, label: x.label + (x.perPerson && p > 1 ? ', 2 people' : ''), gbp: toLocal(x.amount, x.currency) * (x.perPerson ? p : 1), basis: x.basis, fromDetails: true })
    return { ...g, items, total: sum(items) }
  })
  return { groups, total: groups.reduce((a, g) => a + g.total, 0) }
}

function ukUpfrontCosts(s: ScenarioInput, landDate: string, ov?: RuleOverrides): { groups: CostGroup[]; total: number } {
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
  const rent = rentOf(s)
  const depositWeeks = rule('depositWeeks', landDate, ov)
  const move: LineItem[] = [
    { key: 'flight', label: `One-way flight${two}`, gbp: s.flightGbp * p, basis: `Cape Town to ${c.name}, ${money(s.flightGbp)}${times}` },
    { key: 'monthlyLet', label: `Monthly let, first ${s.tempNights} nights`, gbp: s.tempNights * c.tempNightly, basis: `${s.tempNights} nights at ${money(c.tempNightly)} while you find a place` },
    { key: 'deposit', label: `Deposit (${depositWeeks} weeks)`, gbp: deposit(s, landDate, ov), basis: `${depositWeeks} weeks of ${money(rent)} a month rent, the legal maximum`, ruleKeys: ['depositWeeks'] },
    { key: 'firstRent', label: "First month's rent", gbp: rent, basis: 'Paid before you get the keys' },
    { key: 'basics', label: 'Bedding, SIM, basics', gbp: 300 + 100 * (p - 1), basis: p > 1 ? '£300, plus £100 for a second person' : 'A rough allowance of £300' },
  ]

  const months = runwayMonths(s)
  const runway: LineItem[] = [rentInBudget(living) > 0 ? { key: 'runway1', label: 'Month 1 living, rent already paid', gbp: living.outgoings - rentInBudget(living), basis: `${money(Math.round(living.outgoings))} a month, less the rent you paid up front` } : { key: 'runway1', label: 'Month 1 living', gbp: living.outgoings, basis: `${money(Math.round(living.outgoings))} a month, with no rent` }]
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

/** The same three groups, from an imported plan. Amounts in the destination currency. */
function packUpfrontCosts(s: ScenarioInput, pack: DestinationPack, landDate: string): { groups: CostGroup[]; total: number } {
  const c = cityOf(s)
  const p = people(s)
  const r = s.rate
  const two = p > 1 ? ', 2 people' : ''
  const times = p > 1 ? ' × 2 people' : ''
  const sym = pack.currency.symbol
  const m = (n: number) => sym + n.toLocaleString('en-GB', { maximumFractionDigits: 2 })
  const local = (amount: number, currency: 'ZAR' | 'local' | undefined) => (currency === 'ZAR' ? amount / r : amount)
  const v = pack.visa
  const extra = (g: 'paper' | 'move' | 'runway'): LineItem[] =>
    (pack.extraCosts ?? [])
      .filter((x) => x.group === g)
      .map((x) => ({ key: `x-${x.key}`, label: x.label + (x.perPerson && p > 1 ? ', 2 people' : ''), gbp: local(x.amount, x.currency) * (x.perPerson ? p : 1), basis: x.basis }))

  const paper: LineItem[] = [{ key: 'visaFee', label: `${v.name} fee${two}`, gbp: v.feePerPerson * p, basis: `${m(v.feePerPerson)} a person${times}` }]
  if (v.healthPerYear)
    paper.push({ key: 'ihs', label: `Health cover, ${v.years} years${two}`, gbp: v.healthPerYear * v.years * p, basis: `${m(v.healthPerYear)} a year × ${v.years} years${times}` })
  for (const d of pack.documents)
    if (d.cost) paper.push({ key: `doc-${d.key}`, label: d.name, gbp: local(d.cost, d.costCurrency), basis: d.costCurrency === 'ZAR' ? `R${d.cost.toLocaleString('en-GB')} from ${d.from}` : `From ${d.from}` })
  paper.push(...extra('paper'))

  const living = monthlyBudget(s, landDate)
  const rent = rentOf(s)
  const move: LineItem[] = [
    { key: 'flight', label: `One-way flight${two}`, gbp: (s.flightGbp || pack.move.flightPerPerson) * p, basis: `Cape Town to ${c.name}, ${m(s.flightGbp || pack.move.flightPerPerson)}${times}` },
    { key: 'monthlyLet', label: `Short let, first ${s.tempNights} nights`, gbp: s.tempNights * c.tempNightly, basis: `${s.tempNights} nights at ${m(c.tempNightly)} while you find a place` },
    { key: 'deposit', label: `Deposit (${pack.move.depositMonths} month${pack.move.depositMonths === 1 ? '' : 's'})`, gbp: rent * pack.move.depositMonths, basis: `${pack.move.depositMonths} × ${m(rent)} a month rent` },
    { key: 'firstRent', label: "First month's rent", gbp: rent, basis: 'Paid before you get the keys' },
    { key: 'basics', label: 'Bedding, SIM, basics', gbp: pack.move.basics * (p > 1 ? 1.33 : 1), basis: 'A rough allowance' },
    ...extra('move'),
  ]

  const months = runwayMonths(s)
  const runway: LineItem[] = [rentInBudget(living) > 0 ? { key: 'runway1', label: 'Month 1 living, rent already paid', gbp: living.outgoings - rentInBudget(living), basis: `${m(Math.round(living.outgoings))} a month, less the rent you paid up front` } : { key: 'runway1', label: 'Month 1 living', gbp: living.outgoings, basis: `${m(Math.round(living.outgoings))} a month, with no rent` }]
  if (months > 1) runway.push({ key: 'runwayRest', label: months === 2 ? 'Month 2 living' : `Months 2 to ${months} living`, gbp: living.outgoings * (months - 1), basis: `${m(Math.round(living.outgoings))} a month × ${months - 1}, until your first payday` })
  if (s.bufferGbp > 0) runway.push({ key: 'buffer', label: 'Safety buffer', gbp: s.bufferGbp, basis: 'Your own cushion for surprises' })
  runway.push(...extra('runway'))

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
  /** Added or corrected by Claude's details file */
  fromDetails?: boolean
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
      return { key: i.key, label: i.label, basis: i.basis, ruleKeys: i.ruleKeys, baselineGbp: i.gbp, mineGbp: mine, planGbp: mine ?? i.gbp, custom: false, quoteCount: counts.get(i.key) ?? 0, fromDetails: i.fromDetails }
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
  const months = runwayMonths(s)
  const out = [runway]
  let bal = runway
  for (let m = 1; m <= months + extraMonths; m++) {
    if (m === 1) bal -= living.outgoings - rentInBudget(living)
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
  return addMonths(today, s.certLeadMonths + 1 + Math.ceil(decisionWeeks(s, today, ov) / 4))
}

/**
 * Works out the number, and in "when I've saved enough" mode, the landing date too.
 * The number is the plan total: your quotes where you have them, the baseline everywhere else.
 */
export function plan(s: ScenarioInput, savings: SavingsState, today: string, ov?: RuleOverrides, extras: PlanExtras = {}): Plan {
  const window = applyWindow(s, today, ov)
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
  if (s.pack) {
    const years = s.pack.visa.partnerRelationshipYears
    if (years === null) return false
    if (s.partnerMarried || !years) return true
    if (!s.partnerSince) return false
    return monthsBetween(s.partnerSince, applyDate) >= years * 12
  }
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

/** The places along the flight. An imported plan can name its own; otherwise just the two ends. */
export function routePlaces(s?: ScenarioInput): { at: number; name: string; over: string }[] {
  if (!s?.pack) return ROUTE_PLACES
  const city = cityOf(s).name
  return [
    ROUTE_PLACES[0],
    ...(s.pack.route ?? []).filter((r) => r.at > 0 && r.at < 1).map((r) => ({ at: r.at, name: r.name, over: `over ${r.name}` })),
    { at: 1, name: city, over: 'there' },
  ]
}

export function progress(savedZar: number, targetZar: number, places = ROUTE_PLACES) {
  const pct = targetZar > 0 ? Math.min(1, Math.max(0, savedZar / targetZar)) : 0
  const place = [...places].reverse().find((p) => pct >= p.at) ?? places[0]
  return { pct, place }
}
