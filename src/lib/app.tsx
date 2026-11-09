import { useMutation, useQuery } from 'convex/react'
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { todayIso } from '@shared/dates'
import { plan, type Plan } from '@shared/engine'
import type { RuleOverrides } from '@shared/rules'
import type { SavingsState, ScenarioInput } from '@shared/types'
import { lootPace, syncLootTarget, useLinkedGoal, type LootDeposit, type LootGoal } from './loot'

export type ScenarioDoc = Doc<'scenarios'>

export function toInput(d: ScenarioDoc): ScenarioInput {
  const { _id, _creationTime, userId, ...rest } = d
  void _id
  void _creationTime
  void userId
  return rest
}

interface AppData {
  profile: Doc<'profiles'>
  scenarios: ScenarioDoc[]
  active: ScenarioDoc
  input: ScenarioInput
  plan: Plan
  savings: SavingsState
  /** Where the saved amount comes from */
  savingsSource: 'loot' | 'manual'
  goal: LootGoal | null
  goalMissing: boolean
  deposits: LootDeposit[]
  goalUpdatedAt: number | null
  overrides: RuleOverrides
  done: Set<string>
  today: string
  planFor: (s: ScenarioInput) => Plan
}

const Ctx = createContext<AppData | null>(null)

export type MeState = { status: 'loading' } | { status: 'signedOut' } | { status: 'new' } | { status: 'ready' }

export function useMe() {
  return useQuery(api.data.me)
}

export function AppDataProvider({ me, children }: { me: NonNullable<ReturnType<typeof useMe>>; children: ReactNode }) {
  const profile = me.profile!
  const scenarios = me.scenarios
  const active = scenarios.find((s) => s._id === profile.activeScenarioId) ?? scenarios[0]
  const input = useMemo(() => toInput(active), [active])
  const linked = useLinkedGoal(profile.lootGoalId)
  const today = todayIso()

  const overrides = useMemo<RuleOverrides>(() => Object.fromEntries(me.overrides.map((o) => [o.key, o.value])), [me.overrides])

  const savings = useMemo<SavingsState>(() => {
    const saved = linked.goal ? Number(linked.goal.current_amount) : profile.savedZar
    const history = linked.goal ? lootPace(linked.deposits) : null
    // Planned monthly saving, unless your actual deposits have been lower.
    const monthly = history !== null && profile.monthlyZar > 0 ? Math.min(profile.monthlyZar, history) : profile.monthlyZar || history || 0
    return { savedZar: saved, monthlyZar: monthly }
  }, [linked.goal, linked.deposits, profile.savedZar, profile.monthlyZar])

  const planFor = useMemo(() => (s: ScenarioInput) => plan(s, savings, today, overrides), [savings, today, overrides])
  const p = useMemo(() => planFor(input), [planFor, input])

  // Keep the Loot goal's target equal to the number, if switched on.
  const goal = linked.goal
  useEffect(() => {
    if (!goal || !profile.syncLootTarget) return
    const t = window.setTimeout(() => void syncLootTarget(goal, p.targetZar, p.landDate).catch(() => {}), 1500)
    return () => window.clearTimeout(t)
  }, [goal, profile.syncLootTarget, p.targetZar, p.landDate])

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
    overrides,
    done: new Set(me.done.map((d) => d.taskKey)),
    today,
    planFor,
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
  }
}

export type { Id }
