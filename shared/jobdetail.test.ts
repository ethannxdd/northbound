import { describe, expect, it } from 'vitest'
import { hasDetail, parseDetails, type ScenarioDetails } from './details'
import { cityOf, salaryFor, targetJob } from './engine'
import { CITIES } from './cities'
import { DEFAULT_SCENARIO } from './types'

const base = { format: 'northbound-details', version: 1, scenarioId: 'abc', items: [] as unknown[] }

describe('line-item detail fields', () => {
  it('accepts a breakdown, range, timing and ways to save', () => {
    const r = parseDetails({
      ...base,
      items: [
        {
          ref: 'cost:visaFee',
          breakdown: [{ label: 'Visa fee', amount: 637, currency: 'local' }, { label: 'Card fee', amount: 40, currency: 'ZAR', note: 'Bank charge' }],
          range: { low: 637, high: 680, currency: 'local' },
          confidence: 'official',
          whenToPay: 'When you apply',
          payTo: 'UKVI, by card',
          refundable: 'No',
          dependsOn: ['Passport'],
          saveMoney: ['Pay in pounds'],
          alternatives: ['None'],
          ifSkipped: 'No visa',
        },
      ],
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(hasDetail(r.details.items[0])).toBe(true)
  })

  it('reports bad new fields in plain words', () => {
    const r = parseDetails({ ...base, items: [{ ref: 'cost:visaFee', breakdown: [{ label: 'Fee', amount: -1, currency: 'USD' }], range: { low: 9, high: 1, currency: 'local' }, confidence: 'sure' }] })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      const all = r.errors.join(' ')
      expect(all).toContain('breakdown[0].amount')
      expect(all).toContain('breakdown[0].currency')
      expect(all).toContain('range.low')
      expect(all).toContain('confidence')
    }
  })

  it('checks the job block', () => {
    expect(parseDetails({ ...base, job: { title: 'IT support analyst', salary: 29000, range: { low: 25000, high: 33000 } } }).ok).toBe(true)
    const bad = parseDetails({ ...base, job: { salary: 'lots' } })
    expect(bad.ok).toBe(false)
  })
})

describe('the job a scenario targets', () => {
  const details = (title: string, salary: number): ScenarioDetails => ({ format: 'northbound-details', version: 1, scenarioId: 'abc', items: [], createdOn: '2026-11-28', job: { title, salary } })

  it('defaults to IT technical support at the city typical salary', () => {
    const j = targetJob({ ...DEFAULT_SCENARIO, jobTitle: undefined })
    expect(j.title).toBe('IT technical support')
    expect(j.salary).toBe(CITIES.manchester.itSupportSalary)
    expect(j.source).toBe('northbound')
  })

  it("uses Claude's salary for the job it researched", () => {
    const s = { ...DEFAULT_SCENARIO, jobTitle: 'Service desk analyst', details: details('service desk analyst', 31000) }
    expect(cityOf(s).salary).toBe(31000)
    expect(salaryFor(s)).toBe(31000)
    const j = targetJob(s)
    expect(j.source).toBe('claude')
    expect(j.researchedOn).toBe('2026-11-28')
    expect(j.stale).toBe(false)
  })

  it("ignores Claude's salary once you target a different job", () => {
    const s = { ...DEFAULT_SCENARIO, jobTitle: 'Network engineer', details: details('Service desk analyst', 31000) }
    expect(cityOf(s).salary).toBe(CITIES.manchester.itSupportSalary)
    expect(targetJob(s).stale).toBe(true)
  })

  it('keeps your own salary when you set one', () => {
    const s = { ...DEFAULT_SCENARIO, ukSalary: 40000, details: details('IT technical support', 31000) }
    const j = targetJob(s)
    expect(j.salary).toBe(40000)
    expect(j.yours).toBe(true)
    expect(j.typical).toBe(31000)
  })
})
