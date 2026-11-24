import type { CityId, Housing } from './cities'
import type { DestinationPack } from './pack'

export type LandMode = 'date' | 'saved'

/** Everything a user can change about one version of the move. */
export interface ScenarioInput {
  name: string
  landMode: LandMode
  /** Used when landMode is 'date' */
  landDate: string
  city: CityId
  housing: Housing
  partner: boolean
  partnerMarried: boolean
  /** When the relationship started, for the 2-year rule */
  partnerSince: string | null
  partnerWorks: boolean
  partnerSalary: number
  /** Months from landing until you start work */
  jobHuntMonths: number
  /** Expected UK salary. 0 means use the city's typical IT support salary. */
  ukSalary: number
  /** Rand per pound */
  rate: number
  /** How long the SA unabridged certificates are expected to take */
  certLeadMonths: number
  tempNights: number
  flightGbp: number
  bufferGbp: number
  /** 'live' follows today's rand/pound rate; 'fixed' or missing uses `rate` */
  rateMode?: 'live' | 'fixed'
  /** Neighbourhood id within the city; missing means the city average */
  area?: string
  /** An imported plan's destination (its Convex id). Missing means the built-in UK Ancestry route. */
  destinationId?: string
  /** City id within that plan. `city` is then unused. */
  destCity?: string
  /** The plan itself, attached at runtime by the app. Never saved on the scenario. */
  pack?: DestinationPack
}

/** Where your savings are now and how fast they grow, in rand. */
export interface SavingsState {
  savedZar: number
  monthlyZar: number
}

export const DEFAULT_SCENARIO: ScenarioInput = {
  name: 'Manchester, solo',
  landMode: 'saved',
  landDate: '2029-03-01',
  city: 'manchester',
  housing: 'room',
  partner: false,
  partnerMarried: false,
  partnerSince: null,
  partnerWorks: true,
  partnerSalary: 26000,
  jobHuntMonths: 3,
  ukSalary: 0,
  rate: 23.1,
  certLeadMonths: 6,
  tempNights: 10,
  flightGbp: 520,
  bufferGbp: 0,
  rateMode: 'live',
}
