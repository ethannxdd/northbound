import { useCallback, useEffect, useState } from 'react'
import { useLootSession } from './auth'
import { supabase } from './supabase'

// Reads and updates savings goals in Loot. Only the linked goal is ever written to.

export interface LootGoal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  is_completed: boolean
  completed_at: string | null
}

export interface LootDeposit {
  id: string
  amount: number
  created_at: string
}

const GOAL_COLUMNS = 'id, name, target_amount, current_amount, target_date, is_completed, completed_at'

export function useLootGoals(enabled: boolean) {
  const { session } = useLootSession()
  const [goals, setGoals] = useState<LootGoal[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!enabled || !session) return
    const { data, error: e } = await supabase.from('savings_goals').select(GOAL_COLUMNS).order('sort_order', { ascending: true })
    if (e) setError("Couldn't load your Loot goals. Check your connection and try again.")
    else setGoals(data as LootGoal[])
  }, [enabled, session])
  useEffect(() => {
    void load()
  }, [load])
  return { goals, error, reload: load }
}

/** The linked goal and its recent deposits, kept live. */
export function useLinkedGoal(goalId: string | undefined) {
  const { session } = useLootSession()
  const [goal, setGoal] = useState<LootGoal | null>(null)
  const [deposits, setDeposits] = useState<LootDeposit[]>([])
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [missing, setMissing] = useState(false)

  const load = useCallback(async () => {
    if (!goalId || !session) return
    const since = new Date()
    since.setMonth(since.getMonth() - 4)
    const [g, d] = await Promise.all([
      supabase.from('savings_goals').select(GOAL_COLUMNS).eq('id', goalId).maybeSingle(),
      supabase.from('goal_contributions').select('id, amount, created_at').eq('goal_id', goalId).gte('created_at', since.toISOString()).order('created_at', { ascending: false }),
    ])
    if (!g.error) {
      setGoal(g.data as LootGoal | null)
      setMissing(!g.data)
    }
    if (!d.error) setDeposits(d.data as LootDeposit[])
    setUpdatedAt(Date.now())
  }, [goalId, session])

  useEffect(() => {
    if (!goalId || !session) {
      setGoal(null)
      return
    }
    void load()
    // Live updates when Loot's tables are in the Realtime publication; otherwise the refresh below covers it.
    const channel = supabase
      .channel(`nb-goal-${goalId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_goals', filter: `id=eq.${goalId}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goal_contributions', filter: `goal_id=eq.${goalId}` }, () => void load())
      .subscribe()
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    const timer = window.setInterval(() => void load(), 60_000)
    return () => {
      void supabase.removeChannel(channel)
      window.removeEventListener('focus', onFocus)
      window.clearInterval(timer)
    }
  }, [goalId, session, load])

  return { goal, deposits, updatedAt, missing, reload: load }
}

/** Average saved per month over the last 3 full months of deposits, or null with no history. */
export function lootPace(deposits: LootDeposit[]): number | null {
  if (!deposits.length) return null
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 3)
  const recent = deposits.filter((d) => new Date(d.created_at) >= cutoff)
  if (!recent.length) return null
  return recent.reduce((a, d) => a + Number(d.amount), 0) / 3
}

/**
 * Loot's `managed_by` column only exists once Loot migration 033 is applied. Until then,
 * writing it fails, so try with it and fall back to writing without it.
 */
function missingManagedBy(error: { message?: string; code?: string } | null): boolean {
  return !!error && (error.code === 'PGRST204' || /managed_by/i.test(error.message ?? ''))
}

export async function createLootGoal(userId: string, targetZar: number, targetDate: string): Promise<LootGoal> {
  const row = {
    user_id: userId,
    name: 'UK move',
    category: 'travel',
    target_amount: Math.round(targetZar / 1000) * 1000,
    current_amount: 0,
    target_date: targetDate,
    note: 'Target set by Northbound. It updates when your plan changes; your savings are never touched.',
    is_completed: false,
    completed_at: null,
  }
  // managed_by tells Loot this goal's target and date belong to Northbound, so Loot locks them.
  let res = await supabase.from('savings_goals').insert({ ...row, managed_by: 'northbound' }).select(GOAL_COLUMNS).single()
  if (missingManagedBy(res.error)) res = await supabase.from('savings_goals').insert(row).select(GOAL_COLUMNS).single()
  if (res.error) throw new Error("Couldn't create the goal in Loot. Try again.")
  return res.data as LootGoal
}

/** Keeps the Loot goal's target and date equal to Northbound's number, using Loot's completion rule. */
export async function syncLootTarget(goal: LootGoal, targetZar: number, targetDate: string): Promise<void> {
  const target = Math.round(targetZar / 1000) * 1000
  if (Math.abs(goal.target_amount - target) < 1 && goal.target_date === targetDate) return
  const done = target > 0 && goal.current_amount >= target
  const patch = {
    target_amount: target,
    target_date: targetDate,
    is_completed: done,
    completed_at: done ? (goal.is_completed && goal.completed_at ? goal.completed_at : new Date().toISOString()) : null,
  }
  // Also tags goals Northbound linked rather than created.
  let { error } = await supabase.from('savings_goals').update({ ...patch, managed_by: 'northbound' }).eq('id', goal.id)
  if (missingManagedBy(error)) ({ error } = await supabase.from('savings_goals').update(patch).eq('id', goal.id))
  if (error) throw new Error("Couldn't update the goal in Loot.")
}
