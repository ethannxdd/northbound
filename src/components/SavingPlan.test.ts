import { describe, expect, it } from 'vitest'
import { plan } from '@shared/engine'
import { DEFAULT_SCENARIO } from '@shared/types'
import { savingPlanText } from './SavingPlan'

const today = '2026-11-09'

describe('saving plan', () => {
  it('in date mode, says what to save each month and whether you are on track', () => {
    const s = { ...DEFAULT_SCENARIO, landMode: 'date' as const, landDate: '2029-03-01' }
    const p = plan(s, { savedZar: 62000, monthlyZar: 9400 }, today)
    const t = savingPlanText(p, 'date', 9400, today)
    expect(t.headline).toMatch(/^Save R[\d,]+ a month$/)
    expect(t.needed).toBe(Math.ceil(p.neededPerMonthZar / 100) * 100)
    expect(t.detail).toContain('December 2028')
    expect(t.tone).toBe(t.needed! <= 9400 ? 'ok' : 'warn')
  })
  it('updates when the landing date moves', () => {
    const near = plan({ ...DEFAULT_SCENARIO, landMode: 'date', landDate: '2028-09-01' }, { savedZar: 62000, monthlyZar: 9400 }, today)
    const far = plan({ ...DEFAULT_SCENARIO, landMode: 'date', landDate: '2030-03-01' }, { savedZar: 62000, monthlyZar: 9400 }, today)
    expect(savingPlanText(near, 'date', 9400, today).needed!).toBeGreaterThan(savingPlanText(far, 'date', 9400, today).needed!)
  })
  it('says when a date is too soon', () => {
    const p = plan({ ...DEFAULT_SCENARIO, landMode: 'date', landDate: '2027-01-01' }, { savedZar: 0, monthlyZar: 9400 }, today)
    expect(savingPlanText(p, 'date', 9400, today).headline).toMatch(/no time left/)
  })
  it('in saved mode, gives the date at your pace', () => {
    const p = plan({ ...DEFAULT_SCENARIO, landMode: 'saved' }, { savedZar: 62000, monthlyZar: 9400 }, today)
    expect(savingPlanText(p, 'saved', 9400, today).detail).toMatch(/land around/)
  })
})
