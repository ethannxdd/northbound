// What life costs in each city. All monthly figures in pounds.
// These are planning estimates, not quotes: shown as editable on the Rules page.

export type CityId = 'manchester' | 'london'
export type Housing = 'room' | 'studio' | 'onebed'

export interface CityProfile {
  id: CityId
  name: string
  rent: Record<Housing, number>
  /** Energy, water, broadband and council tax. In a share these are usually split or included. */
  bills: Record<Housing, number>
  transport: number
  food: number
  phone: number
  other: number
  /** Typical IT support salary, per year */
  itSupportSalary: number
  tempNightly: number
  /** Hours of daylight per month, Jan to Dec */
  daylight: number[]
  wetDays: number
  transportNote: string
  coffee: number
}

export const CITIES: Record<CityId, CityProfile> = {
  manchester: {
    id: 'manchester',
    name: 'Manchester',
    rent: { room: 850, studio: 1050, onebed: 1150 },
    bills: { room: 120, studio: 260, onebed: 300 },
    transport: 80,
    food: 250,
    phone: 15,
    other: 248,
    itSupportSalary: 28000,
    tempNightly: 45,
    daylight: [7.9, 9.6, 11.7, 13.9, 15.8, 16.9, 16.4, 14.6, 12.5, 10.4, 8.5, 7.5],
    wetDays: 150,
    transportNote: '£2 bus fare cap',
    coffee: 3.4,
  },
  london: {
    id: 'london',
    name: 'London',
    rent: { room: 1150, studio: 1500, onebed: 1800 },
    bills: { room: 140, studio: 300, onebed: 340 },
    transport: 170,
    food: 280,
    phone: 15,
    other: 280,
    itSupportSalary: 33000,
    tempNightly: 70,
    daylight: [8.3, 9.9, 11.8, 13.8, 15.6, 16.5, 16.1, 14.5, 12.5, 10.5, 8.8, 7.9],
    wetDays: 110,
    transportNote: 'Daily caps on the Tube and buses',
    coffee: 3.9,
  },
}

export const CAPE_TOWN = {
  name: 'Cape Town',
  daylight: [14.2, 13.2, 12.1, 11.0, 10.2, 9.8, 10.0, 10.8, 11.8, 12.9, 13.9, 14.4],
  coffeeZar: 38,
}

export const HOUSING_LABEL: Record<Housing, string> = { room: 'Room in a share', studio: 'Studio', onebed: '1-bed flat' }
