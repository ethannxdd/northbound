import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { cityOf, monthlyBudget, partnerCanCome, plan, progress, routePlaces, upfrontCosts } from './engine'
import { packTakeHome, parsePack, type DestinationPack } from './pack'
import { buildTimeline } from './timeline'
import { DEFAULT_SCENARIO, type ScenarioInput } from './types'

const raw = readFileSync(new URL('../docs/example-plan.json', import.meta.url), 'utf8')

function load(): DestinationPack {
  const r = parsePack(raw)
  if (!r.ok) throw new Error(r.errors.join('\n'))
  return r.pack
}

function scenarioFor(pack: DestinationPack): ScenarioInput {
  const sc = pack.scenario
  return {
    ...DEFAULT_SCENARIO,
    name: pack.title,
    pack,
    destCity: sc.city,
    housing: sc.housing,
    jobHuntMonths: sc.jobHuntMonths,
    tempNights: sc.tempNights,
    flightGbp: pack.move.flightPerPerson,
    rate: pack.currency.zarPerUnit,
    rateMode: 'fixed',
    certLeadMonths: sc.paperworkMonths ?? 3,
  }
}

describe('plan files', () => {
  it('accepts the example plan, raw or inside a code block', () => {
    expect(parsePack(raw).ok).toBe(true)
    expect(parsePack('Here it is:\n```json\n' + raw + '\n```').ok).toBe(true)
  })
  it('explains what is wrong, in plain words', () => {
    const bad = JSON.parse(raw)
    bad.format = 'other'
    bad.cities[0].rent = { room: 900 }
    bad.scenario.city = 'cork'
    bad.steps[0].key = 'land'
    const r = parsePack(bad)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors).toContain('format should be "northbound-plan"')
    expect(r.errors.some((e) => e.includes('rent.studio'))).toBe(true)
    expect(r.errors).toContain('scenario.city should be the id of one of the cities')
    expect(r.errors.some((e) => e.includes('reserved'))).toBe(true)
    expect(parsePack('not json').ok).toBe(false)
  })
  it('refuses to replace the built-in UK route', () => {
    const p = JSON.parse(raw)
    p.id = 'uk'
    expect(parsePack(p).ok).toBe(false)
  })
})

describe('a plan as a scenario', () => {
  const pack = load()
  const s = scenarioFor(pack)

  it('uses the plan city', () => {
    expect(cityOf(s).name).toBe('Dublin')
    expect(cityOf({ ...s, area: 'rathmines' }).rent.room).toBe(950)
  })
  it('works out tax with bands, credits and social charges', () => {
    const t = packTakeHome(45000, pack.tax)
    // 44,000 × 20% + 1,000 × 40% − 4,000 credits = 5,200 tax; 4% of 45,000 = 1,800 social.
    expect(t.tax).toBeCloseTo(5200, 6)
    expect(t.ni).toBeCloseTo(1800, 6)
    expect(t.monthly).toBeCloseTo((45000 - 5200 - 1800) / 12, 6)
  })
  it('builds the three cost groups from the plan', () => {
    const c = upfrontCosts(s, '2028-03-01')
    const keys = c.groups.flatMap((g) => g.items.map((i) => i.key))
    expect(keys).toEqual(expect.arrayContaining(['visaFee', 'doc-degree', 'doc-police', 'flight', 'deposit', 'x-irp', 'runway1']))
    expect(keys).not.toContain('ihs')
    const docs = c.groups[0].items.find((i) => i.key === 'doc-police')!
    expect(docs.gbp).toBeCloseTo(200 / 19.6, 6)
    expect(c.total).toBeCloseTo(c.groups.reduce((a, g) => a + g.total, 0), 6)
  })
  it('puts what is left each month in the plan currency', () => {
    const b = monthlyBudget(s, '2028-03-01')
    expect(b.items[0].gbp).toBe(950)
    expect(b.left).toBeCloseTo(packTakeHome(45000, pack.tax).monthly - b.outgoings, 6)
  })
  it('dates the steps and adds the shared ones', () => {
    const t = buildTimeline(s, '2028-03-01', '2026-11-24')
    const keys = t.map((x) => x.key)
    expect(keys).toEqual(expect.arrayContaining(['job-offer', 'saving', 'visa-decision', 'land', 'first-payday', 'settle']))
    expect(t.find((x) => x.key === 'job-offer')!.due).toBe('2027-09-01')
    expect(t.find((x) => x.key === 'register-irp')!.due).toBe('2028-04-01')
    const dues = t.map((x) => x.due)
    expect([...dues].sort()).toEqual(dues)
  })
  it('runs the number and the landing date through plan()', () => {
    const p = plan(s, { savedZar: 0, monthlyZar: 8000 }, '2026-11-24')
    expect(p.targetZar).toBeCloseTo(p.targetGbp * 19.6, 6)
    expect(p.landDate >= p.earliestLand).toBe(true)
    // 3 months of paperwork + 1 + 8 weeks (2 months) to a decision = 6 months
    expect(p.earliestLand).toBe('2027-05-24')
  })
  it('follows the plan rules for partners', () => {
    expect(partnerCanCome({ ...s, partner: true, partnerSince: '2027-01-01' }, '2028-01-01')).toBe(false)
    expect(partnerCanCome({ ...s, partner: true, partnerSince: '2025-01-01' }, '2028-01-01')).toBe(true)
    const noPartners = { ...pack, visa: { ...pack.visa, partnerRelationshipYears: null } }
    expect(partnerCanCome({ ...s, pack: noPartners, partner: true, partnerMarried: true }, '2028-01-01')).toBe(false)
  })
  it('names its own places along the flight', () => {
    const places = routePlaces(s)
    expect(places.at(-1)!.name).toBe('Dublin')
    expect(progress(55, 100, places).place.name).toBe('the Sahel')
  })
})
