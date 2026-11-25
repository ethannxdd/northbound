import { authTables } from '@convex-dev/auth/server'
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
  /** 'live' follows today's rand/pound rate; 'fixed' (or missing) uses `rate` */
  rateMode: v.optional(v.union(v.literal('live'), v.literal('fixed'))),
  /** Neighbourhood id within the city; missing means the city average */
  area: v.optional(v.string()),
  /** An imported plan (destinations id). Missing means the built-in UK Ancestry route. */
  destinationId: v.optional(v.string()),
  /** City id within that plan */
  destCity: v.optional(v.string()),
  /** Items removed from this scenario: "cost:<key>", "step:<key>" or "doc:<key>" */
  hidden: v.optional(v.array(v.string())),
  /** This scenario's own Loot goal. Missing means it follows the profile's default goal. */
  lootGoalId: v.optional(v.string()),
}

export const docStatus = v.union(v.literal('todo'), v.literal('ordered'), v.literal('arrived'), v.literal('checked'))

export default defineSchema({
  ...authTables,

  // Convex Auth's users table, plus where this person's Northbound data lives.
  // dataKey is the `userId` used by every table below. Loot sign-ins keep their Supabase id as the key,
  // so plans made before Northbound had its own accounts carry over.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    dataKey: v.optional(v.string()),
    /** Supabase user id of the linked Loot account */
    lootSub: v.optional(v.string()),
    lootEmail: v.optional(v.string()),
  })
    .index('email', ['email'])
    .index('phone', ['phone'])
    .index('by_lootSub', ['lootSub']),

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
    remindersOn: v.optional(v.boolean()),
    /** For the settlement tracker, once you're in the UK */
    landedOn: v.optional(v.string()),
    englishLevel: v.optional(v.string()),
    /** Borrowing towards the move, in rand. Applies to every scenario. */
    loanZar: v.optional(v.number()),
    loanMonths: v.optional(v.number()),
    loanRatePct: v.optional(v.number()),
    cardZar: v.optional(v.number()),
    cardRatePct: v.optional(v.number()),
  }).index('by_user', ['userId']),

  scenarios: defineTable({ userId: v.string(), ...scenarioFields }).index('by_user', ['userId']),

  // Ticked steps on the map, per user.
  done: defineTable({ userId: v.string(), taskKey: v.string(), doneAt: v.string() }).index('by_user', ['userId']).index('by_user_task', ['userId', 'taskKey']),

  // Values edited on the Rules page.
  ruleOverrides: defineTable({ userId: v.string(), key: v.string(), value: v.union(v.number(), v.string()) }).index('by_user', ['userId']).index('by_user_key', ['userId', 'key']),

  // Paperwork tracker: one row per document.
  documents: defineTable({
    userId: v.string(),
    docKey: v.string(),
    status: docStatus,
    orderedOn: v.optional(v.string()),
    arrivedOn: v.optional(v.string()),
    note: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_user_doc', ['userId', 'docKey']),

  // Daily rand-per-pound rates, shared by everyone.
  fxRates: defineTable({ date: v.string(), zarPerGbp: v.number(), fetchedAt: v.number() }).index('by_date', ['date']),

  // Read-only share links.
  shares: defineTable({ userId: v.string(), token: v.string(), createdAt: v.number() }).index('by_token', ['token']).index('by_user', ['userId']),

  // Phone notifications.
  pushSubs: defineTable({ userId: v.string(), endpoint: v.string(), p256dh: v.string(), auth: v.string(), createdAt: v.number() })
    .index('by_user', ['userId'])
    .index('by_endpoint', ['endpoint']),
  reminderLog: defineTable({ userId: v.string(), key: v.string(), sentOn: v.string() }).index('by_user_key', ['userId', 'key']),

  // Settlement tracker: UK earnings per tax year once you're there.
  earnings: defineTable({ userId: v.string(), taxYear: v.string(), gross: v.number() }).index('by_user', ['userId']).index('by_user_year', ['userId', 'taxYear']),

  // Prices you found for a cost line, or for one of your own costs. The newest counts; older ones are history.
  quotes: defineTable({
    userId: v.string(),
    scenarioId: v.id('scenarios'),
    /** A cost line key from the engine, or a customCosts id */
    itemKey: v.string(),
    amount: v.number(),
    currency: v.union(v.literal('GBP'), v.literal('ZAR')),
    sourceUrl: v.optional(v.string()),
    /** ISO date */
    foundOn: v.string(),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user_scenario', ['userId', 'scenarioId'])
    .index('by_user_scenario_item', ['userId', 'scenarioId', 'itemKey']),

  // Plans imported from a Northbound plan file: a destination country, checked on import.
  destinations: defineTable({
    userId: v.string(),
    /** The plan's own id; importing the same id again replaces it */
    slug: v.string(),
    title: v.string(),
    country: v.string(),
    /** The plan file, as checked JSON */
    json: v.string(),
    importedAt: v.number(),
  }).index('by_user_slug', ['userId', 'slug']),

  // Claude's details file for one scenario: deeper detail on each item, plus items Northbound was missing.
  scenarioDetails: defineTable({
    userId: v.string(),
    scenarioId: v.id('scenarios'),
    /** The details file, as checked JSON */
    json: v.string(),
    importedAt: v.number(),
  }).index('by_user_scenario', ['userId', 'scenarioId']),

  // Your own costs that aren't in the baseline. Valued at their newest quote.
  customCosts: defineTable({
    userId: v.string(),
    scenarioId: v.id('scenarios'),
    group: v.union(v.literal('paper'), v.literal('move'), v.literal('runway')),
    label: v.string(),
    createdAt: v.number(),
  }).index('by_user_scenario', ['userId', 'scenarioId']),
})
