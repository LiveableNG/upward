export type HomeRequestState = 'Lagos' | 'FCT - Abuja'

export type HomeRequestLocation = {
  state: HomeRequestState
  area: string
  subArea?: string
}

export type HomeRequestAreaOption = {
  area: string
  subAreas: string[]
}

export const HOME_REQUEST_STATES: Array<{ value: HomeRequestState; label: string }> = [
  { value: 'Lagos', label: 'Lagos' },
  { value: 'FCT - Abuja', label: 'Abuja (FCT)' },
]

/** UI catalog — replace with API when backend is ready. */
export const HOME_REQUEST_AREAS: Record<HomeRequestState, HomeRequestAreaOption[]> = {
  Lagos: [
    { area: 'Yaba', subAreas: ['Sabo', 'Akoka', 'Ebute Metta', 'Tejuosho'] },
    { area: 'Ikeja', subAreas: ['Allen', 'GRA', 'Computer Village', 'Opebi', 'Alausa'] },
    { area: 'Lekki', subAreas: ['Phase 1', 'Ikate', 'Ajah', 'Chevron'] },
    { area: 'Victoria Island', subAreas: ['Oniru', 'Kofo Abayomi', 'Adeola Odeku'] },
    { area: 'Surulere', subAreas: ['Aguda', 'Coker', 'Bode Thomas'] },
    { area: 'Ikoyi', subAreas: ['Parkview', 'Bourdillon', 'Old Ikoyi'] },
    { area: 'Maryland', subAreas: ['Mende', 'Ojota'] },
  ],
  'FCT - Abuja': [
    { area: 'Wuse', subAreas: ['Wuse 2', 'Wuse Zone 4', 'Wuse Zone 6'] },
    { area: 'Maitama', subAreas: ['Diplomatic Zone', 'Aguiyi Ironsi'] },
    { area: 'Garki', subAreas: ['Area 3', 'Area 11', 'Area 8'] },
    { area: 'Gwarinpa', subAreas: ['1st Avenue', '3rd Avenue'] },
    { area: 'Jabi', subAreas: ['Lakeview', 'Utako'] },
  ],
}

export const HOME_REQUEST_LOCATION_COPY = {
  sectionTitle: 'Preferred locations',
  sectionHint: 'Add as many areas as you like — e.g. Yaba, Yaba - Sabo, Ikeja - Allen',
  stateLabel: 'State',
  areaLabel: 'Area',
  subAreaLabel: 'Sub-area',
  subAreaWhole: 'Whole area',
  addLocation: 'Add location',
  selectedLabel: 'Selected locations',
  duplicateError: 'This location is already added',
  areaRequired: 'Select an area first',
}
