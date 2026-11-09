import { longMonthYear } from '@shared/dates'
import type { Plan } from '@shared/engine'
import type { LandMode } from '@shared/types'
import { zar } from '../lib/format'

/** What you need to save each month, in words. Used on Home, Progress, Money and in the editor. */
export function savingPlanText(plan: Plan, mode: LandMode, monthlyZar: number, today: string) {
  if (plan.remainingZar <= 0) {
    return { tone: 'ok' as const, headline: 'You have the full amount saved', detail: 'Keep it in your own account until you apply for the visa.' }
  }
  if (mode === 'date') {
    const needed = Math.ceil(plan.neededPerMonthZar / 100) * 100
    if (plan.fundsDeadline <= today) {
      return {
        tone: 'warn' as const,
        headline: `${zar(plan.remainingZar, 1000)} still to save, and no time left`,
        detail: `For this landing date the money needed to be in your account by ${longMonthYear(plan.fundsDeadline)}. Pick a later date, or switch to "When I've saved enough".`,
      }
    }
    const gap = needed - monthlyZar
    const status =
      monthlyZar <= 0
        ? 'Set what you save each month to see if you are on track.'
        : gap <= 0
          ? `You save ${zar(monthlyZar, 100)} a month now, so you're on track.`
          : `You save ${zar(monthlyZar, 100)} a month now: ${zar(gap, 100)} a month short.${plan.paceLandDate ? ` At that pace you could land in ${longMonthYear(plan.paceLandDate)}.` : ''}`
    return {
      tone: monthlyZar > 0 && gap <= 0 ? ('ok' as const) : ('warn' as const),
      headline: `Save ${zar(needed)} a month`,
      detail: `to have ${zar(plan.targetZar, 1000)} in your account by ${longMonthYear(plan.fundsDeadline)}, ready to land on ${longMonthYear(plan.landDate)}. ${status}`,
      needed,
    }
  }
  if (monthlyZar <= 0 || !plan.readyDate) {
    return { tone: 'warn' as const, headline: 'Add a monthly saving', detail: 'Northbound needs to know what you save each month to work out when you can go.' }
  }
  return {
    tone: 'ok' as const,
    headline: `Save ${zar(monthlyZar, 100)} a month`,
    detail: `and you'll have ${zar(plan.targetZar, 1000)} by ${longMonthYear(plan.readyDate)}, so you can land around ${longMonthYear(plan.landDate)}.`,
  }
}

export default function SavingPlan({ plan, mode, monthlyZar, today, compact = false }: { plan: Plan; mode: LandMode; monthlyZar: number; today: string; compact?: boolean }) {
  const t = savingPlanText(plan, mode, monthlyZar, today)
  return (
    <div className={`saving-plan ${t.tone}${compact ? ' compact' : ''}`} role="status">
      <span className="stop" aria-hidden="true" />
      <span>
        <small>Your saving plan</small>
        <b>{t.headline}</b>
        <span className="sp-detail">{t.detail}</span>
      </span>
    </div>
  )
}
