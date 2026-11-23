import { describe, expect, it } from 'vitest'
import { rentFor } from './cities'
import { tasksDoneByDocs } from './documents'
import { upfrontCosts } from './engine'
import { buildIcs } from './ics'
import { settlementCheck, taxYearOf, taxYearsBetween } from './settlement'
import { buildTimeline } from './timeline'
import { DEFAULT_SCENARIO } from './types'

describe('neighbourhoods', () => {
  it('scale rent by area and fall back to the city average', () => {
    expect(rentFor('manchester', 'room')).toBe(750)
    expect(rentFor('manchester', 'room', 'levenshulme')).toBe(620)
    expect(rentFor('manchester', 'studio', 'city-centre')).toBeGreaterThan(rentFor('manchester', 'studio'))
  })
  it('change the number', () => {
    const cheap = upfrontCosts({ ...DEFAULT_SCENARIO, area: 'levenshulme' }, '2029-03-01').total
    const avg = upfrontCosts(DEFAULT_SCENARIO, '2029-03-01').total
    expect(cheap).toBeLessThan(avg)
  })
})

describe('paperwork', () => {
  it('needs both SA certificates ordered to complete that step', () => {
    expect(tasksDoneByDocs({ 'my-birth': 'ordered' }).has('sa-certs')).toBe(false)
    expect(tasksDoneByDocs({ 'my-birth': 'ordered', 'dad-birth': 'arrived' }).has('sa-certs')).toBe(true)
  })
  it('needs the TB certificate to arrive, not just be booked', () => {
    expect(tasksDoneByDocs({ tb: 'ordered' }).has('tb-test')).toBe(false)
    expect(tasksDoneByDocs({ tb: 'arrived' }).has('tb-test')).toBe(true)
  })
})

describe('calendar file', () => {
  const tasks = buildTimeline(DEFAULT_SCENARIO, '2029-03-01', '2026-11-11')
  const ics = buildIcs(tasks, { stamp: '20261111T120000Z', done: new Set(['gro-cert']) })
  it('has one event per step not done, with a reminder', () => {
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(tasks.length - 1)
    expect((ics.match(/BEGIN:VALARM/g) ?? []).length).toBe(tasks.length - 1)
    expect(ics).not.toContain('UID:gro-cert@')
  })
  it('uses CRLF line endings and folds long lines', () => {
    expect(ics.includes('\r\n')).toBe(true)
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true)
  })
  it('makes all-day events ending the next day', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20290301')
    expect(ics).toContain('DTEND;VALUE=DATE:20290302')
  })
})

describe('settlement', () => {
  it('works out UK tax years', () => {
    expect(taxYearOf('2029-04-05')).toBe('2028-29')
    expect(taxYearOf('2029-04-06')).toBe('2029-30')
    expect(taxYearsBetween('2029-08-01', '2034-07-01')).toEqual(['2029-30', '2030-31', '2031-32', '2032-33', '2033-34', '2034-35'])
  })
  it('counts years with enough earnings', () => {
    const c = settlementCheck('2029-08-01', { '2029-30': 20000, '2030-31': 9000 })
    expect(c.settleDate).toBe('2034-08-01')
    expect(c.minEarnings).toBe(12571)
    expect(c.yearsMet).toBe(1)
  })
})

import { needsRefresh, RULES as ALL_RULES } from './rules'

describe('rule freshness', () => {
  it('flags rules last checked more than 90 days ago', () => {
    expect(needsRefresh({ lastChecked: '2026-08-01' }, '2026-11-23')).toBe(true)
    expect(needsRefresh({ lastChecked: '2026-09-01' }, '2026-11-23')).toBe(false)
  })
  it('marks every unofficial value as an estimate', () => {
    for (const key of ['tbTestZar', 'saUnabridgedZar', 'settlementMinEarnings', 'ilrFee', 'citizenshipFee'] as const) expect(ALL_RULES.find((r) => r.key === key)!.estimate).toBe(true)
  })
})
