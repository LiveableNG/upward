export type ImportMode = 'full' | 'units'

export interface ColumnDef {
  key: string
  label: string
  description?: string
  category: 'property' | 'landlord' | 'tenant' | 'unit' | 'payment'
  required?: boolean
  readOnly?: boolean
  type?: 'text' | 'number' | 'email' | 'tel' | 'date' | 'select'
  options?: string[]
}

export const FULL_COLUMNS: ColumnDef[] = [
  { key: 'propertyName', description: 'Building or estate name — we make one up if missing', label: 'Property Name', category: 'property' },
  { key: 'propertyAddress', description: 'Where the unit is', label: 'Property Address', category: 'property', required: true },
  { key: 'propertyType', description: 'Residential, commercial or industrial', label: 'Type', category: 'property', type: 'select', options: ['Residential', 'Commercial', 'Industrial'] },
  { key: 'propertyCountry', description: 'Country the property is in', label: 'Country', category: 'property' },
  { key: 'propertyState', description: 'State the property is in', label: 'State', category: 'property' },
  { key: 'propertyArea', description: 'Area or district', label: 'Area', category: 'property' },
  
  { key: 'landlordFirstName', description: 'First and last name of the landlord', label: 'Landlord First', category: 'landlord' },
  { key: 'landlordLastName', description: 'Surname of the landlord', label: 'Landlord Last', category: 'landlord' },
  { key: 'landlordEmail', description: 'Email address for the landlord', label: 'Landlord Email', category: 'landlord', type: 'email' },
  { key: 'landlordPhone', description: 'Phone number for the landlord', label: 'Landlord Phone', category: 'landlord', type: 'tel' },

  { key: 'tenantCommercialName', description: 'Company name, if the tenant is a business', label: 'Tenant Commercial Name', category: 'tenant' },
  { key: 'tenantFirstName', description: 'First and last name of the tenant', label: 'Tenant First', category: 'tenant', required: true },
  { key: 'tenantLastName', description: 'Surname of the tenant', label: 'Tenant Last', category: 'tenant' },
  { key: 'tenantEmail', description: 'Email address for the tenant', label: 'Tenant Email', category: 'tenant', type: 'email' },
  { key: 'tenantPhone', description: 'Phone number we can reach them on', label: 'Tenant Phone', category: 'tenant', type: 'tel', required: true },
  { key: 'tenantAdditionalPhone', description: 'Another number for the tenant', label: 'Additional Phone', category: 'tenant', type: 'tel' },

  { key: 'unitName', description: 'Flat or unit name — we make one up if missing', label: 'Unit Name', category: 'unit' },
  { key: 'unitRentAmount', description: 'Full rent for the period', label: 'Rent Amount', category: 'unit', required: true, type: 'number' },
  { key: 'unitRentAmountPaid', description: 'How much they have paid so far', label: 'Amount Paid', category: 'unit', required: true, type: 'number' },
  { key: 'unitRentType', description: 'Monthly, annually or a lease', label: 'Rent Type', category: 'unit', type: 'select', options: ['Monthly', 'Annually', 'Lease'] },
  { key: 'leaseYears', description: 'How many years the lease runs', label: 'Lease Years', category: 'unit', type: 'number' },
  { key: 'unitCurrency', description: 'Currency the rent is in', label: 'Currency', category: 'unit', type: 'select', options: ['NGN', 'USD', 'GBP', 'EUR'] },
  { key: 'unitRentStartDate', description: 'When this rent period began', label: 'Rent Start Date', category: 'unit', type: 'date', required: true },
  { key: 'unitRentDueDate', description: 'When this rent period ends', label: 'Rent End Date', category: 'unit', type: 'date', required: true },
  { key: 'unitManagementFee', description: 'Your management fee for this unit', label: 'Mgmt Fee', category: 'unit', type: 'number' },
  { key: 'unitNotes', description: 'Anything else worth keeping', label: 'Notes', category: 'unit' },
  { key: 'unitType', description: 'Flat, duplex, office and so on', label: 'Unit Type', category: 'unit', type: 'select', options: ['Flat / Apartment', 'Duplex', 'Shared Apartment', 'Studio', 'Bungalow', '4 Bedroom Semi-detached Duplex', 'Detached Duplex', '2 Bedroom Flat', '2 Bedroom Serviced Flat', '3 Bedroom Flat', '3 Bedroom Serviced Flat', '2 Bedroom Apartment', 'Studio / Self Contained Flat', 'Mini Flat / 1 Bedroom Flat', 'Flats', 'Terrace House', 'Town House', 'Detached House', 'Semi-detached Duplex', 'Semi-detached House', 'Shortlet Apartment', 'Office Space', 'Studio Room / Self-contain', 'Block Of Flats'] },
]

export const UNIT_COLUMNS: ColumnDef[] = [
  { key: 'unitName', description: 'Flat or unit name — we make one up if missing', label: 'Unit Name', category: 'unit' },
  { key: 'tenantCommercialName', description: 'Company name, if the tenant is a business', label: 'Tenant Commercial Name', category: 'tenant' },
  { key: 'tenantFirstName', description: 'First and last name of the tenant', label: 'Tenant First', category: 'tenant' },
  { key: 'tenantLastName', description: 'Surname of the tenant', label: 'Tenant Last', category: 'tenant' },
  { key: 'tenantEmail', description: 'Email address for the tenant', label: 'Tenant Email', category: 'tenant', type: 'email' },
  { key: 'tenantPhone', description: 'Phone number we can reach them on', label: 'Tenant Phone', category: 'tenant', type: 'tel' },
  { key: 'tenantAdditionalPhone', description: 'Another number for the tenant', label: 'Additional Phone', category: 'tenant', type: 'tel' },
  { key: 'rentAmount', label: 'Rent Amount', category: 'unit', required: true, type: 'number' },
  { key: 'rentAmountPaid', label: 'Amount Paid', category: 'unit', required: true, type: 'number' },
  { key: 'rentStartDate', label: 'Start Date', category: 'unit', type: 'date' },
  { key: 'rentType', label: 'Rent Type', category: 'unit', type: 'select', options: ['Monthly', 'Annually', 'Lease'] },
  { key: 'leaseYears', description: 'How many years the lease runs', label: 'Lease Years', category: 'unit', type: 'number' },
  { key: 'rentDueDate', label: 'Rent End Date', category: 'unit', type: 'date', readOnly: true },
  { key: 'managementFee', label: 'Mgmt Fee', category: 'unit', type: 'number' },
  { key: 'currency', label: 'Currency', category: 'unit', type: 'select', options: ['NGN', 'USD', 'GBP', 'EUR'] },
  { key: 'notes', label: 'Notes', category: 'unit' },
  { key: 'unitType', description: 'Flat, duplex, office and so on', label: 'Unit Type', category: 'unit', type: 'select', options: ['Flat / Apartment', 'Duplex', 'Shared Apartment', 'Studio', 'Bungalow', '4 Bedroom Semi-detached Duplex', 'Detached Duplex', '2 Bedroom Flat', '2 Bedroom Serviced Flat', '3 Bedroom Flat', '3 Bedroom Serviced Flat', '2 Bedroom Apartment', 'Studio / Self Contained Flat', 'Mini Flat / 1 Bedroom Flat', 'Flats', 'Terrace House', 'Town House', 'Detached House', 'Semi-detached Duplex', 'Semi-detached House', 'Shortlet Apartment', 'Office Space', 'Studio Room / Self-contain', 'Block Of Flats'] },
]


export interface ColumnMapping {
  userColumn: string;
  systemField: string | null;
  entityType: string | null;
}

export interface SplitPart {
  index: number;
  systemField: string | null;
  entityType: string | null;
}

export interface SplitConfig {
  userColumn: string;
  delimiter: string;
  parts: SplitPart[];
}
