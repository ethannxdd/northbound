// A Northbound plan file: a destination country (visa, cities, tax, documents, steps, settlement)
// plus a starting scenario. Claude (or anyone) writes one as JSON; Northbound imports it and runs
// it through the same screens as the built-in UK route. The move always starts from South Africa.

import type { Housing } from './cities'

export const PLAN_FORMAT = 'northbound-plan'
export const PLAN_VERSION = 1

export interface Source {
  label: string
  url: string
  /** ISO date the figure was last checked */
  checked?: string
}

export interface PackCity {
  id: string
  name: string
  /** Monthly rent in the destination currency */
  rent: Record<Housing, number>
  /** Monthly bills (energy, water, internet, local tax) by housing type */
  bills: Record<Housing, number>
  /** Monthly, per person */
  food: number
  transport: number
  phone: number
  other: number
  /** Typical yearly salary for the job you'd do */
  typicalSalary: number
  /** A night in a furnished short let while you look for a place */
  tempNightly: number
  photo?: string
  photoCredit?: string
  coffee?: number
  /** Hours of daylight per month, Jan to Dec */
  daylight?: number[]
  wetDays?: number
  transportNote?: string
  areas?: { id: string; name: string; room: number; commute: string; vibe: string }[]
  sources?: Source[]
}

export interface Band {
  /** Upper edge of the band in yearly gross; null for the top band */
  upTo: number | null
  rate: number
}

export interface PackTax {
  /** Tax-free amount taken off gross before the bands */
  allowance?: number
  bands: Band[]
  /** Fixed yearly credits taken off the tax due */
  credits?: number
  /** Social contributions (pension, health, insurance), as bands on gross */
  social?: Band[]
  note?: string
  sources?: Source[]
}

export interface PackDocument {
  key: string
  name: string
  from: string
  check: string
  /** Cost in rand if bought in South Africa, or in the destination currency */
  cost?: number
  costCurrency?: 'ZAR' | 'local'
  takes?: string
  optional?: string
  url?: string
}

export type CostGroup = 'paper' | 'move' | 'runway'

export interface PackCost {
  key: string
  group: CostGroup
  label: string
  amount: number
  currency: 'ZAR' | 'local'
  perPerson?: boolean
  basis?: string
  source?: string
}

export type PackLine = 'paper' | 'money' | 'move' | 'trunk'

export interface PackStep {
  key: string
  title: string
  /** Short name on the map */
  short?: string
  line: PackLine
  /** Months before landing it's due. Negative means after landing. Use "now" for things to start today. */
  monthsBeforeLanding: number | 'now'
  milestone?: boolean
  cost?: string
  takes?: string
  from?: string
  url?: string
  steps: string[]
}

export interface DestinationPack {
  format: typeof PLAN_FORMAT
  version: number
  /** Stable id, e.g. "ireland-critical-skills". Importing the same id again replaces it. */
  id: string
  title: string
  summary?: string
  createdOn?: string
  country: { code: string; name: string }
  currency: { code: string; symbol: string; name?: string; zarPerUnit: number; rateDate?: string }
  visa: {
    name: string
    summary?: string
    feePerPerson: number
    /** Yearly health surcharge or insurance you pay up front, per person */
    healthPerYear?: number
    /** Years the first permission lasts */
    years: number
    /** How long before travel you can apply */
    applyMonthsBefore: number
    decisionWeeks: number
    /** Months of savings the visa says you must show (0 if none) */
    fundsMonths?: number
    /** Years an unmarried partner must have lived with you; null if partners can't come */
    partnerRelationshipYears?: number | null
    sources?: Source[]
  }
  move: {
    flightPerPerson: number
    /** Deposit, in months of rent */
    depositMonths: number
    basics: number
  }
  cities: PackCity[]
  tax: PackTax
  documents: PackDocument[]
  extraCosts?: PackCost[]
  steps: PackStep[]
  settlement?: {
    name: string
    years: number
    fee?: number
    citizenshipName?: string
    citizenshipYears?: number
    citizenshipFee?: number
    conditions: string[]
    sources?: Source[]
  }
  /** Places to name on the Progress route, from Cape Town (0) to the city (1) */
  route?: { at: number; name: string }[]
  facts?: { timeDifference?: string; language?: string }
  scenario: {
    city: string
    housing: Housing
    partner?: boolean
    jobHuntMonths: number
    /** 0 = the city's typical salary */
    salary?: number
    /** The job you'd aim for there */
    jobTitle?: string
    landMode: 'saved' | 'date'
    landDate?: string
    tempNights: number
    bufferLocal?: number
    /** Months to gather documents before you can apply */
    paperworkMonths?: number
  }
  notes?: string
  sources?: Source[]
}

// ---------- validation ----------

type Errors = string[]
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const HOUSING: Housing[] = ['room', 'studio', 'onebed']
const LINES: PackLine[] = ['paper', 'money', 'move', 'trunk']

function num(e: Errors, o: Record<string, unknown>, k: string, where: string, opt = false, min = 0): number | undefined {
  const v = o[k]
  if (v === undefined || v === null) {
    if (!opt) e.push(`${where}.${k} is missing`)
    return undefined
  }
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min) {
    e.push(`${where}.${k} should be a number${min > -Infinity ? ` of ${min} or more` : ''}`)
    return undefined
  }
  return v
}

function str(e: Errors, o: Record<string, unknown>, k: string, where: string, opt = false): string | undefined {
  const v = o[k]
  if (v === undefined || v === null) {
    if (!opt) e.push(`${where}.${k} is missing`)
    return undefined
  }
  if (typeof v !== 'string' || !v.trim()) {
    e.push(`${where}.${k} should be text`)
    return undefined
  }
  return v
}

function url(e: Errors, o: Record<string, unknown>, k: string, where: string) {
  const v = str(e, o, k, where, true)
  if (v && !/^https?:\/\//i.test(v)) e.push(`${where}.${k} should be a web address starting with https://`)
}

function arr(e: Errors, o: Record<string, unknown>, k: string, where: string, opt = false): unknown[] {
  const v = o[k]
  if (v === undefined && opt) return []
  if (!Array.isArray(v)) {
    e.push(`${where}.${k} should be a list`)
    return []
  }
  return v
}

function bands(e: Errors, list: unknown[], where: string) {
  list.forEach((b, i) => {
    if (!isObj(b)) return e.push(`${where}[${i}] should be an object`)
    if (b.upTo !== null) num(e, b, 'upTo', `${where}[${i}]`)
    const r = num(e, b, 'rate', `${where}[${i}]`)
    if (r !== undefined && r > 1) e.push(`${where}[${i}].rate should be a fraction, like 0.2 for 20%`)
  })
}

function sources(e: Errors, o: Record<string, unknown>, where: string) {
  arr(e, o, 'sources', where, true).forEach((s, i) => {
    if (!isObj(s)) return e.push(`${where}.sources[${i}] should be an object`)
    str(e, s, 'label', `${where}.sources[${i}]`)
    url(e, s, 'url', `${where}.sources[${i}]`)
  })
}

const keyOk = (k: unknown) => typeof k === 'string' && /^[a-z0-9][a-z0-9-]{0,40}$/.test(k)

/** Checks a plan file. Returns the plan, or every problem found, in plain words. */
export function parsePack(input: unknown): { ok: true; pack: DestinationPack } | { ok: false; errors: string[] } {
  let data = input
  if (typeof input === 'string') {
    // Accept the JSON on its own, or inside a ```json code block.
    const fenced = input.match(/```(?:json)?\s*([\s\S]*?)```/)
    try {
      data = JSON.parse((fenced ? fenced[1] : input).trim())
    } catch {
      return { ok: false, errors: ["This isn't valid JSON. Paste the whole file Claude gave you, or the contents of its json code block."] }
    }
  }
  const e: Errors = []
  if (!isObj(data)) return { ok: false, errors: ['The plan should be a JSON object.'] }
  const p = data
  if (p.format !== PLAN_FORMAT) e.push(`format should be "${PLAN_FORMAT}"`)
  if (typeof p.version !== 'number' || p.version > PLAN_VERSION) e.push(`version should be ${PLAN_VERSION}`)
  if (!keyOk(p.id)) e.push('id should be short lowercase words joined by hyphens, like "ireland-critical-skills"')
  if (p.id === 'uk' || p.id === 'uk-ancestry') e.push('id can\'t be "uk": that route is built in')
  str(e, p, 'title', 'plan')

  if (!isObj(p.country)) e.push('country is missing')
  else {
    str(e, p.country, 'code', 'country')
    str(e, p.country, 'name', 'country')
  }
  if (!isObj(p.currency)) e.push('currency is missing')
  else {
    str(e, p.currency, 'code', 'currency')
    str(e, p.currency, 'symbol', 'currency')
    const z = num(e, p.currency, 'zarPerUnit', 'currency')
    if (z !== undefined && z <= 0) e.push('currency.zarPerUnit should be above 0')
  }
  if (!isObj(p.visa)) e.push('visa is missing')
  else {
    const v = p.visa
    str(e, v, 'name', 'visa')
    num(e, v, 'feePerPerson', 'visa')
    num(e, v, 'healthPerYear', 'visa', true)
    num(e, v, 'years', 'visa')
    num(e, v, 'applyMonthsBefore', 'visa')
    num(e, v, 'decisionWeeks', 'visa')
    num(e, v, 'fundsMonths', 'visa', true)
    if (v.partnerRelationshipYears !== null) num(e, v, 'partnerRelationshipYears', 'visa', true)
    sources(e, v, 'visa')
  }
  if (!isObj(p.move)) e.push('move is missing')
  else {
    num(e, p.move, 'flightPerPerson', 'move')
    num(e, p.move, 'depositMonths', 'move')
    num(e, p.move, 'basics', 'move')
  }

  const cityIds = new Set<string>()
  const cities = arr(e, p, 'cities', 'plan')
  if (cities.length === 0) e.push('cities needs at least one city')
  cities.forEach((c, i) => {
    const w = `cities[${i}]`
    if (!isObj(c)) return e.push(`${w} should be an object`)
    if (!keyOk(c.id)) e.push(`${w}.id should be short lowercase words joined by hyphens`)
    else if (cityIds.has(c.id as string)) e.push(`${w}.id "${c.id}" is used twice`)
    else cityIds.add(c.id as string)
    str(e, c, 'name', w)
    for (const k of ['rent', 'bills'] as const) {
      if (!isObj(c[k])) e.push(`${w}.${k} needs room, studio and onebed`)
      else for (const h of HOUSING) num(e, c[k] as Record<string, unknown>, h, `${w}.${k}`)
    }
    for (const k of ['food', 'transport', 'phone', 'other', 'typicalSalary', 'tempNightly']) num(e, c, k, w)
    num(e, c, 'coffee', w, true)
    num(e, c, 'wetDays', w, true)
    url(e, c, 'photo', w)
    if (c.daylight !== undefined && (!Array.isArray(c.daylight) || c.daylight.length !== 12 || c.daylight.some((d) => typeof d !== 'number'))) e.push(`${w}.daylight should be 12 numbers, January to December`)
    arr(e, c, 'areas', w, true).forEach((a, j) => {
      if (!isObj(a)) return e.push(`${w}.areas[${j}] should be an object`)
      if (!keyOk(a.id)) e.push(`${w}.areas[${j}].id should be short lowercase words joined by hyphens`)
      str(e, a, 'name', `${w}.areas[${j}]`)
      num(e, a, 'room', `${w}.areas[${j}]`)
      str(e, a, 'commute', `${w}.areas[${j}]`)
      str(e, a, 'vibe', `${w}.areas[${j}]`)
    })
    sources(e, c, w)
  })

  if (!isObj(p.tax)) e.push('tax is missing')
  else {
    num(e, p.tax, 'allowance', 'tax', true)
    num(e, p.tax, 'credits', 'tax', true)
    const b = arr(e, p.tax, 'bands', 'tax')
    if (b.length === 0) e.push('tax.bands needs at least one band')
    bands(e, b, 'tax.bands')
    bands(e, arr(e, p.tax, 'social', 'tax', true), 'tax.social')
    sources(e, p.tax, 'tax')
  }

  const docKeys = new Set<string>()
  arr(e, p, 'documents', 'plan').forEach((d, i) => {
    const w = `documents[${i}]`
    if (!isObj(d)) return e.push(`${w} should be an object`)
    if (!keyOk(d.key)) e.push(`${w}.key should be short lowercase words joined by hyphens`)
    else if (docKeys.has(d.key as string)) e.push(`${w}.key "${d.key}" is used twice`)
    else docKeys.add(d.key as string)
    for (const k of ['name', 'from', 'check']) str(e, d, k, w)
    num(e, d, 'cost', w, true)
    if (d.costCurrency !== undefined && d.costCurrency !== 'ZAR' && d.costCurrency !== 'local') e.push(`${w}.costCurrency should be "ZAR" or "local"`)
    url(e, d, 'url', w)
  })

  arr(e, p, 'extraCosts', 'plan', true).forEach((c, i) => {
    const w = `extraCosts[${i}]`
    if (!isObj(c)) return e.push(`${w} should be an object`)
    if (!keyOk(c.key)) e.push(`${w}.key should be short lowercase words joined by hyphens`)
    if (!['paper', 'move', 'runway'].includes(c.group as string)) e.push(`${w}.group should be "paper", "move" or "runway"`)
    str(e, c, 'label', w)
    num(e, c, 'amount', w)
    if (c.currency !== 'ZAR' && c.currency !== 'local') e.push(`${w}.currency should be "ZAR" or "local"`)
  })

  const stepKeys = new Set<string>()
  const steps = arr(e, p, 'steps', 'plan')
  if (steps.length === 0) e.push('steps needs at least one step')
  steps.forEach((s, i) => {
    const w = `steps[${i}]`
    if (!isObj(s)) return e.push(`${w} should be an object`)
    if (!keyOk(s.key)) e.push(`${w}.key should be short lowercase words joined by hyphens`)
    else if (['visa-decision', 'land', 'saving'].includes(s.key as string)) e.push(`${w}.key "${s.key}" is reserved: Northbound adds that step itself`)
    else if (stepKeys.has(s.key as string)) e.push(`${w}.key "${s.key}" is used twice`)
    else stepKeys.add(s.key as string)
    str(e, s, 'title', w)
    if (!LINES.includes(s.line as PackLine)) e.push(`${w}.line should be "paper", "money", "move" or "trunk"`)
    if (s.monthsBeforeLanding !== 'now') num(e, s, 'monthsBeforeLanding', w, false, -120)
    if (!Array.isArray(s.steps) || s.steps.some((x) => typeof x !== 'string')) e.push(`${w}.steps should be a list of short instructions`)
    url(e, s, 'url', w)
  })

  if (p.settlement !== undefined) {
    if (!isObj(p.settlement)) e.push('settlement should be an object')
    else {
      str(e, p.settlement, 'name', 'settlement')
      num(e, p.settlement, 'years', 'settlement')
      num(e, p.settlement, 'fee', 'settlement', true)
      num(e, p.settlement, 'citizenshipYears', 'settlement', true)
      num(e, p.settlement, 'citizenshipFee', 'settlement', true)
      if (!Array.isArray(p.settlement.conditions)) e.push('settlement.conditions should be a list')
    }
  }
  arr(e, p, 'route', 'plan', true).forEach((r, i) => {
    if (!isObj(r)) return e.push(`route[${i}] should be an object`)
    const at = num(e, r, 'at', `route[${i}]`)
    if (at !== undefined && at > 1) e.push(`route[${i}].at should be between 0 and 1`)
    str(e, r, 'name', `route[${i}]`)
  })

  if (!isObj(p.scenario)) e.push('scenario is missing')
  else {
    const s = p.scenario
    if (typeof s.city !== 'string' || !cityIds.has(s.city)) e.push('scenario.city should be the id of one of the cities')
    if (!HOUSING.includes(s.housing as Housing)) e.push('scenario.housing should be "room", "studio" or "onebed"')
    num(e, s, 'jobHuntMonths', 'scenario')
    num(e, s, 'salary', 'scenario', true)
    str(e, s, 'jobTitle', 'scenario', true)
    num(e, s, 'tempNights', 'scenario')
    num(e, s, 'bufferLocal', 'scenario', true)
    num(e, s, 'paperworkMonths', 'scenario', true)
    if (s.landMode !== 'saved' && s.landMode !== 'date') e.push('scenario.landMode should be "saved" or "date"')
    if (s.landMode === 'date' && (typeof s.landDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.landDate))) e.push('scenario.landDate should be a date like 2028-03-01')
  }
  sources(e, p, 'plan')

  if (JSON.stringify(p).length > 200_000) e.push('The plan is too big. Keep it under 200 KB.')
  return e.length ? { ok: false, errors: e } : { ok: true, pack: p as unknown as DestinationPack }
}

// ---------- tax ----------

function onBands(amount: number, list: Band[]): number {
  let tax = 0
  let lower = 0
  for (const b of list) {
    const top = b.upTo ?? Infinity
    if (amount > lower) tax += (Math.min(amount, top) - lower) * b.rate
    lower = top
  }
  return tax
}

/** Yearly take-home under a plan's tax rules. */
export function packTakeHome(gross: number, tax: PackTax): { gross: number; tax: number; ni: number; yearly: number; monthly: number } {
  const taxable = Math.max(0, gross - (tax.allowance ?? 0))
  const income = Math.max(0, onBands(taxable, tax.bands) - (tax.credits ?? 0))
  const social = onBands(gross, tax.social ?? [])
  const yearly = gross - income - social
  return { gross, tax: income, ni: social, yearly, monthly: yearly / 12 }
}
