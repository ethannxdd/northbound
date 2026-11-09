import { describe, expect, it } from 'vitest'
import { addMonths, monthsBetween } from './dates'
import { monthlyBudget, partnerCanCome, plan, progress, runwaySeries, takeHome, upfrontCosts } from './engine'
import { rule } from './rules'
import { buildTimeline } from './timeline'
import { DEFAULT_SCENARIO, type ScenarioInput } from './types'

const s: ScenarioInput = { ...DEFAULT_SCENARIO }

describe('dates', () => {
  it('adds months and clamps to month end', () => {
    expect(addMonths('2029-01-31', 1)).toBe('2029-02-28')
    expect(addMonths('2029-03-01', -3)).toBe('2028-12-01')
  })
  it('counts whole months', () => {
    expect(monthsBetween('2026-11-09', '2028-12-01')).toBe(24)
    expect(monthsBetween('2026-11-01', '2026-12-01')).toBe(1)
  })
})

describe('rules', () => {
  it('uses the version in force on the date', () => {
    expect(rule('settlementMinEarnings', '2027-01-01')).toBe(0)
    expect(rule('settlementMinEarnings', '2028-01-01')).toBe(12571)
  })
  it('lets overrides win', () => {
    expect(rule('visaFee', '2029-01-01', { visaFee: 800 })).toBe(800)
  })
})

describe('takeHome', () => {
  it('matches HMRC for £28,000', () => {
    const t = takeHome(28000, '2029-03-01')
    expect(t.tax).toBeCloseTo(3086, 0)
    expect(t.ni).toBeCloseTo(1234.4, 1)
    expect(t.monthly).toBeCloseTo(1973.3, 1)
  })
  it('pays nothing under the allowance', () => {
    expect(takeHome(12000, '2029-03-01').yearly).toBe(12000)
  })
  it('uses the higher rate above £50,270', () => {
    const t = takeHome(60000, '2029-03-01')
    expect(t.tax).toBeCloseTo(37700 * 0.2 + 9730 * 0.4, 0)
  })
})

describe('upfront costs', () => {
  it('adds up its groups', () => {
    const c = upfrontCosts(s, '2029-03-01')
    const sum = c.groups.reduce((a, g) => a + g.items.reduce((b, i) => b + i.gbp, 0), 0)
    expect(c.total).toBeCloseTo(sum, 6)
  })
  it('includes 5 years of health surcharge', () => {
    const c = upfrontCosts(s, '2029-03-01')
    expect(c.groups[0].items[1].gbp).toBe(1035 * 5)
  })
  it('doubles visa costs for a partner', () => {
    const solo = upfrontCosts(s, '2029-03-01').groups[0].items[0].gbp
    const two = upfrontCosts({ ...s, partner: true }, '2029-03-01').groups[0].items[0].gbp
    expect(two).toBe(solo * 2)
  })
  it('costs more in London', () => {
    expect(upfrontCosts({ ...s, city: 'london' }, '2029-03-01').total).toBeGreaterThan(upfrontCosts(s, '2029-03-01').total)
  })
})

describe('runway', () => {
  it('falls during the job hunt, then rises after payday', () => {
    const r = runwaySeries(s, '2029-03-01')
    const months = s.jobHuntMonths + 1
    expect(r[months]).toBeCloseTo(0, 6)
    expect(r[months + 1]).toBeGreaterThan(r[months])
  })
  it('leaves money each month in Manchester on a typical salary', () => {
    expect(monthlyBudget(s, '2029-03-01').left).toBeGreaterThan(0)
  })
})

describe('plan', () => {
  const today = '2026-11-09'
  it('in date mode, reports what you need each month to make the deadline', () => {
    const p = plan({ ...s, landMode: 'date', landDate: '2029-03-01' }, { savedZar: 62000, monthlyZar: 9400 }, today)
    expect(p.fundsDeadline).toBe('2028-12-01')
    expect(p.neededPerMonthZar).toBeCloseTo((p.targetZar - 62000) / 24, 6)
  })
  it('in saved mode, lands 3 months after the money is ready', () => {
    const p = plan({ ...s, landMode: 'saved' }, { savedZar: 62000, monthlyZar: 9400 }, today)
    expect(p.readyDate).not.toBeNull()
    expect(p.landDate >= addMonths(p.readyDate!, 3)).toBe(true)
    expect(p.onTrack).toBe(true)
  })
  it('never lands before the paperwork can be ready', () => {
    const p = plan({ ...s, landMode: 'saved' }, { savedZar: 10_000_000, monthlyZar: 0 }, today)
    expect(p.landDate).toBe(p.earliestLand)
  })
  it('copes with no saving at all', () => {
    const p = plan({ ...s, landMode: 'saved' }, { savedZar: 0, monthlyZar: 0 }, today)
    expect(p.readyDate).toBeNull()
    expect(p.onTrack).toBe(false)
  })
})

describe('partner', () => {
  it('needs 2 years together unless married', () => {
    const p = { ...s, partner: true }
    expect(partnerCanCome({ ...p, partnerSince: '2027-06-01' }, '2028-12-01')).toBe(false)
    expect(partnerCanCome({ ...p, partnerSince: '2026-06-01' }, '2028-12-01')).toBe(true)
    expect(partnerCanCome({ ...p, partnerMarried: true }, '2028-12-01')).toBe(true)
  })
})

describe('progress', () => {
  it('places you along the route', () => {
    expect(progress(62000, 312000).place.name).toBe('Namibia')
    expect(progress(312000, 312000).pct).toBe(1)
    expect(progress(0, 312000).place.name).toBe('Cape Town')
  })
})

describe('timeline', () => {
  it('is in date order and joins at the visa decision', () => {
    const t = buildTimeline(s, '2029-03-01', '2026-11-09')
    const dues = t.map((x) => x.due)
    expect([...dues].sort()).toEqual(dues)
    const i = t.findIndex((x) => x.key === 'visa-decision')
    expect(t.slice(0, i).every((x) => x.line !== 'trunk')).toBe(true)
    expect(t.slice(i).every((x) => x.line === 'trunk')).toBe(true)
  })
})
