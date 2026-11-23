import { describe, expect, it } from 'vitest'
import { newestQuotes, plan, planTotal, quoteGbp, upfrontCosts, type QuoteLike } from './engine'
import { DEFAULT_SCENARIO as d, type ScenarioInput } from './types'

const LAND = '2029-03-01'

// [total, paper, move, runway]. First pinned before the lines were split (2f34daa) and matched exactly
// after the split (2555e4c). Re-pinned in the Nov 2026 rent refresh, which changed the city rents on purpose.
const BEFORE: [string, ScenarioInput, number[]][] = [
  ['solo', d, [13985.3001998002, 5997.915584415584, 2885.3846153846152, 5102]],
  ['partner', { ...d, partner: true, partnerWorks: true }, [22956.222277722278, 11976.837662337663, 3505.3846153846152, 7474]],
  ['london studio', { ...d, city: 'london', housing: 'studio' }, [19170.99250749251, 5997.915584415584, 4643.076923076924, 8530]],
  ['1-bed, buffer, short hunt', { ...d, housing: 'onebed', bufferGbp: 1500, jobHuntMonths: 1 }, [13739.3001998002, 5997.915584415584, 3445.3846153846152, 4296]],
  ['no hunt, no let', { ...d, jobHuntMonths: 0, tempNights: 0 }, [9146.3001998002, 5997.915584415584, 2435.3846153846152, 713]],
]

describe('split cost lines', () => {
  it.each(BEFORE)('%s: the split lines add up to the old totals', (_n, s, [total, ...groups]) => {
    const c = upfrontCosts(s, LAND)
    expect(c.total).toBeCloseTo(total, 6)
    c.groups.forEach((g, i) => {
      expect(g.total).toBeCloseTo(groups[i], 6)
      expect(g.items.reduce((a, x) => a + x.gbp, 0)).toBeCloseTo(groups[i], 6)
    })
  })
  it('gives every line a stable key, in the documented order', () => {
    const keys = upfrontCosts({ ...d, bufferGbp: 500 }, LAND).groups.flatMap((g) => g.items.map((i) => i.key))
    expect(keys).toEqual(['visaFee', 'ihs', 'tbTest', 'groCert', 'saCerts', 'flight', 'monthlyLet', 'deposit', 'firstRent', 'basics', 'runway1', 'runwayRest', 'buffer'])
  })
  it('leaves out the buffer when it is zero, and gives every line a basis', () => {
    const items = upfrontCosts(d, LAND).groups.flatMap((g) => g.items)
    expect(items.some((i) => i.key === 'buffer')).toBe(false)
    expect(items.every((i) => i.basis && i.basis.length > 0)).toBe(true)
  })
  it('links rule-based lines to their rules', () => {
    const items = upfrontCosts(d, LAND).groups.flatMap((g) => g.items)
    expect(items.find((i) => i.key === 'ihs')!.ruleKeys).toEqual(['ihsPerYear', 'visaYears'])
    expect(items.find((i) => i.key === 'deposit')!.ruleKeys).toEqual(['depositWeeks'])
  })
})

const q = (itemKey: string, amount: number, foundOn: string, createdAt = 1, currency: 'GBP' | 'ZAR' = 'GBP'): QuoteLike => ({ itemKey, amount, currency, foundOn, createdAt })

describe('quotes', () => {
  it('the newest quote counts: latest date, then latest added', () => {
    const n = newestQuotes([q('flight', 600, '2026-10-01'), q('flight', 480, '2026-11-01', 1), q('flight', 500, '2026-11-01', 2), q('deposit', 900, '2026-01-01')])
    expect(n.get('flight')!.amount).toBe(500)
    expect(n.get('deposit')!.amount).toBe(900)
  })
  it('converts rand quotes at the scenario rate', () => {
    expect(quoteGbp({ amount: 2310, currency: 'ZAR' }, 23.1)).toBeCloseTo(100, 6)
    expect(quoteGbp({ amount: 100, currency: 'GBP' }, 23.1)).toBe(100)
  })
})

describe('planTotal', () => {
  const costs = upfrontCosts(d, LAND)
  it('equals the baseline with no quotes', () => {
    const t = planTotal(costs, [], [], d.rate)
    expect(t.planGbp).toBeCloseTo(costs.total, 6)
    expect(t.baselineGbp).toBeCloseTo(costs.total, 6)
    expect(t.quotedCount).toBe(0)
    expect(t.itemCount).toBe(12)
  })
  it('uses your quote where you have one and the baseline everywhere else', () => {
    const flight = costs.groups[1].items[0].gbp
    const t = planTotal(costs, [q('flight', 600, '2026-10-01'), q('flight', 450, '2026-11-01')], [], d.rate)
    expect(t.planGbp).toBeCloseTo(costs.total - flight + 450, 6)
    expect(t.quotedCount).toBe(1)
    expect(t.mineGbp).toBe(450)
    const line = t.groups[1].lines[0]
    expect(line.mineGbp).toBe(450)
    expect(line.quoteCount).toBe(2)
  })
  it('adds your own costs, valued at their newest quote', () => {
    const t = planTotal(costs, [q('c1', 2310, '2026-11-01', 1, 'ZAR')], [{ id: 'c1', group: 'move', label: 'Shipping boxes' }], d.rate)
    expect(t.planGbp).toBeCloseTo(costs.total + 100, 6)
    const line = t.groups[1].lines.at(-1)!
    expect(line.custom).toBe(true)
    expect(line.baselineGbp).toBeNull()
    expect(t.customCount).toBe(1)
    expect(t.itemCount).toBe(12)
  })
  it('drives the number in plan()', () => {
    const s = { ...d, landMode: 'date' as const, landDate: LAND }
    const base = plan(s, { savedZar: 0, monthlyZar: 0 }, '2026-11-23')
    const quoted = plan(s, { savedZar: 0, monthlyZar: 0 }, '2026-11-23', undefined, { quotes: [q('visaFee', 0, '2026-11-01')] })
    expect(base.targetGbp).toBeCloseTo(base.baselineGbp, 6)
    expect(quoted.targetGbp).toBeCloseTo(base.targetGbp - 726, 6)
    expect(quoted.baselineGbp).toBeCloseTo(base.baselineGbp, 6)
  })
})
