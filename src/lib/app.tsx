import { useMutation, useQuery } from 'convex/react'
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { todayIso } from '@shared/dates'
import { tasksDoneByDocs, type DocStatus } from '@shared/documents'
import { currencyOf, plan, planTotal, upfrontCosts, type Borrowing, type Plan, type PlanExtras, type PlanTotal } from '@shared/engine'
import type { RuleOverrides } from '@shared/rules'
import type { SavingsState, ScenarioInput } from '@shared/types'
import type { DestinationPack } from '@shared/pack'
import type { ScenarioDetails } from '@shared/details'
import { cur as fmtCur, setMainCurrency } from './format'
import { useLootSession } from './auth'
import { lootPace, syncLootTarget, useLinkedGoal, type LootDeposit, type LootGoal } from './loot'

export type ScenarioDoc = Doc<'scenarios'>
export type QuoteDoc = Doc<'quotes'>
export type CustomCostDoc = Doc<'customCosts'>
export type Me = NonNullable<ReturnType<typeof useMe>>

export function toInput(d: ScenarioDoc): ScenarioInput {
  const { _id, _creationTime, userId, ...rest } = d
  void _id
  void _creationTime
  void userId
  return rest
}

export interface FxPoint {
  date: string
  zarPerGbp: number
}

interface AppData {
  profile: Doc<'profiles'>
  scenarios: ScenarioDoc[]
  active: ScenarioDoc
  /** The main scenario, with the live rate applied if it follows the live rate */
  input: ScenarioInput
  plan: Plan
  savings: SavingsState
  savingsSource: 'loot' | 'manual'
  goal: LootGoal | null
  goalMissing: boolean
  deposits: LootDeposit[]
  goalUpdatedAt: number | null
  /** Linked to Loot, but not signed in to Loot on this device, so the goal can't be read here */
  lootNeedsSignIn: boolean
  overrides: RuleOverrides
  /** Steps ticked on the map, plus steps the paperwork tracker completes */
  done: Set<string>
  /** Steps ticked by hand only */
  ticked: Set<string>
  docs: Record<string, Doc<'documents'>>
  earnings: Record<string, number>
  shareToken: string | null
  account: Me['account']
  fx: FxPoint[]
  liveRate: number | null
  today: string
  /** Loans and credit towards the move, from the profile */
  borrowing: Borrowing
  /** Quotes and own costs on the main scenario */
  quotes: QuoteDoc[]
  customs: CustomCostDoc[]
  /** Baseline, your quotes and the plan total for the main scenario */
  totals: PlanTotal
  /** Quotes and own costs on any scenario, for plan() */
  extrasFor: (id?: string) => PlanExtras
  /** Pass the scenario id so its quotes count */
  planFor: (s: ScenarioInput, id?: string) => Plan
  /** A scenario ready to run: its imported plan and Claude's details attached, or the live rate applied. Pass the id for details. */
  effective: (s: ScenarioInput, id?: string) => ScenarioInput
  /** Claude's details files by scenario id */
  detailsBy: Map<string, { details: ScenarioDetails; importedAt: number }>
  /** Imported plans by destination id */
  packs: Map<string, DestinationPack>
  destinations: Doc<'destinations'>[]
  /** The main scenario's destination currency */
  cur: { code: string; symbol: string; name: string }
  /** Formats an amount in the main scenario's destination currency (pounds on the UK route) */
  money: (n: number, roundTo?: number) => string
}

const Ctx = createContext<AppData | null>(null)

export function useMe() {
  return useQuery(api.data.me)
}

export function AppDataProvider({ me, children }: { me: Me; children: ReactNode }) {
  const profile = me.profile!
  const scenarios = me.scenarios
  const active = scenarios.find((s) => s._id === profile.activeScenarioId) ?? scenarios[0]
  const { session: lootSession } = useLootSession()
  // The main scenario's own Loot goal, or the default goal on the profile.
  const goalId = active.lootGoalId ?? profile.lootGoalId
  const linked = useLinkedGoal(goalId)
  const today = todayIso()
  const liveRate = me.fx.length ? me.fx[me.fx.length - 1].zarPerGbp : null

  // Imported plans, checked when they were imported.
  const packs = useMemo(() => {
    const out = new Map<string, DestinationPack>()
    for (const d of me.destinations) {
      try {
        out.set(d._id, JSON.parse(d.json) as DestinationPack)
      } catch {
        // A damaged plan: its scenarios fall back to the built-in route rather than breaking the app.
      }
    }
    return out
  }, [me.destinations])

  // Claude's details files, one per scenario.
  const detailsBy = useMemo(() => {
    const out = new Map<string, { details: ScenarioDetails; importedAt: number }>()
    for (const d of me.details) {
      try {
        out.set(d.scenarioId, { details: JSON.parse(d.json) as ScenarioDetails, importedAt: d.importedAt })
      } catch {
        // A damaged file: the scenario runs without it.
      }
    }
    return out
  }, [me.details])

  // A scenario ready to run: its imported plan and details attached, or the live rate applied on the UK route.
  const effective = useMemo(
    () =>
      (s: ScenarioInput, id?: string): ScenarioInput => {
        const sid = id ?? (s as { _id?: string })._id
        const details = sid ? detailsBy.get(sid)?.details : undefined
        const pack = s.destinationId ? packs.get(s.destinationId) : undefined
        if (pack) return { ...s, pack, details }
        return s.rateMode === 'live' && liveRate ? { ...s, rate: Math.round(liveRate * 100) / 100, details } : { ...s, details }
      },
    [liveRate, packs, detailsBy],
  )
  const input = useMemo(() => effective(toInput(active), active._id), [active, effective])
  const overrides = useMemo<RuleOverrides>(() => Object.fromEntries(me.overrides.map((o) => [o.key, o.value])), [me.overrides])

  const savings = useMemo<SavingsState>(() => {
    const saved = linked.goal ? Number(linked.goal.current_amount) : profile.savedZar
    const history = linked.goal ? lootPace(linked.deposits) : null
    // Planned monthly saving, unless your actual deposits have been lower.
    const monthly = history !== null && profile.monthlyZar > 0 ? Math.min(profile.monthlyZar, history) : profile.monthlyZar || history || 0
    return { savedZar: saved, monthlyZar: monthly }
  }, [linked.goal, linked.deposits, profile.savedZar, profile.monthlyZar])

  const borrowing = useMemo<Borrowing>(
    () => ({ loanZar: profile.loanZar, loanMonths: profile.loanMonths, loanRatePct: profile.loanRatePct, cardZar: profile.cardZar, cardRatePct: profile.cardRatePct }),
    [profile.loanZar, profile.loanMonths, profile.loanRatePct, profile.cardZar, profile.cardRatePct],
  )
  const extrasFor = useMemo(
    () =>
      (id?: string): PlanExtras =>
        id
          ? { borrowing, quotes: me.quotes.filter((q) => q.scenarioId === id), customs: me.customCosts.filter((c) => c.scenarioId === id).map((c) => ({ id: c._id as string, group: c.group, label: c.label })) }
          : { borrowing },
    [me.quotes, me.customCosts, borrowing],
  )
  const planFor = useMemo(() => (s: ScenarioInput, id?: string) => plan(effective(s, id), savings, today, overrides, extrasFor(id)), [effective, savings, today, overrides, extrasFor])
  const p = useMemo(() => planFor(input, active._id), [planFor, input, active._id])
  const activeExtras = useMemo(() => extrasFor(active._id), [extrasFor, active._id])
  const totals = useMemo(() => planTotal(upfrontCosts(input, p.landDate, overrides), activeExtras.quotes, activeExtras.customs, input.rate), [input, p.landDate, overrides, activeExtras])

  // Keep the Loot goal's target equal to the number, if switched on.
  const goal = linked.goal
  useEffect(() => {
    if (!goal || !profile.syncLootTarget) return
    // The goal is what you save yourself: the plan total less any borrowing.
    const t = window.setTimeout(() => void syncLootTarget(goal, p.saveTargetZar, p.landDate).catch(() => {}), 1500)
    return () => window.clearTimeout(t)
  }, [goal, profile.syncLootTarget, p.saveTargetZar, p.landDate])

  const docs = useMemo(() => Object.fromEntries(me.documents.map((d) => [d.docKey, d])), [me.documents])
  const ticked = useMemo(() => new Set(me.done.map((d) => d.taskKey)), [me.done])
  const done = useMemo(() => {
    const fromDocs = tasksDoneByDocs(Object.fromEntries(me.documents.map((d) => [d.docKey, d.status as DocStatus])), active.hidden)
    return new Set([...ticked, ...fromDocs])
  }, [ticked, me.documents, active.hidden])

  const cur = currencyOf(input)
  setMainCurrency(cur.symbol)
  const value: AppData = {
    profile,
    scenarios,
    active,
    input,
    plan: p,
    savings,
    savingsSource: linked.goal ? 'loot' : 'manual',
    goal: linked.goal,
    goalMissing: linked.missing,
    deposits: linked.deposits,
    goalUpdatedAt: linked.updatedAt,
    lootNeedsSignIn: !!goalId && !lootSession,
    overrides,
    done,
    ticked,
    docs,
    earnings: Object.fromEntries(me.earnings.map((e) => [e.taxYear, e.gross])),
    shareToken: me.shareToken,
    account: me.account,
    fx: me.fx,
    liveRate,
    today,
    borrowing,
    quotes: me.quotes.filter((q) => q.scenarioId === active._id),
    customs: me.customCosts.filter((c) => c.scenarioId === active._id),
    totals,
    extrasFor,
    planFor,
    effective,
    detailsBy,
    packs,
    destinations: me.destinations,
    cur,
    money: (n: number, roundTo = 1) => fmtCur(n, cur.symbol, roundTo),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppData {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside AppDataProvider')
  return v
}

export function useActions() {
  return {
    saveScenario: useMutation(api.data.saveScenario),
    deleteScenario: useMutation(api.data.deleteScenario),
    setActive: useMutation(api.data.setActive),
    toggleDone: useMutation(api.data.toggleDone),
    updateProfile: useMutation(api.data.updateProfile),
    setRule: useMutation(api.data.setRule),
    onboard: useMutation(api.data.onboard),
    resetAll: useMutation(api.data.resetAll),
    setDoc: useMutation(api.docs.setDoc),
    setEarnings: useMutation(api.settlement.setEarnings),
    createShare: useMutation(api.shares.create),
    revokeShare: useMutation(api.shares.revoke),
    unlinkLoot: useMutation(api.account.unlinkLoot),
    addQuote: useMutation(api.quotes.add),
    updateQuote: useMutation(api.quotes.update),
    removeQuote: useMutation(api.quotes.remove),
    removeCustom: useMutation(api.quotes.removeCustom),
    importPlan: useMutation(api.plans.importPlan),
    removePlan: useMutation(api.plans.removePlan),
    setHidden: useMutation(api.details.setHidden),
    restoreAll: useMutation(api.details.restoreAll),
    importDetails: useMutation(api.details.importDetails),
    removeDetails: useMutation(api.details.removeDetails),
    setScenarioGoal: useMutation(api.data.setScenarioGoal),
    clearScenarioGoals: useMutation(api.data.clearScenarioGoals),
  }
}

export type { Id }
