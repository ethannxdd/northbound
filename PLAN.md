# Northbound — Plan

> A personal "what if I moved on [date]" simulator for moving from Cape Town to the UK on the UK Ancestry visa.
> **Status:** first version built 9 Nov 2026 (see README.md to run it).
> **Facts last checked:** 9 Nov 2026. Re-check everything marked ⚠️ before building.

---

## 1. The idea

You describe a move scenario, for example *"Ancestry visa, Manchester, solo, house share, landing 1 March 2029, R180k saved, 3-month job hunt"*. The app turns it into:

1. **Your number:** how much you need saved, in rand and pounds, to make the move safely.
2. **Runway:** how many months you can job-hunt in the UK before money runs out.
3. **Countdown timeline:** every task, worked backwards from the move date.
4. **Monthly life:** what a normal month looks like in that city once you have a job.
5. **Long-term path:** visa → extension/settlement → citizenship, with dates, costs and conditions.

Copy a scenario, change one setting, and compare them side by side.

**Inspiration from Loot:** one honest headline number that everything else is built around. The app has its own identity; look and feel will be designed after planning.

**Audience:** Ethan first. It should be built cleanly enough to open to the public later, but there's no multi-user work in the first version.

---

## 2. Ethan's situation (drives the defaults)

| | |
|---|---|
| Nationality / location | South African, Cape Town |
| Job (per payslip) | IT Technical Support |
| Route | **UK Ancestry visa**, through his dad's mother (UK-born) |
| No | UK job offer, UK degree, UK partner |
| Household | Solo. Partner mode is a "just in case" option. |
| Cities | Manchester, London. More can be added later. |
| Horizon | ~2+ years away, so the 2027 settlement reforms will apply |
| Devices | Desktop web, and must work well on a phone |

**Grandmother's birthplace:** England/Wales, so her certificate comes from the GRO (General Register Office).

**Backup route:** Skilled Worker is probably not viable for an IT support role since the July 2025 rules (RQF 6 requirement) ⚠️. It's shown as info only, not modelled.

---

## 3. Verified facts (stored as data, not code)

### UK Ancestry visa ([GOV.UK](https://www.gov.uk/ancestry-visa))
| Rule | Value |
|---|---|
| Eligibility | 17+, Commonwealth citizen, a grandparent born in the UK, Channel Islands or Isle of Man (or Ireland before 31 Mar 1922, or a UK ship/aircraft). Not through step-parents. |
| Must show | Able to work and plans to work. Can support and house yourself without public funds. |
| Job offer / sponsor / salary minimum | **None** |
| English test for the visa | None listed |
| Funds | **No fixed amount.** Bank statements dated within 31 days of applying. |
| Visa fee | **£726** |
| Immigration Health Surcharge | **£1,035/year** (adult), so £5,175 for 5 years, paid upfront ([GOV.UK](https://www.gov.uk/healthcare-immigration-application/how-much-pay)) |
| Length | 5 years, then extend 5 more or apply for settlement |
| Apply window | No earlier than 3 months before travel |
| Decision | ~3 weeks from outside the UK. Faster paid options exist ⚠️ price unknown. |
| Can't | Switch into this visa from inside the UK, or claim public funds |
| TB test | Required for South Africa, at a Home Office–approved clinic ([GOV.UK](https://www.gov.uk/tb-test-visa/countries-where-you-need-a-tb-test-to-enter-the-uk)) ⚠️ cost and validity to confirm |

### Documents ([GOV.UK](https://www.gov.uk/ancestry-visa/documents-you-must-provide))
- Passport
- **Full** birth certificates for you, your dad and your grandmother
- Name-change evidence (e.g. grandmother's marriage certificate)
- Proof of funds (within 31 days)
- Evidence you plan to work (job offers, applications, CV and so on)
- TB results
- Relationship evidence if a partner comes with you

### Certificates: the critical path
| Certificate | Source | Time / cost |
|---|---|---|
| Grandmother's birth (England/Wales) ✅ | GRO online | £12.50, sent in 4 days (15 working days and +£3.50 without the GRO index ref). Priority £38.50, next day. ([GOV.UK](https://www.gov.uk/order-copy-birth-death-marriage-certificate)) |
| Grandmother's marriage (if her surname changed) | GRO if she married in England/Wales. Home Affairs if she married in SA. | ⚠️ confirm where she married |
| Ethan's and his dad's **unabridged** SA certificates | Home Affairs | Official 6–8 weeks. Unofficial reports range from 3 to 18 months. An abridged certificate is not accepted. |

**Action now, whatever happens with the app:** order both unabridged certificates.

### Partner ([GOV.UK](https://www.gov.uk/ancestry-visa/your-partner-and-children))
- Married or civil partner, **or** 2+ years in a relationship when applying (living together, or with evidence of commitment if not).
- A partner can work and study, and can settle after 5 years if they meet the requirements. No public funds.
- ⚠️ Partner visa fee and NHS surcharge to confirm (assume the same as the main applicant for now).

### Settlement: 2027 "Earned Settlement" reform ⚠️
Policy published 2 Nov 2026 (*A Fairer Pathway to Settlement*, CP 1707). Rules are laid from Dec 2026 and **implemented during 2027**. There's no general exemption for people already in the UK.
- The standard wait goes from 5 to **10 years**.
- **UK Ancestry keeps a 5-year path** ("British connection"), provided the conditions are met. Source: law-firm summaries ([Lewis Silkin](https://www.lewissilkin.com/insights/2026/11/03/home-office-sets-out-revised-earned-settlement-framework-102o7co)). Confirm against the actual Immigration Rules.
- Conditions for every path:
  - **B2 English.** The separate B2 change (HC 1691) is from 26 Mar 2027. ⚠️ Check whether SA schooling or a degree is exempt, or whether a test is needed.
  - Earnings of **≥ £12,571/year** for the required period
  - No UK criminal record
  - No government debt (NHS, tax, NI)
- Citizenship timing after settlement: ⚠️ to check

### South African money (2026 Budget, per news/advisers ⚠️)
- Single discretionary allowance: **R2m per calendar year**, no SARS clearance
- Foreign investment allowance: **R10m per year**, with SARS approval (AIT)
- Allowances after ceasing tax residency, and retirement annuity access: **unconfirmed**. The app labels these "check with an adviser".

---

## 4. Features

### 4.1 Profile
- Date of birth, current salary (ZAR), monthly SA expenses, savings, home currency
- Ancestry chain (grandmother's birthplace and certificate status)
- An optional partner (relationship start date, married or not, their job and salary)

### 4.2 Scenario builder
Inputs, all editable, all copyable:
- **When to land:** either **on a set date**, or **when I've saved enough**. In "when I've saved enough" mode the landing date is worked out from your savings pace (see 4.10), and it moves as you save. Because the number itself depends on the date (rules in force, exchange rate), the app recalculates both until they agree, which takes 2–3 passes.
- **City:** Manchester or London (data-driven so more can be added)
- **Household:** solo, or with a partner (working or not)
- **Housing:** house share, studio or 1-bed. Area tier: central or outer.
- **Savings at move date** (or "current savings + monthly saving until then")
- **Exchange rate:** live rate, plus a "rand weakens X%" slider
- **Job hunt length:** 0–9 months
- **UK salary** once employed (presets for IT support roles by city ⚠️ research ranges)
- **Certificate lead time:** 2–18 months
- **Temporary stay:** length and type (Airbnb or hostel)

### 4.3 Your number + runway (home screen)
- **Headline:** "Save **R___** to land on [date] with [N] months of runway."
- Breakdown:
  - **Pre-move:** documents, TB test, visa, NHS surcharge, flights, luggage/shipping
  - **Landing:** temporary stay, deposit (5-week cap), first month's rent, setup, furniture
  - **Job-hunt months:** cost of living with no income
  - **Buffer**
- **Runway chart:** savings month by month from landing, through the job hunt, to the first payday. Marks the month money goes negative.
- A traffic-light status per scenario

### 4.4 Countdown timeline
Generated backwards from the move date, with each task's lead time stored as data:
1. Order unabridged SA certificates (yours and your dad's), then grandmother's UK certificate and any marriage certificates
2. Renew passport if needed
3. Start the UK job search remotely (CV in UK format, LinkedIn location)
4. TB test (inside its validity window before applying)
5. Gather proof of funds (statements within 31 days)
6. Apply for the visa (≤ 3 months before travel) and wait for a decision
7. Book flights and temporary stay. SA admin: bank, tax residency decision, cancel contracts, notify SARS.
8. **After landing:** eVisa / UKVI account, NI number, bank account, phone SIM, GP registration, permanent flat (UK references or guarantor issue), council tax, start building credit
9. Settlement checklist across the 5 years (B2 English, earnings ≥ £12,571 each year, no debt)

- Shows as a checklist with real dates
- Warns when the date is impossible ("certificates won't arrive in time at the current lead time")
- Ticked progress is saved

### 4.5 Monthly life
- UK take-home from gross salary (income tax, NI; rates and bands as data ⚠️)
- Rent, council tax (band/area), energy, water, broadband, phone, transport (Manchester buses/Metrolink vs London TfL), groceries, TV licence, gym or other
- **"What's left"** each month. Compared with Cape Town today, in both currencies.
- Manchester and London side by side

### 4.6 Long-term path
- Timeline: visa (5 years) → settlement (if conditions met), or extension → citizenship
- Total cost of the path
- Conditions tracker: years where earnings were ≥ £12,571, B2 English status, no debt
- **Stress tests:** job loss in year X, rand weakens, settlement rules shift to 10 years, partner joins in year X

### 4.7 Compare
- 2–4 scenarios side by side: your number, runway, monthly what's left, risk flags, time to settlement

### 4.8 Partner mode ("just in case")
- Switch on to add the partner's costs (visa, NHS surcharge, flights) and income
- Checks the 2-year relationship rule against the application date: "can come with you" or "needs to join later"

### 4.9 Rules & sources page
- Every fee, threshold and lead time with its value, source link, "last checked" date and "effective from" date
- Editable in the app so Ethan can update a number without code

### 4.10 How far you've come (progress)
Mockup: "How far you've come" in `design/screens-v4.html`.
- Your savings drawn as the flight north: a route from Cape Town (bottom) up to Manchester (top), with you as a marker at the % saved and places along the way ("You're over Namibia" at 20%, then Congo River, Lake Chad, Sahara, Mediterranean).
- Saved, still to go, saving per month, the date you'll have it all, and months left.
- **Savings pace** = your planned monthly amount, or the average of your last 3 months of deposits into the Loot goal if that's lower.
- **Deadline warning:** your money must show in bank statements before you apply for the visa (statements dated within 31 days of applying, and you can apply up to 3 months before travel). If your pace misses that, the app says by how much and offers both fixes: "Save R10,000 a month to make it" or "Land in May 2029 instead".
- Recent deposits from Loot show on the route ("+R9,400 from Loot on 1 Nov").

### 4.11 Link to a Loot savings goal
Mockup: "Link your Loot savings" in `design/screens-v4.html`.
- **No custom API needed.** Loot's goals live in its Supabase database (`savings_goals`: `target_amount`, `current_amount`, `target_date`; `goal_contributions`: each deposit with amount and date). Supabase's own API, protected by Loot's existing row-level security (each user sees only their own rows), is the API.
- **How it works:**
  1. You sign in to Northbound with your Loot account (same Supabase project, same sign-in options: Google, magic link, password).
  2. You pick an existing goal, or Northbound creates one in Loot called "UK move" with your number as its target.
  3. Northbound subscribes to that goal with Supabase Realtime, so a deposit in Loot moves your marker within seconds. It also refreshes whenever the app opens.
  4. Optional, on by default: keep the Loot goal's target (and target date) equal to Northbound's number, so both apps show the same goal.
- **Changes needed in Loot:** add `savings_goals` and `goal_contributions` to the Realtime publication (one small migration), and add Northbound's web address to the allowed sign-in redirect URLs in Supabase. Loot's code doesn't change otherwise.
- **Scope:** Northbound only reads the linked goal and its deposits, and only writes that goal's target and target date. Note: signing in with the Loot account technically lets Northbound read all of your own Loot rows; the limit is in Northbound's code. That's fine while both apps are yours. If Northbound ever goes public, switch to a scoped Loot edge function with its own token instead.
- **If not linked:** you type your savings in by hand, and everything else still works.

---

## 5. Design principles

- **Rules as data with effective dates.** A scenario uses the rules in force on its own dates. 2027 changes can be entered ahead of time.
- **Every number explains itself.** Tap a figure to see how it was worked out and where the inputs came from.
- **Not legal or financial advice.** Shown clearly, with links to the GOV.UK source for each rule.
- **Private by default.** Only you can see your data: Northbound's data in Convex is tied to your user, and Loot's data stays behind its row-level security. JSON export as a backup.
- **Phone-first layout** that expands for desktop. Installable as a PWA.

---

## 6. Tech (built on what worked in Loot)

| Concern | Choice |
|---|---|
| Build | Vite + React 19 + TypeScript |
| Styling | Plain CSS with light/dark tokens (`src/styles.css`), ported from the mockups |
| Routing | React Router |
| Charts | Hand-drawn SVG (transit map, runway bars, daylight, route) |
| Sign-in | Loot's Supabase auth (same account as Loot). Convex is set up to trust Supabase's sign-in tokens as a custom JWT provider, so there's one sign-in for both. ⚠️ Needs Loot's Supabase project on asymmetric JWT signing keys (it publishes a JWKS endpoint); older projects use a shared secret and must switch first. |
| Storage | **Convex** (decided 9 Nov 2026), same as Truefare: profile, scenarios, ticked tasks, rules data. Live queries keep phone and desktop in sync. Every Convex function checks the signed-in user. |
| Loot link | Read straight from Loot's Supabase (`savings_goals`, `goal_contributions`) in the client, with Supabase Realtime for live updates. Northbound's calculations then run on that value; nothing from Loot is copied into Convex except the linked goal's id. |
| Calculations | Plain TypeScript engines shared by the client (instant what-ifs) and Convex functions |
| Install / offline | vite-plugin-pwa |
| Exchange rate | Free FX API, with the last rate cached and manual override ⚠️ pick an API |
| Tests | Vitest, especially for the tax, runway and timeline calculations |
| Later | Scoped Loot edge function instead of a shared sign-in (if it goes public), optional AI helper (free Gemini) |

**Core engines** (plain TypeScript, fully unit-tested, no UI):
- `rules`: look up a fee or threshold for a given date
- `costs`: upfront, landing and monthly costs
- `ukTax`: gross to net
- `runway`: monthly savings projection
- `timeline`: work tasks backwards from the move date and flag clashes
- `settlement`: path and conditions over the years

### Skills to use while building (installed 9 Nov 2026)
| Job | Skill |
|---|---|
| Aesthetic direction, type, avoiding generic AI looks | `frontend-design` (Anthropic), `ui-ux-pro-max`, `ui-styling` |
| Polish and the invisible details | `emil-design-eng`, `apple-design` |
| Motion: build, review, keep at 60fps | `animate`, `review-animations`, `animation-performance`, `find-animation-opportunities` |
| Charts (runway, compare, costs) | `dataviz` |
| UI review against interface guidelines | `web-design-guidelines` (Vercel) |
| React performance | `vercel-react-best-practices` |
| Accessibility (WCAG 2.2) and load speed | `accessibility`, `performance` (Addy Osmani) |

Skipped: `taste-skill` (popular, but failed one security audit).

### Look and feel (chosen 9 Nov 2026, mockups in `design/directions-v3.html`)
- **Direction:** Hemisphere as the overall look and home screen. Interchange's transit map is the plan/timeline screen.
- **Home:** Cape Town (yellow) on top, Manchester (Atlantic blue) below, your number on the join between them, runway bars, and a "next stop" sign that links to the map.
- **Map:** paperwork, money and move lines join at the visa decision, then run as one line to landing, first payday and settling.
- **Compare:** split screen of two scenarios, plus one plain-words sentence on the difference.
- **Palette:** Cape sun `#f4b63f` (Cape Town and money), Atlantic `#0f5277` (UK and the move), Mill brick `#a2432f` (paperwork and anything due now), Drizzle `#8e9ba6`, Chalk `#f4f6f7`, Ink `#16202b`.
- **Type:** Archivo only, using its width axis: wide and heavy for money, narrow for places and headings.
- **Rules:** one big number per screen; one opening animation per screen; the next stop is always one tap from home.
- **Dark mode ("night"):** follows the device unless the user picks Light or Dark. Cape Town becomes dusk `#2a1f0e` with a sun-yellow city name, Manchester becomes deep Atlantic `#0b2b40`, background Night `#0e1822`, text Moon `#e6ecf0`. Line colours are lifted for contrast (brick `#e07a5f`, move `#4fa3d1`), and the station sign turns light, like a lit sign at night. Colour meanings stay the same in both modes. All colours are tokens, so screens never hard-code a hex value.
- **Other screens** (`design/screens-v4.html`):
  - **Money:** "Save before you go" split into Paperwork and visa / Getting there / Runway, coloured by the map's three lines, with a rand/pound switch. Below it, "Once you're paid": take-home and a monthly budget, always in pounds, ending in "Left each month".
  - **Life:** daylight-hours chart (Cape Town and Manchester curves cross; "You land" marked), plus tiles for time difference, prices, transport and weather.
  - **Scenario editor:** land date, city, who's coming, home type, time to find work (slider), rand-to-pound rate (slider); the number updates live in a bar at the bottom.
  - **Stop sheet:** tap a map stop → sheet with line, due status, cost / time / source, numbered steps, "Open website" and "Mark as done".
  - **First run:** 4 questions (when, where, who, savings so far) in the split-screen style.
  - **Desktop:** sidebar (nav and saved scenarios), Home in the middle, Map on the right. Below ~900px it uses the phone layout.
  - **Icon:** yellow/blue split square with a transit line crossing the join to a station. Day and night versions.
- **Name: Northbound** (chosen 9 Nov 2026). Cape Town to the UK is due north, and it is what a platform sign says. Wordmark: lowercase "northbound" in Archivo, wide and heavy. "Hemisphere" remains the name of the split-screen visual style.

---

## 7. Data model (first pass)

- **Profile:** personal and financial basics, ancestry chain, optional partner
- **Scenario:** id, name, inputs (section 4.2), createdAt. Outputs are always calculated, never stored.
- **RuleEntry:** key, value, unit, currency, effectiveFrom, effectiveTo, sourceUrl, lastChecked, notes
- **CityProfile:** rent by housing type and area tier, council tax, transport, utilities, groceries, salary ranges
- **Task:** id, title, phase, leadTimeDays, dependsOn[], appliesWhen (e.g. partner on), done/doneAt per scenario

---

## 8. Phases

**MVP**
- Profile, scenario builder (including "when I've saved enough"), "your number" + runway, countdown timeline, monthly life, Manchester/London compare
- Sign in with Loot, link a Loot savings goal, and the "How far you've come" progress view
- Rules & sources page, local storage, PWA, mobile layout

**v2**
- Partner mode, long-term path and stress tests, settlement tracker
- SA money-exit section (allowances, tax residency, RA notes)
- More cities

**v3**
- AI helper ("what am I forgetting?", "explain this")
- Sync, and polish for public release if there's demand

---

## 9. Research to do before or during the build ⚠️

- [x] Grandmother's birthplace: England/Wales, so the GRO
- [ ] Where the grandmother married (decides where her marriage certificate comes from)
- [ ] Find her GRO index reference (year, quarter, district, volume/page) to get the cheaper, faster order
- [ ] Ancestry treatment in the actual Immigration Rules once laid (Dec 2026+)
- [ ] B2 English: what evidence counts and whether SA qualifications exempt you
- [ ] Citizenship timeline after settlement
- [ ] TB test cost in Cape Town and how long the result stays valid
- [ ] Faster-decision visa service prices
- [ ] Partner visa fee
- [ ] UK income tax and NI rates/bands for the relevant tax years
- [ ] Manchester and London: rents by housing type and area, council tax, transport, bills, groceries
- [ ] IT support salary ranges in Manchester and London
- [ ] SA: allowances after ceasing tax residency, retirement annuity rules, SARS steps
- [ ] FX API choice

## 10. Not in scope (for now)
- Other visa routes beyond a one-line info note
- Accounts, multiple users, sharing
- Job board integrations
- Legal or financial advice
