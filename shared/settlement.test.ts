import { describe, expect, it } from 'vitest'
import { expectedEarnings, firstYearCheck, taxYearOf } from './settlement'

describe('tax years', () => {
  it('run 6 April to 5 April', () => {
    expect(taxYearOf('2029-04-05')).toBe('2028-29')
    expect(taxYearOf('2029-04-06')).toBe('2029-30')
  })
})

describe('expected earnings', () => {
  it('pays only after the job hunt, and a full year after that', () => {
    const e = expectedEarnings('2029-09-01', 3, 28000, '2034-09-01')
    expect(e[0].taxYear).toBe('2029-30')
    // Work starts 1 Dec 2029: about 4 months of pay before 6 Apr 2030.
    expect(e[0].months).toBeCloseTo(4.1, 1)
    expect(e[0].gross).toBeGreaterThan(9000)
    expect(e[0].gross).toBeLessThan(10000)
    expect(e[1].gross).toBe(28000)
  })
})

describe('first-year check', () => {
  it('flags a short first tax year', () => {
    const c = firstYearCheck('2029-09-01', 3, 28000)
    expect(c.minEarnings).toBe(12571)
    expect(c.short).toBe(true)
    // £12,571 of £28,000 is about 164 days: start work by late October 2029.
    expect(c.startBy! >= '2029-10-20' && c.startBy! <= '2029-10-30').toBe(true)
  })
  it('is fine when you land early in the tax year', () => {
    expect(firstYearCheck('2029-04-10', 2, 28000).short).toBe(false)
  })
  it('never flags before the threshold exists', () => {
    expect(firstYearCheck('2020-09-01', 3, 28000, { settlementMinEarnings: 0 }).short).toBe(false)
  })
})
