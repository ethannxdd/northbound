// A Northbound details file: Claude's deeper research on one scenario. It adds detail to every item
// the scenario has (documents, map steps, upfront costs, monthly costs, neighbourhoods, settling), can add
// items Northbound is missing, and can correct a figure. It works on the built-in UK route and on imported plans alike.
// Made from the prompt in src/lib/updatePrompt.ts; checked by parseDetails below.

import type { PackCost, PackDocument, PackStep, Source } from './pack'

export const DETAILS_FORMAT = 'northbound-details'
export const DETAILS_VERSION = 1

/** Everything Claude can say about one item. Every field is optional. */
export interface ItemDetail {
  /** One or two sentences: what this is */
  summary?: string
  /** Why it's needed for this scenario */
  why?: string
  /** How to get or do it, in order */
  how?: string[]
  /** What to bring or have ready */
  bring?: string[]
  /** Cost in words, e.g. "R75 at Home Affairs, plus R150 courier" */
  cost?: string
  takes?: string
  /** How long it stays valid, or how recent it must be */
  validFor?: string
  /** Who it applies to, e.g. "You and your partner" */
  forWho?: string
  /** Mistakes that get applications refused, things that catch people out */
  watchOut?: string[]
  tips?: string[]
  sources?: Source[]
}

/**
 * Detail for an existing item. ref is "doc:<key>", "step:<key>", "cost:<key>" (before you go),
 * "month:<key>" (a month there), "area:<id>" (a neighbourhood) or "settle:<key>" (settling).
 */
export interface DetailItem extends ItemDetail {
  ref: string
  /** Only for cost and month refs: a better figure, replacing Northbound's */
  amount?: number
  currency?: 'ZAR' | 'local'
}

export interface ScenarioDetails {
  format: typeof DETAILS_FORMAT
  version: number
  /** The Northbound scenario this was made for */
  scenarioId: string
  scenarioName?: string
  createdOn?: string
  /** A short overview of the whole move under this scenario */
  summary?: string
  items: DetailItem[]
  addDocuments?: (PackDocument & { detail?: ItemDetail })[]
  addSteps?: (PackStep & { detail?: ItemDetail })[]
  addCosts?: (PackCost & { detail?: ItemDetail })[]
  /** Monthly living costs Northbound is missing, such as a TV licence or gym */
  addMonthly?: { key: string; label: string; amount: number; currency: 'ZAR' | 'local'; perPerson?: boolean; basis?: string; detail?: ItemDetail }[]
  /** Anything else worth knowing */
  notes?: string[]
  sources?: Source[]
}

// ---------- checking ----------

type Errors = string[]
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const keyOk = (k: unknown) => typeof k === 'string' && /^[a-z0-9][a-z0-9-]{0,40}$/.test(k)
const RESERVED_STEPS = ['visa-decision', 'land', 'saving']

function text(e: Errors, o: Record<string, unknown>, k: string, w: string, opt = true) {
  const v = o[k]
  if (v === undefined || v === null) return opt || e.push(`${w}.${k} is missing`)
  if (typeof v !== 'string' || !v.trim()) e.push(`${w}.${k} should be text`)
}

function list(e: Errors, o: Record<string, unknown>, k: string, w: string) {
  const v = o[k]
  if (v === undefined) return
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) e.push(`${w}.${k} should be a list of short sentences`)
}

function sources(e: Errors, o: Record<string, unknown>, w: string) {
  const v = o.sources
  if (v === undefined) return
  if (!Array.isArray(v)) return e.push(`${w}.sources should be a list`)
  v.forEach((s, i) => {
    if (!isObj(s)) return e.push(`${w}.sources[${i}] should be an object`)
    text(e, s, 'label', `${w}.sources[${i}]`, false)
    if (typeof s.url !== 'string' || !/^https?:\/\//i.test(s.url)) e.push(`${w}.sources[${i}].url should be a web address starting with https://`)
  })
}

function detail(e: Errors, o: Record<string, unknown>, w: string) {
  for (const k of ['summary', 'why', 'cost', 'takes', 'validFor', 'forWho']) text(e, o, k, w)
  for (const k of ['how', 'bring', 'watchOut', 'tips']) list(e, o, k, w)
  sources(e, o, w)
}

function amount(e: Errors, o: Record<string, unknown>, k: string, w: string, opt: boolean) {
  const v = o[k]
  if (v === undefined && opt) return
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) e.push(`${w}.${k} should be a number of 0 or more`)
}

/**
 * Checks a details file. `refs` are the items the scenario has, so a detail for something that doesn't
 * exist is reported rather than silently dropped.
 */
export function parseDetails(input: unknown, refs?: Set<string>): { ok: true; details: ScenarioDetails } | { ok: false; errors: string[] } {
  let data = input
  if (typeof input === 'string') {
    const fenced = input.match(/```(?:json)?\s*([\s\S]*?)```/)
    try {
      data = JSON.parse((fenced ? fenced[1] : input).trim())
    } catch {
      return { ok: false, errors: ["This isn't valid JSON. Paste the whole file Claude gave you, or the contents of its json code block."] }
    }
  }
  const e: Errors = []
  if (!isObj(data)) return { ok: false, errors: ['The details file should be a JSON object.'] }
  const p = data
  if (p.format === 'northbound-plan') return { ok: false, errors: ['This is a plan file for a new country. Import it in Settings > Plans from Claude instead.'] }
  if (p.format !== DETAILS_FORMAT) e.push(`format should be "${DETAILS_FORMAT}"`)
  if (typeof p.version !== 'number' || p.version > DETAILS_VERSION) e.push(`version should be ${DETAILS_VERSION}`)
  text(e, p, 'scenarioId', 'details', false)
  text(e, p, 'summary', 'details')

  if (!Array.isArray(p.items)) e.push('items should be a list')
  else {
    const seen = new Set<string>()
    p.items.forEach((it, i) => {
      const w = `items[${i}]`
      if (!isObj(it)) return e.push(`${w} should be an object`)
      const ref = it.ref
      if (typeof ref !== 'string' || !/^(doc|step|cost|month|area|settle):[A-Za-z0-9:_-]+$/.test(ref)) return e.push(`${w}.ref should look like "doc:passport", "step:tb-test", "cost:visaFee", "month:food", "area:ancoats" or "settle:english"`)
      if (seen.has(ref)) e.push(`${w}.ref "${ref}" is used twice`)
      seen.add(ref)
      if (refs && !refs.has(ref)) e.push(`${w}.ref "${ref}" isn't an item in this scenario. Use a ref from the list in the prompt, or put new items in addDocuments, addSteps or addCosts.`)
      detail(e, it, w)
      if (it.amount !== undefined) {
        if (!ref.startsWith('cost:') && !ref.startsWith('month:')) e.push(`${w}.amount only works on cost and month refs`)
        amount(e, it, 'amount', w, true)
        if (it.currency !== 'ZAR' && it.currency !== 'local') e.push(`${w}.currency should be "ZAR" or "local" when amount is given`)
      }
    })
  }

  const docKeys = new Set<string>()
  arr(e, p, 'addDocuments').forEach((d, i) => {
    const w = `addDocuments[${i}]`
    if (!isObj(d)) return e.push(`${w} should be an object`)
    if (!keyOk(d.key)) e.push(`${w}.key should be short lowercase words joined by hyphens`)
    else if (docKeys.has(d.key as string)) e.push(`${w}.key "${d.key}" is used twice`)
    else docKeys.add(d.key as string)
    for (const k of ['name', 'from', 'check']) text(e, d, k, w, false)
    amount(e, d, 'cost', w, true)
    if (d.costCurrency !== undefined && d.costCurrency !== 'ZAR' && d.costCurrency !== 'local') e.push(`${w}.costCurrency should be "ZAR" or "local"`)
    if (d.detail !== undefined) isObj(d.detail) ? detail(e, d.detail, `${w}.detail`) : e.push(`${w}.detail should be an object`)
  })

  const stepKeys = new Set<string>()
  arr(e, p, 'addSteps').forEach((s, i) => {
    const w = `addSteps[${i}]`
    if (!isObj(s)) return e.push(`${w} should be an object`)
    if (!keyOk(s.key)) e.push(`${w}.key should be short lowercase words joined by hyphens`)
    else if (RESERVED_STEPS.includes(s.key as string)) e.push(`${w}.key "${s.key}" is reserved`)
    else if (stepKeys.has(s.key as string)) e.push(`${w}.key "${s.key}" is used twice`)
    else stepKeys.add(s.key as string)
    text(e, s, 'title', w, false)
    if (!['paper', 'money', 'move', 'trunk'].includes(s.line as string)) e.push(`${w}.line should be "paper", "money", "move" or "trunk"`)
    if (s.monthsBeforeLanding !== 'now' && (typeof s.monthsBeforeLanding !== 'number' || s.monthsBeforeLanding < -120)) e.push(`${w}.monthsBeforeLanding should be a number or "now"`)
    if (!Array.isArray(s.steps) || s.steps.some((x) => typeof x !== 'string')) e.push(`${w}.steps should be a list of short instructions`)
    if (s.detail !== undefined) isObj(s.detail) ? detail(e, s.detail, `${w}.detail`) : e.push(`${w}.detail should be an object`)
  })

  const costKeys = new Set<string>()
  arr(e, p, 'addCosts').forEach((c, i) => {
    const w = `addCosts[${i}]`
    if (!isObj(c)) return e.push(`${w} should be an object`)
    if (!keyOk(c.key)) e.push(`${w}.key should be short lowercase words joined by hyphens`)
    else if (costKeys.has(c.key as string)) e.push(`${w}.key "${c.key}" is used twice`)
    else costKeys.add(c.key as string)
    if (!['paper', 'move', 'runway'].includes(c.group as string)) e.push(`${w}.group should be "paper", "move" or "runway"`)
    text(e, c, 'label', w, false)
    amount(e, c, 'amount', w, false)
    if (c.currency !== 'ZAR' && c.currency !== 'local') e.push(`${w}.currency should be "ZAR" or "local"`)
    if (c.detail !== undefined) isObj(c.detail) ? detail(e, c.detail, `${w}.detail`) : e.push(`${w}.detail should be an object`)
  })

  const monthKeys = new Set<string>()
  arr(e, p, 'addMonthly').forEach((c, i) => {
    const w = `addMonthly[${i}]`
    if (!isObj(c)) return e.push(`${w} should be an object`)
    if (!keyOk(c.key)) e.push(`${w}.key should be short lowercase words joined by hyphens`)
    else if (monthKeys.has(c.key as string)) e.push(`${w}.key "${c.key}" is used twice`)
    else monthKeys.add(c.key as string)
    text(e, c, 'label', w, false)
    amount(e, c, 'amount', w, false)
    if (c.currency !== 'ZAR' && c.currency !== 'local') e.push(`${w}.currency should be "ZAR" or "local"`)
    if (c.detail !== undefined) isObj(c.detail) ? detail(e, c.detail, `${w}.detail`) : e.push(`${w}.detail should be an object`)
  })
  list(e, p, 'notes', 'details')
  sources(e, p, 'details')

  if (JSON.stringify(p).length > 300_000) e.push('The details file is too big. Keep it under 300 KB.')
  return e.length ? { ok: false, errors: e } : { ok: true, details: p as unknown as ScenarioDetails }
}

function arr(e: Errors, o: Record<string, unknown>, k: string): unknown[] {
  const v = o[k]
  if (v === undefined) return []
  if (!Array.isArray(v)) {
    e.push(`${k} should be a list`)
    return []
  }
  return v
}

// ---------- using it ----------

/** The detail for one item, from a details file. Added items carry their own. */
export function detailFor(d: ScenarioDetails | undefined, ref: string): ItemDetail | undefined {
  if (!d) return undefined
  const hit = d.items.find((i) => i.ref === ref)
  if (hit) return hit
  const [kind, key] = [ref.slice(0, ref.indexOf(':')), ref.slice(ref.indexOf(':') + 1)]
  if (kind === 'doc') return d.addDocuments?.find((x) => `added-${x.key}` === key)?.detail
  if (kind === 'step') return d.addSteps?.find((x) => `added-${x.key}` === key)?.detail
  if (kind === 'cost') return d.addCosts?.find((x) => `d-${x.key}` === key)?.detail
  if (kind === 'month') return d.addMonthly?.find((x) => `d-${x.key}` === key)?.detail
  return undefined
}

export function hasDetail(x: ItemDetail | undefined): boolean {
  if (!x) return false
  return !!(x.summary || x.why || x.how?.length || x.bring?.length || x.validFor || x.forWho || x.watchOut?.length || x.tips?.length || x.sources?.length)
}

/** Refs that can't be removed: the map is built around them. */
export const KEEP_REFS = new Set(['step:visa-decision', 'step:land'])

/** The settling path and its conditions as items, so Claude can explain each one. */
export function settleItems(s: { pack?: { settlement?: { name: string; conditions: string[]; citizenshipName?: string } } }): { ref: string; label: string }[] {
  if (!s.pack)
    return [
      { ref: 'settle:english', label: 'English at the required level (B2 from 2027)' },
      { ref: 'settle:earnings', label: 'Minimum yearly earnings for each year counted' },
      { ref: 'settle:record', label: 'No UK criminal record' },
      { ref: 'settle:debt', label: 'No unpaid NHS, tax or NI debt' },
      { ref: 'settle:ilr', label: 'Apply for indefinite leave to remain' },
      { ref: 'settle:citizenship', label: 'British citizenship' },
    ]
  const st = s.pack.settlement
  if (!st) return []
  return [
    ...st.conditions.map((c, i) => ({ ref: `settle:condition-${i + 1}`, label: c })),
    { ref: 'settle:apply', label: `Apply for ${st.name}` },
    ...(st.citizenshipName ? [{ ref: 'settle:citizenship', label: st.citizenshipName }] : []),
  ]
}
