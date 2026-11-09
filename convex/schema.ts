import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const scenarioFields = {
  name: v.string(),
  landMode: v.union(v.literal('date'), v.literal('saved')),
  landDate: v.string(),
  city: v.union(v.literal('manchester'), v.literal('london')),
  housing: v.union(v.literal('room'), v.literal('studio'), v.literal('onebed')),
  partner: v.boolean(),
  partnerMarried: v.boolean(),
  partnerSince: v.union(v.string(), v.null()),
  partnerWorks: v.boolean(),
  partnerSalary: v.number(),
  jobHuntMonths: v.number(),
  ukSalary: v.number(),
  rate: v.number(),
  certLeadMonths: v.number(),
  tempNights: v.number(),
  flightGbp: v.number(),
  bufferGbp: v.number(),
}

export default defineSchema({
  // One row per user. userId is the Supabase user id (the token's subject), shared with Loot.
  profiles: defineTable({
    userId: v.string(),
    savedZar: v.number(),
    monthlyZar: v.number(),
    homeRentZar: v.number(),
    homeIncomeZar: v.number(),
    activeScenarioId: v.optional(v.id('scenarios')),
    lootGoalId: v.optional(v.string()),
    syncLootTarget: v.boolean(),
    onboarded: v.boolean(),
  }).index('by_user', ['userId']),

  scenarios: defineTable({ userId: v.string(), ...scenarioFields }).index('by_user', ['userId']),

  // Ticked tasks on the map, per user (the same step is done whichever scenario you look at).
  done: defineTable({ userId: v.string(), taskKey: v.string(), doneAt: v.string() }).index('by_user', ['userId']).index('by_user_task', ['userId', 'taskKey']),

  // Values edited on the Rules page.
  ruleOverrides: defineTable({ userId: v.string(), key: v.string(), value: v.union(v.number(), v.string()) }).index('by_user', ['userId']).index('by_user_key', ['userId', 'key']),
})
