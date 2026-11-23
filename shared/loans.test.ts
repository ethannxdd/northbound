import { describe, expect, it } from 'vitest'
import { monthlyBudget, plan, repayment, repayments, upfrontCosts } from './engine'
import { DEFAULT_SCENARIO as d } from './types'

describe('repayments', () => {
  it('uses standard amortisation', () => {
    expect(repayment(120000, 0, 12)).toBe(10000)
    // R100,000 at 12% a year over 12 months: R8,884.88 a month.
    expect(repayment(100000, 12, 12)).toBeCloseTo(8884.88, 2)
    expect(repayment(0, 12, 12)).toBe(0)
  })
  it('adds the loan and the card, and counts the interest', () => {
    const r = repayments({ loanZar: 100000, loanMonths: 12, loanRatePct: 12, cardZar: 24000, cardRatePct: 0 })
    expect(r.cardZar).toBe(1000)
    expect(r.totalZar).toBeCloseTo(9884.88, 2)
    expect(r.borrowedZar).toBe(124000)
    expect(r.interestZar).toBeCloseTo(8884.88 * 12 - 100000, 1)
  })
})

describe('borrowing in the plan', () => {
  const s = { ...d, landMode: 'date' as const, landDate: '2029-03-01' }
  const savings = { savedZar: 50000, monthlyZar: 5000 }
  it('lowers what you save, not what the move costs', () => {
    const none = plan(s, savings, '2026-11-23')
    const loan = plan(s, savings, '2026-11-23', undefined, { borrowing: { loanZar: 100000, loanMonths: 60, loanRatePct: 15 } })
    expect(loan.targetZar).toBeCloseTo(none.targetZar, 6)
    expect(loan.saveTargetZar).toBeCloseTo(none.targetZar - 100000, 6)
    expect(loan.remainingZar).toBeCloseTo(none.remainingZar - 100000, 6)
    expect(loan.neededPerMonthZar).toBeLessThan(none.neededPerMonthZar)
  })
  it('shows repayments in the monthly budget, but never in the runway', () => {
    const b = { loanZar: 100000, loanMonths: 60, loanRatePct: 15, cardZar: 20000, cardRatePct: 20 }
    const plain = monthlyBudget(d, '2029-03-01')
    const owing = monthlyBudget(d, '2029-03-01', undefined, b)
    const r = repayments(b)
    expect(owing.items.map((i) => i.key)).toContain('loanRepay')
    expect(owing.left).toBeCloseTo(plain.left - r.totalZar / d.rate, 6)
    expect(upfrontCosts(d, '2029-03-01').total).toBeCloseTo(upfrontCosts(d, '2029-03-01').total, 6)
  })
})
