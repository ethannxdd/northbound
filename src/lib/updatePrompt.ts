// The "Update Plan/Scenario" prompt: everything Claude needs to research one scenario in depth and send
// back a details file (shared/details.ts). Built from the scenario as it is now, so the refs match.

import { dayMonthYear } from '@shared/dates'
import { scenarioDocuments } from '@shared/documents'
import { allUpfrontCosts, cityOf, currencyOf, visaName, type Plan } from '@shared/engine'
import type { RuleOverrides } from '@shared/rules'
import { allTimeline } from '@shared/timeline'
import type { SavingsState, ScenarioInput } from '@shared/types'

const HOUSING: Record<string, string> = { room: 'a room in a shared house', studio: 'a studio', onebed: 'a 1-bed flat' }

export interface PromptInput {
  id: string
  /** The scenario with its plan attached and without its details file, so refs are the base items */
  s: ScenarioInput
  plan: Plan
  savings: SavingsState
  today: string
  overrides: RuleOverrides
  /** When the scenario already has a details file */
  previous?: { importedAt: number; json: string }
}

export function buildUpdatePrompt({ id, s, plan, savings, today, overrides, previous }: PromptInput): string {
  const cur = currencyOf(s)
  const city = cityOf(s)
  const m = (n: number) => `${cur.symbol}${Math.round(n).toLocaleString('en-GB')}`
  const r = (n: number) => `R${Math.round(n).toLocaleString('en-ZA')}`
  const hidden = new Set(s.hidden ?? [])
  const area = s.area ? city.areas.find((a) => a.id === s.area)?.name : undefined

  const route = s.pack
    ? `${s.pack.visa.name} to ${s.pack.country.name}, from my imported plan "${s.pack.title}" (plan id ${s.pack.id})${s.pack.summary ? `. ${s.pack.summary}` : ''}`
    : "UK Ancestry visa (Northbound's built-in route). My UK-born grandparent is my dad's mother."
  const partner = s.partner
    ? `Yes: ${s.partnerMarried ? 'married' : `not married${s.partnerSince ? `, together since ${s.partnerSince}` : ''}`}; ${s.partnerWorks ? `will work, about ${m(s.partnerSalary)} a year` : "won't work at first"}`
    : 'No, moving solo'

  const docs = scenarioDocuments(s, (n, c) => (c === 'ZAR' ? r(n) : m(n)))
  const steps = allTimeline(s, plan.landDate, today, overrides)
  const costs = allUpfrontCosts(s, plan.landDate, overrides).groups

  const line = (ref: string, text: string) => `- ${ref}: ${text}${hidden.has(ref) ? '  [REMOVED BY ME]' : ''}`
  const docLines = docs.map((d) => line(d.ref, `${d.name}. From ${d.from}. Check: ${d.check}${d.optional ? `. ${d.optional}` : ''}${d.cost ? `. Cost ${d.cost}` : ''}`))
  const stepLines = steps.map((t) => line(`step:${t.key}`, `${t.title} (${t.line} line, due ${t.due})${t.cost ? `. Cost ${t.cost}` : ''}`))
  const costLines = costs.flatMap((g) => [`  ${g.label}:`, ...g.items.map((i) => line(`cost:${i.key}`, `${i.label}, ${m(i.gbp)}${i.basis ? ` (${i.basis})` : ''}`))])
  const removed = [...hidden]

  return `Update my Northbound move plan for one scenario with as much detail as possible, and deliver it as a Northbound details file.

About me: I live in Cape Town, South Africa, and save in rand. Northbound is the app I use to plan the move. It will show your detail next to every document, map step and cost in this scenario.

THE SCENARIO
- Name: ${s.name} (scenario id ${id})
- Route: ${route}
- City: ${city.name}${area ? `, ${area}` : ''}, living in ${HOUSING[s.housing]}
- Partner coming: ${partner}
- Job hunt after landing: ${s.jobHuntMonths} months; my salary there: ${s.ukSalary > 0 ? m(s.ukSalary) : `typical, about ${m(city.salary)}`} a year
- Landing: ${s.landMode === 'date' ? `fixed date, ${dayMonthYear(plan.landDate)}` : `when I've saved enough, currently around ${dayMonthYear(plan.landDate)}`}; ${s.tempNights} nights of temporary stay first
- Paperwork lead time I've allowed: ${s.certLeadMonths} months
- Rate: R${s.rate.toFixed(2)} to the ${cur.name}
- The move needs ${r(plan.targetZar)} (${m(plan.targetGbp)}). I've saved ${r(savings.savedZar)} and save ${r(savings.monthlyZar)} a month.
- Visa: ${visaName(s)}. Today is ${today}.

WHAT'S IN THE SCENARIO NOW (use these refs exactly)
Documents:
${docLines.join('\n')}

Steps on the map:
${stepLines.join('\n')}

Costs before I go (in ${cur.code}):
${costLines.join('\n')}
${removed.length ? `\nI removed these from the scenario: ${removed.join(', ')}. Don't add them back. If one is truly required for this scenario, say so in "notes" and explain why.\n` : ''}${previous ? `\nI imported a details file on ${new Date(previous.importedAt).toISOString().slice(0, 10)}. Write a complete new one: it replaces the old file, so keep anything from the old one that's still right.\n` : ''}
WHAT I WANT
1. For every item above that isn't marked [REMOVED BY ME], research and write its detail for THIS scenario (my city, whether my partner comes, my dates): what it is, why it's needed, exactly how to get or do it step by step, what to have ready, cost in rand or ${cur.code} with fees and courier costs, how long it takes, how long it stays valid, who it applies to, the mistakes that get applications refused or delayed, and practical tips. Be specific: name offices, websites, forms and fees.
2. Add anything this scenario needs that's missing: documents (for example apostilles, certified copies, translations, police clearance, anything my partner needs), steps (with when they're due), and costs. Put them in addDocuments, addSteps and addCosts, each with full detail.
3. Only correct a cost's baseline figure if an official source shows it's different: give "amount" and "currency" on that cost's item, and say where the figure is from in "cost".
4. Use official sources (government and immigration sites) for rules and fees. Put links in "sources" with today's date in "checked". If you're unsure, give your best estimate and say so.

HOW TO DELIVER IT
- One JSON code block (\`\`\`json), nothing else in the block, following the format below exactly. Also offer it as a downloadable .json file if you can.
- Remove the // comments and the ? marks from the field names: the file must be plain JSON.
- New keys are short lowercase words joined by hyphens. Don't use the step keys "visa-decision", "land" or "saving".

Format (version 1). Fields marked ? are optional:
{
  "format": "northbound-details",
  "version": 1,
  "scenarioId": "${id}",
  "scenarioName": ${JSON.stringify(s.name)},
  "createdOn": "${today}",
  "summary?": "A short overview of this move: the order to do things in, and the biggest risks.",
  "items": [{
    "ref": "doc:passport",                       // a ref from the lists above
    "summary?": "What it is, in a sentence or two.",
    "why?": "Why this scenario needs it.",
    "how?": ["Step one.", "Step two."],          // in order
    "bring?": ["What to have ready."],
    "cost?": "R600 at Home Affairs, plus R150 courier",
    "takes?": "6 to 13 weeks",
    "validFor?": "Must be valid 6 months after landing",
    "forWho?": "You and your partner",
    "watchOut?": ["Things that get applications refused or delayed."],
    "tips?": ["Practical tips."],
    "sources?": [{ "label": "text", "url": "https://...", "checked?": "${today}" }],
    "amount?": 637, "currency?": "local" | "ZAR"  // cost refs only, to correct the baseline
  }],
  "addDocuments?": [{ "key": "apostille", "name": "text", "from": "text", "check": "what makes it right",
                      "cost?": 300, "costCurrency?": "ZAR" | "local", "takes?": "text", "optional?": "Only if ...", "url?": "https://...",
                      "detail?": { ...the same detail fields as an item, without ref } }],
  "addSteps?": [{ "key": "partner-docs", "title": "text", "short?": "Short name on the map",
                  "line": "paper" | "money" | "move" | "trunk",   // trunk = after the visa decision
                  "monthsBeforeLanding": 4,                         // or "now"; negative = after landing
                  "milestone?": false, "cost?": "text", "takes?": "text", "from?": "text", "url?": "https://...",
                  "steps": ["Short instruction."], "detail?": { ...as above } }],
  "addCosts?": [{ "key": "courier", "group": "paper" | "move" | "runway", "label": "text", "amount": 40,
                  "currency": "ZAR" | "local", "perPerson?": true, "basis?": "how it's worked out", "source?": "https://..." }],
  "notes?": ["Anything else worth knowing, in plain words."],
  "sources?": [ ...as above ]
}

"local" means ${cur.code} (${cur.symbol}) for this scenario.`
}
