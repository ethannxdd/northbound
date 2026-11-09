import { CITIES } from './cities'
import { addDays, addMonths } from './dates'
import { runwayMonths, upfrontCosts } from './engine'
import { rule, type RuleOverrides } from './rules'
import type { ScenarioInput } from './types'

export type Line = 'paper' | 'money' | 'move' | 'trunk'

export interface Task {
  key: string
  title: string
  line: Line
  due: string
  /** A milestone gets a bigger station on the map */
  milestone?: boolean
  cost?: string
  takes?: string
  from?: string
  url?: string
  steps: string[]
}

/**
 * Every step of the move, worked backwards from the landing date.
 * Paperwork, money and move run as three lines that join at the visa decision.
 */
export function buildTimeline(s: ScenarioInput, landDate: string, today: string, ov?: RuleOverrides): Task[] {
  const city = CITIES[s.city].name
  const window = rule('applyWindowMonths', landDate, ov)
  const applyDate = addMonths(landDate, -window)
  const decision = addDays(applyDate, rule('decisionWeeks', landDate, ov) * 7)
  const notBefore = (d: string) => (d < today ? today : d)
  const costs = upfrontCosts(s, landDate, ov)
  const ihs = rule('ihsPerYear', landDate, ov) * rule('visaYears', landDate, ov)

  const tasks: Task[] = [
    {
      key: 'sa-certs',
      title: "Order your and your dad's unabridged birth certificates",
      line: 'paper',
      due: today, // cheap and slow: order now, whatever the landing date
      cost: `R${rule('saUnabridgedZar', landDate, ov) * 2}`,
      takes: `${s.certLeadMonths} months, sometimes longer`,
      from: 'Home Affairs',
      url: 'https://www.dha.gov.za',
      steps: [
        'Apply at a Home Affairs office for an unabridged birth certificate for yourself.',
        "Apply for your dad's too. He may need to apply himself or give you a signed consent letter.",
        'Ask for the full (unabridged) version. The short one is not accepted for the visa.',
        'Keep the receipt and check progress every few weeks.',
      ],
    },
    {
      key: 'gro-cert',
      title: "Gran's birth certificate from the GRO",
      line: 'paper',
      due: today, // cheap and slow: order now, whatever the landing date
      cost: `£${rule('groCertificate', landDate, ov).toFixed(2)}`,
      takes: '4 days',
      from: 'GRO',
      url: 'https://www.gro.gov.uk/gro/content/certificates/',
      steps: [
        'Find her index reference on FreeBMD: year, quarter, district, volume and page.',
        'Order a birth certificate on the GRO website using that reference.',
        'Keep the original safe for your visa application.',
      ],
    },
    {
      key: 'gran-marriage',
      title: "Gran's marriage certificate, if her surname changed",
      line: 'paper',
      due: today, // cheap and slow: order now, whatever the landing date
      cost: '£12.50 if from the GRO',
      from: 'GRO or Home Affairs',
      steps: [
        'Check whether her name on her birth certificate matches the name on your dad\'s birth certificate.',
        'If not, order her marriage certificate: from the GRO if she married in England or Wales, from Home Affairs if she married in South Africa.',
      ],
    },
    {
      key: 'passport',
      title: 'Check your passport has at least 6 months left after landing',
      line: 'paper',
      due: notBefore(addMonths(applyDate, -3)),
      from: 'Home Affairs',
      steps: ['Check the expiry date.', 'Renew it now if it runs out within 6 months of your landing date. Renewals can take months.'],
    },
    {
      key: 'saving',
      title: 'Save every month into your move goal',
      line: 'money',
      due: today,
      steps: ['Set up a monthly transfer into your Loot goal on payday.', 'Northbound updates your progress each time money goes in.'],
    },
    {
      key: 'tb-test',
      title: 'TB test at an approved clinic',
      line: 'paper',
      due: notBefore(addMonths(applyDate, -1)),
      cost: `R${rule('tbTestZar', landDate, ov).toLocaleString('en-ZA')} (estimate)`,
      takes: 'Results in about a week. Valid for 6 months.',
      from: 'Home Office approved clinic',
      url: 'https://www.gov.uk/government/publications/tuberculosis-test-for-a-uk-visa-clinics-in-south-africa',
      steps: ['Book at a clinic on the Home Office list for South Africa.', 'Take your passport.', 'Keep the certificate for your application.'],
    },
    {
      key: 'proof-funds',
      title: 'Money in your account for proof of funds',
      line: 'money',
      due: notBefore(addDays(applyDate, -14)),
      takes: `Statements dated within ${rule('fundsStatementDays', landDate, ov)} days of applying`,
      steps: [
        'Make sure your full number is in your own account.',
        'Download bank statements dated within 31 days of the day you apply.',
      ],
    },
    {
      key: 'job-search',
      title: 'Start applying for jobs in the UK',
      line: 'move',
      due: notBefore(addMonths(landDate, -4)),
      steps: ['Rewrite your CV in UK format: two pages, no photo, no ID number.', `Set your LinkedIn location to ${city}.`, 'Mention you have the right to work on an Ancestry visa, no sponsorship needed.'],
    },
    {
      key: 'apply-visa',
      title: 'Apply for your Ancestry visa',
      line: 'paper',
      due: notBefore(applyDate),
      cost: `£${rule('visaFee', landDate, ov)} plus £${ihs.toLocaleString('en-GB')} health surcharge`,
      takes: `About ${rule('decisionWeeks', landDate, ov)} weeks`,
      from: 'GOV.UK',
      url: 'https://www.gov.uk/ancestry-visa/apply',
      steps: ['Apply online, no earlier than 3 months before you travel.', 'Pay the visa fee and health surcharge.', 'Book and attend your biometrics appointment at VFS in Cape Town.'],
    },
    {
      key: 'visa-decision',
      title: 'Visa decision',
      line: 'trunk',
      milestone: true,
      due: notBefore(decision),
      steps: ['Your eVisa is linked to your passport. Create your UKVI account when you get the decision email.'],
    },
    {
      key: 'book-travel',
      title: 'Book your flight and first nights',
      line: 'trunk',
      due: notBefore(addDays(decision, 3)),
      cost: `£${Math.round(costs.groups.find((g) => g.id === 'move')!.items[0].gbp + costs.groups.find((g) => g.id === 'move')!.items[1].gbp).toLocaleString('en-GB')}`,
      steps: [`Book a one-way flight to ${city}.`, `Book ${s.tempNights} nights somewhere close to the centre while you find a room.`],
    },
    {
      key: 'sa-admin',
      title: 'Wrap up in South Africa',
      line: 'trunk',
      due: notBefore(addMonths(landDate, -1)),
      steps: ['Give notice on your lease and contracts.', 'Tell your bank you are moving.', 'Speak to a tax adviser about ending SA tax residency and your retirement annuity.'],
    },
    {
      key: 'land',
      title: `Land in ${city}`,
      line: 'trunk',
      milestone: true,
      due: landDate,
      steps: ['Carry your passport, certificates and first address.', 'Your eVisa is your permission to enter.'],
    },
    {
      key: 'settle-in',
      title: 'NI number, bank account and GP',
      line: 'trunk',
      due: addDays(landDate, 14),
      steps: ['Apply for your National Insurance number online.', 'Open a UK bank account. Some online banks only need your passport and eVisa.', 'Register with a GP near where you live.'],
    },
    {
      key: 'find-room',
      title: 'Move into your room',
      line: 'trunk',
      due: addDays(landDate, s.tempNights),
      steps: ['View rooms in person before paying.', 'Check your deposit is protected in a government scheme.'],
    },
    {
      key: 'first-payday',
      title: 'First payday',
      line: 'trunk',
      milestone: false,
      due: addMonths(landDate, runwayMonths(s)),
      steps: ['From here your savings start growing again.'],
    },
    {
      key: 'settle',
      title: 'Settle in the UK',
      line: 'trunk',
      milestone: true,
      due: addMonths(landDate, rule('settlementYears', landDate, ov) * 12),
      cost: `£${rule('ilrFee', landDate, ov).toLocaleString('en-GB')} (estimate)`,
      steps: [
        'Apply for indefinite leave to remain after 5 years on the Ancestry visa.',
        `From 2027 you'll need B2 English, a clean record, no unpaid government debt, and earnings above £${rule('settlementMinEarnings', addMonths(landDate, 60), ov).toLocaleString('en-GB')} a year.`,
      ],
    },
  ]
  return tasks.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0))
}
