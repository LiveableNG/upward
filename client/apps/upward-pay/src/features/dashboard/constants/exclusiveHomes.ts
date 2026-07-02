export type ExclusiveHomeCity = 'Lagos' | 'Abuja'

export type ExclusiveHomeCityFilter = 'all' | ExclusiveHomeCity

export type ExclusiveHomeBedFilter = 'any' | '1' | '2' | '3'

export type ExclusiveHome = {
  id: string
  name: string
  area: string
  city: ExclusiveHomeCity
  annualRent: number
  beds: number
  baths: number
  sqm: number
  tag: string
  amenities: string[]
  benefits: string[]
}

export const EXCLUSIVE_HOME_AMENITIES = [
  'Ensuite',
  '24/7 Power',
  'Parking',
  'Gated',
  'Water',
] as const

export const EXCLUSIVE_HOME_BENEFITS = [
  'Identity-verified landlord',
  '0% agent fee for Upward members',
  'Rent here is reported to your score',
  'Priority viewing for verified tenants',
] as const

/** Curated listings — replace with API when backend is ready. */
export const EXCLUSIVE_HOMES: ExclusiveHome[] = [
  {
    id: 'lekki-2bed',
    name: '2-Bedroom Apartment',
    area: 'Lekki Phase 1, Lagos',
    city: 'Lagos',
    annualRent: 2_400_000,
    beds: 2,
    baths: 2,
    sqm: 95,
    tag: '0% agent fee',
    amenities: [...EXCLUSIVE_HOME_AMENITIES],
    benefits: [...EXCLUSIVE_HOME_BENEFITS],
  },
  {
    id: 'maitama-studio',
    name: 'Modern Studio',
    area: 'Maitama, Abuja',
    city: 'Abuja',
    annualRent: 1_500_000,
    beds: 1,
    baths: 1,
    sqm: 48,
    tag: 'Move-in ready',
    amenities: [...EXCLUSIVE_HOME_AMENITIES],
    benefits: [...EXCLUSIVE_HOME_BENEFITS],
  },
  {
    id: 'yaba-terrace',
    name: '3-Bedroom Terrace',
    area: 'Yaba, Lagos',
    city: 'Lagos',
    annualRent: 3_200_000,
    beds: 3,
    baths: 3,
    sqm: 140,
    tag: 'Verified landlord',
    amenities: [...EXCLUSIVE_HOME_AMENITIES],
    benefits: [...EXCLUSIVE_HOME_BENEFITS],
  },
  {
    id: 'wuse-1bed',
    name: '1-Bedroom Flat',
    area: 'Wuse 2, Abuja',
    city: 'Abuja',
    annualRent: 1_800_000,
    beds: 1,
    baths: 1,
    sqm: 62,
    tag: 'Rent builds your score',
    amenities: [...EXCLUSIVE_HOME_AMENITIES],
    benefits: [...EXCLUSIVE_HOME_BENEFITS],
  },
]

export const EXCLUSIVE_HOMES_PAGE_COPY = {
  title: 'Exclusive Homes',
  subtitle: 'Verified rentals, only on Upward',
  bannerText:
    'Verified landlords · 0% agent fees · your rent here counts toward your Upward Score.',
  promoTitle: 'Exclusive Homes',
  promoSubtitle: 'Verified rentals only on Upward · 0% agent fees',
  emptyTitle: 'No homes match your filters',
  emptyText: 'Try a different city or size.',
}
