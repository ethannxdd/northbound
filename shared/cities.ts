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
  photo: string
  photoCredit: string
  /** Where the rents come from, and when they were last checked (ISO date) */
  rentSource: string
  rentChecked: string
}

export const CITIES: Record<CityId, CityProfile> = {
  manchester: {
    id: 'manchester',
    name: 'Manchester',
    // 1-bed: ONS Price Index of Private Rents, Manchester, Sep 2026 (£1,007). Room and studio: SpareRoom and Rightmove listings, Nov 2026.
    rent: { room: 750, studio: 900, onebed: 1010 },
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
    photo: 'https://images.unsplash.com/photo-1611490916757-4402482e161b',
    photoCredit: 'Mylo Kaye on Unsplash',
    rentSource: 'https://www.ons.gov.uk/visualisations/housingpriceslocal/E08000003/',
    rentChecked: '2026-11-23',
  },
  london: {
    id: 'london',
    name: 'London',
    // 1-bed: ONS, London, autumn 2026 (about £1,760). Room: SpareRoom Rental Index, Q2 2026 (£915 to £978). Studio: listings, Nov 2026.
    rent: { room: 950, studio: 1450, onebed: 1760 },
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
    photo: 'https://images.unsplash.com/photo-1632897271846-b6e3ca78aded',
    photoCredit: 'Jacob Smith on Unsplash',
    rentSource: 'https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/privaterentandhousepricesuk/latest',
    rentChecked: '2026-11-23',
  },
}

export const CAPE_TOWN = {
  name: 'Cape Town',
  photo: 'https://images.unsplash.com/photo-1626894169601-482d26b23f35',
  photoCredit: 'Peter Burdon on Unsplash',
  daylight: [14.2, 13.2, 12.1, 11.0, 10.2, 9.8, 10.0, 10.8, 11.8, 12.9, 13.9, 14.4],
  coffeeZar: 38,
}

export const HOUSING_LABEL: Record<Housing, string> = { room: 'Room in a share', studio: 'Studio', onebed: '1-bed flat' }

/** Unsplash photo at a given width. */
/** A city photo at a given width: Unsplash photos are resized, other links used as they are, none gives null. */
export function cityPhoto(c: { photo?: string }, width: number): string | null {
  if (!c.photo) return null
  return /images\.unsplash\.com\/photo-[^?]+$/.test(c.photo) ? photoUrl(c.photo, width) : c.photo
}

export function photoUrl(base: string, width: number): string {
  return `${base}?auto=format&fit=crop&w=${width}&q=72`
}

export interface Area {
  id: string
  name: string
  /** Typical rent for a room in a share, per month. Studios and flats scale by the same factor. */
  room: number
  commute: string
  vibe: string
}

/** Neighbourhoods with rough rents. Planning estimates, not quotes. */
export const AREAS: Record<CityId, Area[]> = {
  manchester: [
    { id: 'city-centre', name: 'City Centre', room: 840, commute: 'Walk to most offices', vibe: 'Flats, bars, everything close' },
    { id: 'ancoats', name: 'Ancoats and Northern Quarter', room: 810, commute: '10 min walk to the centre', vibe: 'Converted mills, cafes, young crowd' },
    { id: 'salford-quays', name: 'Salford Quays', room: 760, commute: '15 min on the tram', vibe: 'Waterside flats, MediaCity' },
    { id: 'chorlton', name: 'Chorlton', room: 710, commute: '20 min on the tram', vibe: 'Leafy, independent shops' },
    { id: 'didsbury', name: 'Didsbury', room: 750, commute: '25 min on the tram', vibe: 'Quiet, green, popular with professionals' },
    { id: 'levenshulme', name: 'Levenshulme', room: 620, commute: '20 min by train or bus', vibe: 'Good value, friendly' },
  ],
  london: [
    { id: 'islington', name: 'Islington', room: 1070, commute: '15 min to the City', vibe: 'Central, busy, pricey' },
    { id: 'hackney', name: 'Hackney', room: 950, commute: '20 min on the Overground', vibe: 'Creative, markets, nightlife' },
    { id: 'brixton', name: 'Brixton', room: 910, commute: '20 min on the Victoria line', vibe: 'Lively, music, food' },
    { id: 'stratford', name: 'Stratford', room: 870, commute: '15 min on the Elizabeth line', vibe: 'New builds, Olympic Park' },
    { id: 'walthamstow', name: 'Walthamstow', room: 830, commute: '25 min on the Victoria line', vibe: 'Village feel, wetlands' },
    { id: 'croydon', name: 'Croydon', room: 740, commute: '20 min by train', vibe: 'Best value, big town centre' },
  ],
}

/** Rent for the chosen housing, adjusted for the neighbourhood if one is picked. */
export function rentFor(city: CityId, housing: Housing, area?: string): number {
  const c = CITIES[city]
  const a = AREAS[city].find((x) => x.id === area)
  if (!a) return c.rent[housing]
  return Math.round((c.rent[housing] * a.room) / c.rent.room / 10) * 10
}
