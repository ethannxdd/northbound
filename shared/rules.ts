// Every fee, threshold and lead time the app uses, with where it came from.
// Values can change over time: each entry is a list of versions with the date it takes effect.
// A scenario looks rules up on its own dates (e.g. the landing date), never "today".

export type RuleKey =
  | 'visaFee'
  | 'ihsPerYear'
  | 'visaYears'
  | 'applyWindowMonths'
  | 'decisionWeeks'
  | 'fundsStatementDays'
  | 'tbTestZar'
  | 'groCertificate'
  | 'saUnabridgedZar'
  | 'settlementYears'
  | 'settlementMinEarnings'
  | 'settlementEnglish'
  | 'ilrFee'
  | 'citizenshipFee'
  | 'personalAllowance'
  | 'basicRateLimit'
  | 'basicRate'
  | 'higherRate'
  | 'niRateMain'
  | 'niRateUpper'
  | 'depositWeeks'
  | 'partnerRelationshipYears'
  | 'sdaZar'

export interface RuleVersion {
  value: number | string
  from: string // ISO date this value takes effect
  note?: string
}

export interface RuleEntry {
  key: RuleKey
  label: string
  unit: 'GBP' | 'ZAR' | 'years' | 'months' | 'weeks' | 'days' | 'rate' | 'text'
  group: 'Visa' | 'Documents' | 'Settlement' | 'UK tax' | 'Housing' | 'Partner' | 'Money out of SA'
  source: string
  lastChecked: string
  estimate?: boolean // not confirmed from an official source yet
  versions: RuleVersion[]
}

const GOV = 'https://www.gov.uk'

export const RULES: RuleEntry[] = [
  { key: 'visaFee', label: 'UK Ancestry visa fee', unit: 'GBP', group: 'Visa', source: `${GOV}/ancestry-visa`, lastChecked: '2026-11-09', versions: [{ value: 726, from: '2025-04-09' }] },
  { key: 'ihsPerYear', label: 'Immigration Health Surcharge, per adult per year', unit: 'GBP', group: 'Visa', source: `${GOV}/healthcare-immigration-application/how-much-pay`, lastChecked: '2026-11-09', versions: [{ value: 1035, from: '2024-02-06' }] },
  { key: 'visaYears', label: 'Length of an Ancestry visa', unit: 'years', group: 'Visa', source: `${GOV}/ancestry-visa`, lastChecked: '2026-11-09', versions: [{ value: 5, from: '2000-01-01' }] },
  { key: 'applyWindowMonths', label: 'Earliest you can apply before travel', unit: 'months', group: 'Visa', source: `${GOV}/ancestry-visa`, lastChecked: '2026-11-09', versions: [{ value: 3, from: '2000-01-01' }] },
  { key: 'decisionWeeks', label: 'Usual decision time from outside the UK', unit: 'weeks', group: 'Visa', source: `${GOV}/ancestry-visa`, lastChecked: '2026-11-09', versions: [{ value: 3, from: '2000-01-01' }] },
  { key: 'fundsStatementDays', label: 'Bank statements must be dated within', unit: 'days', group: 'Visa', source: `${GOV}/ancestry-visa/documents-you-must-provide`, lastChecked: '2026-11-09', versions: [{ value: 31, from: '2000-01-01' }] },
  { key: 'tbTestZar', label: 'TB test at an approved clinic in Cape Town', unit: 'ZAR', group: 'Documents', source: `${GOV}/tb-test-visa`, lastChecked: '2026-11-09', estimate: true, versions: [{ value: 1800, from: '2000-01-01', note: 'Estimate. Check the clinic price.' }] },
  { key: 'groCertificate', label: 'Birth certificate from the GRO (England and Wales)', unit: 'GBP', group: 'Documents', source: `${GOV}/order-copy-birth-death-marriage-certificate`, lastChecked: '2026-11-09', versions: [{ value: 12.5, from: '2024-04-01' }] },
  { key: 'saUnabridgedZar', label: 'Unabridged birth certificate, Home Affairs', unit: 'ZAR', group: 'Documents', source: 'https://www.dha.gov.za', lastChecked: '2026-11-09', estimate: true, versions: [{ value: 75, from: '2000-01-01', note: 'Estimate. Check the current Home Affairs fee.' }] },
  { key: 'settlementYears', label: 'Years before you can settle (Ancestry route)', unit: 'years', group: 'Settlement', source: 'https://www.lewissilkin.com/insights/2026/11/03/home-office-sets-out-revised-earned-settlement-framework-102o7co', lastChecked: '2026-11-09', versions: [{ value: 5, from: '2000-01-01', note: 'Ancestry keeps a 5-year path under the 2027 reforms, if the conditions are met.' }] },
  { key: 'settlementMinEarnings', label: 'Minimum yearly earnings to settle', unit: 'GBP', group: 'Settlement', source: 'https://www.blakemorgan.co.uk/earned-settlement-the-government-has-responded-what-does-it-mean/', lastChecked: '2026-11-09', estimate: true, versions: [{ value: 0, from: '2000-01-01' }, { value: 12571, from: '2027-04-01', note: 'Policy announced 2 Nov 2026. Start date not confirmed.' }] },
  { key: 'settlementEnglish', label: 'English level to settle', unit: 'text', group: 'Settlement', source: 'https://www.ein.org.uk/blog/earned-settlement-government-has-announced-its-policy-law-has-not-yet-changed', lastChecked: '2026-11-09', versions: [{ value: 'B1', from: '2000-01-01' }, { value: 'B2', from: '2027-03-26' }] },
  { key: 'ilrFee', label: 'Settlement (indefinite leave to remain) fee', unit: 'GBP', group: 'Settlement', source: `${GOV}/government/publications/visa-regulations-revised-table`, lastChecked: '2026-11-09', estimate: true, versions: [{ value: 3029, from: '2025-04-09' }] },
  { key: 'citizenshipFee', label: 'British citizenship fee, with ceremony', unit: 'GBP', group: 'Settlement', source: `${GOV}/apply-citizenship-indefinite-leave-to-remain`, lastChecked: '2026-11-09', estimate: true, versions: [{ value: 1735, from: '2025-04-09' }] },
  { key: 'personalAllowance', label: 'Income tax personal allowance', unit: 'GBP', group: 'UK tax', source: `${GOV}/income-tax-rates`, lastChecked: '2026-11-09', versions: [{ value: 12570, from: '2021-04-06' }] },
  { key: 'basicRateLimit', label: 'Top of the basic rate band', unit: 'GBP', group: 'UK tax', source: `${GOV}/income-tax-rates`, lastChecked: '2026-11-09', versions: [{ value: 50270, from: '2021-04-06' }] },
  { key: 'basicRate', label: 'Basic rate of income tax', unit: 'rate', group: 'UK tax', source: `${GOV}/income-tax-rates`, lastChecked: '2026-11-09', versions: [{ value: 0.2, from: '2008-04-06' }] },
  { key: 'higherRate', label: 'Higher rate of income tax', unit: 'rate', group: 'UK tax', source: `${GOV}/income-tax-rates`, lastChecked: '2026-11-09', versions: [{ value: 0.4, from: '2010-04-06' }] },
  { key: 'niRateMain', label: 'Employee National Insurance, main rate', unit: 'rate', group: 'UK tax', source: `${GOV}/national-insurance-rates-letters`, lastChecked: '2026-11-09', versions: [{ value: 0.08, from: '2024-04-06' }] },
  { key: 'niRateUpper', label: 'Employee National Insurance above the upper limit', unit: 'rate', group: 'UK tax', source: `${GOV}/national-insurance-rates-letters`, lastChecked: '2026-11-09', versions: [{ value: 0.02, from: '2024-04-06' }] },
  { key: 'depositWeeks', label: 'Most a landlord can take as a deposit', unit: 'weeks', group: 'Housing', source: `${GOV}/deposit-protection-schemes-and-landlords`, lastChecked: '2026-11-09', versions: [{ value: 5, from: '2019-06-01' }] },
  { key: 'partnerRelationshipYears', label: 'Unmarried partner: years together before applying', unit: 'years', group: 'Partner', source: `${GOV}/ancestry-visa/your-partner-and-children`, lastChecked: '2026-11-09', versions: [{ value: 2, from: '2000-01-01' }] },
  { key: 'sdaZar', label: 'Single discretionary allowance (money out of SA)', unit: 'ZAR', group: 'Money out of SA', source: 'https://www.sableinternational.com/blog/sda-limit-doubles-to-r2-million-a-year', lastChecked: '2026-11-09', versions: [{ value: 2000000, from: '2026-04-08' }] },
]

export type RuleOverrides = Partial<Record<RuleKey, number | string>>

/** The value of a rule on a given date. Overrides (edited on the Rules page) win. */
export function rule(key: RuleKey, onDate: string, overrides?: RuleOverrides): number {
  const o = overrides?.[key]
  if (o !== undefined) return Number(o)
  return Number(ruleRaw(key, onDate))
}

export function ruleText(key: RuleKey, onDate: string, overrides?: RuleOverrides): string {
  const o = overrides?.[key]
  if (o !== undefined) return String(o)
  return String(ruleRaw(key, onDate))
}

function ruleRaw(key: RuleKey, onDate: string): number | string {
  const entry = RULES.find((r) => r.key === key)
  if (!entry) throw new Error(`Unknown rule ${key}`)
  const live = entry.versions.filter((v) => v.from <= onDate).sort((a, b) => (a.from < b.from ? 1 : -1))
  return (live[0] ?? entry.versions[0]).value
}
