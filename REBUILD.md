# Northbound rebuild — brief for Claude Code

> Written 23 Nov 2026. Put this file in the repo root next to `PLAN.md`, and the mockups in `design/v5-glass/`.
> Read `PLAN.md`, `CLAUDE.md` and `convex/_generated/ai/guidelines.md` before changing anything.

## 1. What this is

Northbound already works. This rebuild does three things:

1. **New look.** Restyle every screen to the dark "glass" design in `design/v5-glass/` (13 mockups). It replaces the Hemisphere/Trip look: no more yellow, brick or Archivo.
2. **Your quotes vs the baseline.** Next to every baseline cost, Ethan can add the price he actually found. The newest quote counts, older ones are kept as history, and he can add his own extra costs.
3. **More depth.** Show the detail the engines already calculate: individual cost lines, where each number comes from, and warnings when a plan doesn't add up. Add loans and credit to the plan.

**Scope:** UK Ancestry visa, Manchester and London only. Other countries are a later phase, not part of this rebuild.

## 2. Keep as it is

Don't rewrite these. Extend them where this brief says so.

- Convex backend, schema, auth (`convex/auth.ts`, `auth.config.ts`), the Loot sign-in and the Loot goal link (`src/lib/loot.ts`, `convex/lib/loot.ts`)
- The engines in `shared/`: `engine.ts`, `rules.ts`, `timeline.ts`, `settlement.ts`, `documents.ts`, `cities.ts`, `dates.ts`, `ics.ts`, and their tests
- Every existing feature: scenarios, the transit map and stop sheet, Paperwork tracker, Life, Compare, Settlement tracker, Rules page with overrides, live FX (`convex/fx.ts`), reminders and push, share links, calendar export, JSON export, PWA
- Routes in `src/App.tsx`, apart from the additions below
- `npm test` must stay green, and every engine change gets tests

## 3. The design system

The mockups are the source of truth. Each `.dc.html` file is plain HTML with inline styles plus a small logic block, so read the values straight from it. **Don't ship the mockup files.** Rebuild the screens in React using the tokens below.

Replace the tokens in `src/styles.css`. Screens must use tokens, never hard-coded hex values, as now.

### Colour (dark, the default)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#05070B` | Page background (cool blue-black) |
| `--surface` | `#0E131A` | Cards |
| `--raised` | `#131A23` | Inputs, inner tiles |
| `--avatar` | `#1B2431` | Avatar, small solid chips |
| `--hair` | `rgba(255,255,255,0.07)` | Card borders |
| `--edge` | `inset 0 1px 0 rgba(255,255,255,0.05)` | Light catching the top edge of every card |
| `--text` | `#F5F5F7` | Main text |
| `--text-2` | `#CAD3DE` | Secondary text |
| `--muted` | `#98A4B3` | Labels, sub-lines |
| `--faint` | `#8492A3` | Footnotes (still passes 4.5:1 on `--bg`) |
| `--accent` | `#4AA8FF` | **Mine**: your quotes, primary buttons (dark text `#05070B` on it), progress marker, focus ring |
| `--baseline` | `#A9B4C8` / text `#C3CCDB` | **Baseline**: Northbound's calculated figures |
| `--l-paper` | `#C08BFF` | Map line: paperwork |
| `--l-money` | `#5FE3B0` | Map line: money, Cape Town |
| `--l-move` | `#64D2FF` | Map line: move |
| `--l-trunk` | `#F5F5F7` | Joined line after the visa decision |
| `--ok` | `#5FD68A` | Under baseline, on track, linked |
| `--warn` | `#FFC145`, text `#FFD98A` | Over baseline, thin budget, estimates. Tint `rgba(255,193,69,0.08)` with border `0.25` |
| `--danger` | `#FF9A9A`, tint `rgba(255,111,111,0.14)` | Due now, short every month |

Warning and danger are the only warm colours, on purpose. Blue always means "mine" and silver always means "baseline". Never swap them.

**Light mode** already exists in Northbound (Settings › Appearance). Keep it and derive a cool light version: white and `#F4F7FA` surfaces, text `#0B1220`, accent `#0071E3`, the same meanings. It isn't mocked, so match the dark screens' structure.

### Materials (glass)

- **Top bar:** sticky, `background: rgba(5,7,11,0.72)`, `backdrop-filter: blur(30px) saturate(180%)`. No border line: use `box-shadow: 0 1px 0 rgba(255,255,255,0.05), 0 18px 32px -26px rgba(0,0,0,0.95)`. Content scrolls underneath.
- **Glass panels** over photos (Trip hero, sign-in, first run): `rgba(14,20,28,0.66)`, `blur(40px) saturate(180%)`, a `rgba(255,255,255,0.12)` border and the top-edge highlight.
- **Sheets** (add quote, map stop, editor summary): `rgba(20,28,38,0.78)`, `blur(50px)`, behind a dimmed, blurred scrim (`rgba(0,0,0,0.5)` + `blur(14px)`).
- Never stack a light glass layer on another glass layer.
- `prefers-reduced-transparency: reduce` turns every glass surface solid.

### Type

- System font first: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, sans-serif`. Load Inter as the fallback for non-Apple devices. Drop Archivo and Plus Jakarta Sans.
- `font-variant-numeric: tabular-nums` on the body, so money lines up.
- Tracking depends on size: the big number (44–52px, weight 800) uses about `-0.04em`, headings (32–36px, 700) about `-0.03em`, and body stays near 0.
- Hierarchy comes from weight + size + leading together, with one big number per screen.

### Shape and spacing

- Radius: 34px hero cards, 28–32px section cards, 22–26px tiles, 14–18px inputs and inner tiles, 999px pills.
- Page max width 1280px, padding 32px, 20–24px gaps between cards.
- Desktop-first, but every screen must work at phone width: nav wraps, side panels stack, wide tables scroll inside their card.

### Motion and feel (from the apple-design skill)

- **Press feedback** on pointer-down: `scale(.97)` over about 90ms, released over 220ms with `cubic-bezier(.2,.9,.25,1)`.
- **One opening animation per screen:** content fades up 10px over 520ms. Northbound's existing "one animation per screen" rule stays.
- **Sheets use springs**, not CSS keyframes, so they can be grabbed and reversed: critically damped (bounce 0), about 0.35s. The add-quote sheet must be draggable down to dismiss, with rubber-banding at the top and velocity handoff on release. It enters and leaves from the button that opened it.
- **Number changes** (editor sliders, rate changes) animate the big number smoothly, with no jumps.
- `prefers-reduced-motion`: swap slides and springs for short cross-fades.
- Focus ring: 2px `--accent`, 3px offset.

### Shared layout

- **Top bar:** wordmark "northbound" (lowercase, weight 800) with the up-arrow icon on an accent tile. Pill nav: Trip · Map · Money · Progress · Paperwork · Life · Compare. Rate chip (£1 = R21.80 · live). Avatar linking to Profile/Settings.
- Settling, Scenarios, Rules and the rest of Settings live behind the avatar (see the Settings screen).
- **Photos:** the mockups have striped placeholders. Use Northbound's existing Unsplash photos (`cities.ts` `photo`, `photoUrl()`), with credits.

## 4. Screens

Route, mockup, then what changes. "New" means it's new to Northbound.

| Screen | Route | Mockup |
|---|---|---|
| Trip (home) | `/` | `Main.dc.html` |
| Map | `/map` | `Map.dc.html` |
| Money | `/money` | `Costs.dc.html` |
| Add my quote (sheet) | `/money/quote/:itemKey?` (new) | `AddCost.dc.html` |
| Progress | `/progress` | `Progress.dc.html` |
| Paperwork | `/paperwork` | `Paperwork.dc.html` |
| Life | `/life` | `Life.dc.html` |
| Compare | `/compare` | `Compare.dc.html` |
| Settling | `/settlement` | `Settlement.dc.html` |
| Profile + Settings | `/settings/:section` (Profile folds in) | `Settings.dc.html` |
| Scenario editor | `/scenario/:id` | `Editor.dc.html` |
| First run | first visit | `FirstRun.dc.html` |
| Sign in | signed out | `Auth.dc.html` |

### Trip
City hero photo with a glass panel: "Save before you go", the number in rand (pounds and runway underneath), then 4 stats: months to go, % saved, needed a month, and **new** "costs you've quoted (5 of 13)". Next to it, the "How far you've come" mini route with the off-pace warning. Below: next stops (from the timeline), and a **new** "Baseline vs your quotes" card with a one-line summary of the difference.

### Map
The existing transit map, restyled: three lines in a grid (paperwork, money, move), each with its stops and dates, joining at "Visa decision", then the trunk to Land and Settle. The stop sheet is now a side panel on desktop (a sheet on a phone) with cost / takes / where tiles, numbered steps, **new** "Your quote" with "+ Add quote", "Open website" and "Mark as done".

### Money (the main new work)
- **Three totals:** Baseline (£ and R, "12 of 13 items priced"), My quotes ("5 of 13 quoted"), and **Plan total**, which uses your quote where you have one and the baseline everywhere else. The plan total **becomes your number** and the Loot goal target (if sync is on).
- **Filter pills:** All · Needs my quote · Over baseline · My extra costs. Plus a £/R display toggle.
- **One card per group** (Paperwork and visa · Getting there · Runway). A row per item: name + basis, Baseline (£ with R under it), Mine, Difference chip: `= Matches` (neutral), `−£38 under` (ok), `+£100 over` (warn), `Yours only`, or a `+ Add quote` button. Custom items carry a "My extra" tag.
- A dashed **"+ Add my own cost"** button.
- Footnote: every baseline figure links to its rule on the Rules page. Tapping a figure shows how it was worked out (this is in PLAN.md and not built yet, so build it here).
- **Once you're paid** moves to Life (see below).

### Add my quote (sheet)
Pick the item (or "My own cost (not in the baseline)", which then asks for a name and a group). Amount with a £/R toggle and a live conversion line. A comparison against the baseline with a chip. "Where I found it" link, date found (defaults to today), note. Save / Cancel. "Older quotes for this item stay in its history." When the item already has quotes, show the history list under the form with each quote's amount, date and source. Ethan can delete a quote from there; deleting the newest makes the previous one count.

### Progress
The vertical flight route from Cape Town to Manchester with waypoints at 20/40/60/75/90/100% ("You're over Namibia"). Six number tiles: saved, still to go, your pace (the lower of planned and the 3-month Loot average, as now), date you'll have it all, when money must show, months left. The off-pace warning with **three** fixes: save more, move the date, **new** borrow part. **New** "How you'll pay for it": a stacked bar plus rows for savings, personal loan and credit card. Recent Loot deposits.

### Paperwork
A 2-column grid of document cards: name, where it comes from, required or optional, a badge (Order now / To do / Ordered / In hand), cost / takes / map stop tiles, a "Check:" line, a 4-step status control (To do · Ordered · Arrived · Checked), dates and note. Header: documents in hand, **new** total cost (R and £) and slowest item. Filter pills. Data comes from `shared/documents.ts`, plus the cost and lead-time values from rules.

### Life
**Once you're paid:** salary, income tax, NI and take-home tiles (from `takeHome()`); each monthly cost with a bar; **Left each month**. **New:** a plain-words warning when "left" is thin, with the salary needed to keep £300 a month and the room-share comparison. Tiles: calling home, a flat white (£ and R vs Cape Town), getting around, wet days. Daylight chart (Manchester in accent, Cape Town in mint, the landing month highlighted). Neighbourhoods table with a "Use" button that sets `area` on the scenario.

### Compare
**New:** up to 4 scenarios as columns: photo, name and a status flag (Works / Very tight / Doesn't add up, based on "left each month"). Rows: your number, the three groups, take-home, outgoings, left each month, ready at your pace, quotes added. The plain-words sentence above it, generated from the differences.

### Settling
A 4-step path (land → live and work → apply to settle → citizenship) with dates and fees, and the total cost of the path in £ and R. The conditions list with status. The English result select. Earnings by tax year with bars against £12,571. **New** warning: if the first tax year has too few months of pay to reach £12,571, say so and suggest the fix.

### Profile + Settings
A left column with the profile card and section nav, and the selected section on the right. Sections: Your scenarios, Settling in the UK (links to `/settlement`), Loot, Savings plan, **new** Loans and credit, **new** My quotes (all quotes with history), Reminders and calendar, Share your plan, Appearance, Rules and sources, Account. The Rules page shows groups of rules with value, "from" date, source link and "last checked" date, plus an Edit button. **New:** flag each rule as Estimate or Needs a refresh, with counts in the header.

### Scenario editor
Left: name, when to land (two option cards, with the earliest possible date under the date field), where and who (segmented controls + neighbourhood), money and timing (sliders for job hunt, salary, rate, **new** "if the rand weakens", certificates, let nights, flight, buffer), **new** Loans and credit. Right: a glass summary that updates live (the number, the three groups, left each month, save a month, the difference from your main scenario, and "Make this my main scenario").

### First run
Split photo (Cape Town on top, Manchester below, joined by an accent line) with a live "Your number so far". Now **5** questions: when, where (+ home type), who, savings so far, **new** "Do you plan to borrow?" (loan + card amounts, can skip).

### Sign in
Photo with a glass message, and a form: Sign in / Create account tabs, email + password, Continue, "Sign in with your Loot account", "Continue with Google", "Forgot password?".

## 5. Data and engine changes

### 5.1 Split the cost lines (`shared/engine.ts`)
`upfrontCosts()` groups some items together. Give every line a stable `key` and split it so each one can be quoted:

| key | Label | Was in |
|---|---|---|
| `visaFee` | UK Ancestry visa fee | Paperwork |
| `ihs` | Immigration Health Surcharge, 5 years | Paperwork |
| `tbTest` | TB test | "TB test and certificates" |
| `groCert` | Gran's birth certificate (GRO) | "TB test and certificates" |
| `saCerts` | Unabridged birth certificates × 2 | "TB test and certificates" |
| `flight` | One-way flight | Getting there |
| `monthlyLet` | Monthly let, first N nights | "First N nights" |
| `deposit` | Deposit (5 weeks) | "Deposit and first month's rent" |
| `firstRent` | First month's rent | "Deposit and first month's rent" |
| `basics` | Bedding, SIM, basics | Getting there |
| `runway1` | Month 1 living, rent already paid | Runway |
| `runwayRest` | Months 2 to N living | Runway |
| `buffer` | Safety buffer (only if > 0) | Runway |

`LineItem` gains `key`, `basis` (the short "how it's worked out" text shown under the name) and `ruleKeys` (which rules it uses, so the UI can link to them). Totals must not change: add a test that the split items sum to the old totals for the default scenarios.

### 5.2 Quotes and custom costs (Convex)
```ts
quotes: defineTable({
  userId: v.string(),
  scenarioId: v.id('scenarios'),
  itemKey: v.string(),            // a LineItem key, or a customCosts id
  amount: v.number(),
  currency: v.union(v.literal('GBP'), v.literal('ZAR')),
  sourceUrl: v.optional(v.string()),
  foundOn: v.string(),            // ISO date
  note: v.optional(v.string()),
  createdAt: v.number(),
}).index('by_user_scenario', ['userId', 'scenarioId'])
  .index('by_user_scenario_item', ['userId', 'scenarioId', 'itemKey']),

customCosts: defineTable({
  userId: v.string(),
  scenarioId: v.id('scenarios'),
  group: v.union(v.literal('paper'), v.literal('move'), v.literal('runway')),
  label: v.string(),
  createdAt: v.number(),
}).index('by_user_scenario', ['userId', 'scenarioId']),
```
- **Quotes belong to a scenario.** Copying a scenario copies its quotes and custom costs.
- **The newest quote counts** (highest `foundOn`, then `createdAt`). The rest are history.
- **Rand quotes** convert at the scenario's rate when shown in pounds. Store the original amount and currency.
- **A custom cost has no baseline.** Its value is its newest quote.
- **Plan total** = Σ over baseline items (newest quote if any, else baseline) + Σ custom costs. Add `planTotal()` to the engine and use it wherever the number comes from today (`plan()`, Trip, Progress, Loot target sync, Compare, share page).
- Every Convex function checks the signed-in user, as now. Include quotes in the JSON export and in "delete my data".

### 5.3 Loans and credit
- Add to `profiles`: `loanZar`, `loanMonths`, `loanRatePct`, `cardZar`, `cardRatePct` (all optional, default 0 or missing).
- **Savings target** = plan total (in rand) − loan − card limit used. The number to land stays the full cost; Progress and Trip show both the full cost and what's left to save.
- Monthly repayments use a standard amortisation formula. Show them as a line in Life's monthly budget ("Loan repayment", "Card repayment"), so "left each month" includes them.
- Warn when the repayments push "left each month" below £100.
- The off-pace fixes on Progress gain the borrowing option.

### 5.4 Data refresh
- **Manchester rents in `cities.ts`:** the ONS average for a 1-bed was £1,007 a month in Sep 2026, and Northbound has £1,150. Re-check studio, room and 1-bed for Manchester and London against the latest ONS and listings, and update `lastChecked`.
- **Rules:** add `estimate: true` where the value isn't official (already partly there). Add a `needsRefresh` check: anything with `lastChecked` older than 90 days.

### 5.5 Settlement first-year check
In `shared/settlement.ts`, estimate first-tax-year earnings from the landing date + job hunt + salary (tax years run 6 Apr–5 Apr). Flag it when it's below the threshold. Test it.

## 6. Order of work

1. **Design tokens and shared shell** (top bar, cards, buttons, pills, sheet, motion utilities). Restyle Trip first and check it against `Main.dc.html`.
2. **Engine:** split the line items (5.1) with tests, then `planTotal()`.
3. **Quotes and custom costs** (5.2): schema, functions, the Money screen, the add-quote sheet with history.
4. Restyle the remaining screens one by one, in the order of the table in section 4.
5. **Loans and credit** (5.3), then the Progress funding block, the editor section and the first-run question.
6. Data refresh (5.4) and the settlement check (5.5).
7. Accessibility and reduced motion/transparency pass. Phone-width pass on every screen.

Commit after each step. Keep `npm test` and `npm run typecheck` passing.

## 7. Done when

- [ ] Every screen matches its mockup at 1440px and works at 390px wide
- [ ] No hard-coded colours outside `styles.css`. Light mode still works.
- [ ] Each cost line can take a quote. The newest quote counts and history shows. Custom costs work.
- [ ] Plan total drives the number, Progress, Compare and the Loot target
- [ ] Loans and credit lower the savings target and show as repayments in Life
- [ ] The add-quote sheet can be dragged to dismiss and respects reduced motion
- [ ] All text passes WCAG AA contrast. Every control is a real button, link or input with a label.
- [ ] Existing features still work: Loot link, reminders, share link, calendar, export, PWA
- [ ] Tests cover the split items, plan total, quotes logic, repayments and the first-year check

## 8. Not in this rebuild

- Other countries or visa routes
- An AI helper
- Public multi-user launch. Still Ethan first, as in PLAN.md.
