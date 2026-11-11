import { useMutation, useQuery } from 'convex/react'
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { todayIso } from '@shared/dates'
import { tasksDoneByDocs, type DocStatus } from '@shared/documents'
import { plan, type Plan } from '@shared/engine'
import type { RuleOverrides } from '@shared/rules'
import type { SavingsState, ScenarioInput } from '@shared/types'
import { useLootSession } from './auth'
import { lootPace, syncLootTarget, useLinkedGoal, type LootDeposit, type LootGoal } from './loot'

export type ScenarioDoc = Doc<'scenarios'>
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
  planFor: (s: ScenarioInput) => Plan
  /** A scenario with the live rate applied when it follows the live rate */
  effective: (s: ScenarioInput) => ScenarioInput
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
  const linked = useLinkedGoal(profile.lootGoalId)
  const today = todayIso()
  const liveRate = me.fx.length ? me.fx[me.fx.length - 1].zarPerGbp : null

  const effective = useMemo(
    () => (s: ScenarioInput): ScenarioInput => (s.rateMode === 'live' && liveRate ? { ...s, rate: Math.round(liveRate * 100) / 100 } : s),
    [liveRate],
  )
  const input = useMemo(() => effective(toInput(active)), [active, effective])
  const overrides = useMemo<RuleOverrides>(() => Object.fromEntries(me.overrides.map((o) => [o.key, o.value])), [me.overrides])

  const savings = useMemo<SavingsState>(() => {
    const saved = linked.goal ? Number(linked.goal.current_amount) : profile.savedZar
    const history = linked.goal ? lootPace(linked.deposits) : null
    // Planned monthly saving, unless your actual deposits have been lower.
    const monthly = history !== null && profile.monthlyZar > 0 ? Math.min(profile.monthlyZar, history) : profile.monthlyZar || history || 0
    return { savedZar: saved, monthlyZar: monthly }
  }, [linked.goal, linked.deposits, profile.savedZar, profile.monthlyZar])

  const planFor = useMemo(() => (s: ScenarioInput) => plan(effective(s), savings, today, overrides), [effective, savings, today, overrides])
  const p = useMemo(() => planFor(input), [planFor, input])

  // Keep the Loot goal's target equal to the number, if switched on.
  const goal = linked.goal
  useEffect(() => {
    if (!goal || !profile.syncLootTarget) return
    const t = window.setTimeout(() => void syncLootTarget(goal, p.targetZar, p.landDate).catch(() => {}), 1500)
    return () => window.clearTimeout(t)
  }, [goal, profile.syncLootTarget, p.targetZar, p.landDate])

  const docs = useMemo(() => Object.fromEntries(me.documents.map((d) => [d.docKey, d])), [me.documents])
  const ticked = useMemo(() => new Set(me.done.map((d) => d.taskKey)), [me.done])
  const done = useMemo(() => {
    const fromDocs = tasksDoneByDocs(Object.fromEntries(me.documents.map((d) => [d.docKey, d.status as DocStatus])))
    return new Set([...ticked, ...fromDocs])
  }, [ticked, me.documents])

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
    lootNeedsSignIn: !!profile.lootGoalId && !lootSession,
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
    planFor,
    effective,
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
  }
}

export type { Id }
