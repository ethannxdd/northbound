import { describe, expect, it } from 'vitest'
import { parseDetails, detailFor } from './details'
import { tasksDoneByDocs, visibleDocuments } from './documents'
import { allUpfrontCosts, upfrontCosts } from './engine'
import { buildTimeline } from './timeline'
import { DEFAULT_SCENARIO } from './types'

const LAND = '2029-03-01'
const TODAY = '2026-11-25'
const file = {
  format: 'northbound-details',
  version: 1,
  scenarioId: 'abc',
  items: [
    { ref: 'doc:passport', summary: 'Your SA passport', how: ['Check the date'], watchOut: ['Needs 2 blank pages'] },
    { ref: 'cost:groCert', amount: 15, currency: 'local', cost: 'GRO price from 2027' },
  ],
  addDocuments: [{ key: 'apostille', name: 'Apostilled birth certificate', from: 'DIRCO', check: 'Apostille stamp', detail: { why: 'Some employers ask' } }],
  addSteps: [{ key: 'apostille', title: 'Get the apostille', line: 'paper', monthsBeforeLanding: 4, steps: ['Book at DIRCO'] }],
  addCosts: [{ key: 'courier', group: 'paper', label: 'Courier', amount: 400, currency: 'ZAR', perPerson: true }],
}

describe('details files', () => {
  it('accepts a good file and rejects unknown refs', () => {
    expect(parseDetails(JSON.stringify(file)).ok).toBe(true)
    const r = parseDetails(file, new Set(['doc:passport']))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toContain('cost:groCert')
  })

  it('points plan files elsewhere', () => {
    const r = parseDetails({ format: 'northbound-plan' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0]).toContain('Plans from Claude')
  })

  it('finds detail for existing and added items', () => {
    const r = parseDetails(file)
    if (!r.ok) throw new Error('bad')
    expect(detailFor(r.details, 'doc:passport')?.summary).toBe('Your SA passport')
    expect(detailFor(r.details, 'doc:added-apostille')?.why).toBe('Some employers ask')
  })

  it('adds and corrects costs, and adds steps and documents', () => {
    const r = parseDetails(file)
    if (!r.ok) throw new Error('bad')
    const s = { ...DEFAULT_SCENARIO, rate: 20, details: r.details }
    const paper = upfrontCosts(s, LAND).groups[0].items
    expect(paper.find((i) => i.key === 'groCert')?.gbp).toBe(15)
    expect(paper.find((i) => i.key === 'd-courier')?.gbp).toBe(20)
    expect(buildTimeline(s, LAND, TODAY).some((t) => t.key === 'added-apostille')).toBe(true)
    expect(visibleDocuments(s, String).some((d) => d.key === 'added-apostille')).toBe(true)
  })
})

describe('removing items from a scenario', () => {
  const s = { ...DEFAULT_SCENARIO, hidden: ['cost:basics', 'step:job-search', 'step:land', 'doc:dad-birth'] }

  it('takes removed costs out of the number but keeps them listable', () => {
    const before = upfrontCosts(DEFAULT_SCENARIO, LAND)
    const after = upfrontCosts(s, LAND)
    const basics = before.groups[1].items.find((i) => i.key === 'basics')!.gbp
    expect(after.total).toBeCloseTo(before.total - basics)
    expect(allUpfrontCosts(s, LAND).groups[1].items.some((i) => i.key === 'basics')).toBe(true)
  })

  it('drops removed steps, but never landing', () => {
    const keys = buildTimeline(s, LAND, TODAY).map((t) => t.key)
    expect(keys).not.toContain('job-search')
    expect(keys).toContain('land')
  })

  it('drops removed documents, and a step no longer waits on them', () => {
    expect(visibleDocuments(s, String).some((d) => d.key === 'dad-birth')).toBe(false)
    expect(tasksDoneByDocs({ 'my-birth': 'ordered' }).has('sa-certs')).toBe(false)
    expect(tasksDoneByDocs({ 'my-birth': 'ordered' }, s.hidden).has('sa-certs')).toBe(true)
  })
})
