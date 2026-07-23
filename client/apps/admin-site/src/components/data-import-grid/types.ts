export type ImportMode = 'full' | 'units'

export interface ColumnDef {
  key: string
  label: string
  category: 'property' | 'landlord' | 'tenant' | 'unit' | 'payment'
  required?: boolean
  readOnly?: boolean
  type?: 'text' | 'number' | 'email' | 'tel' | 'date' | 'select'
  options?: string[]
}

export const FULL_COLUMNS: ColumnDef[] = [
  { key: 'propertyName', label: 'Property Name', category: 'property', required: true },
  { key: 'propertyAddress', label: 'Address', category: 'property', required: true },
  { key: 'propertyType', label: 'Type', category: 'property', type: 'select', options: ['Residential', 'Commercial', 'Industrial'] },
  { key: 'propertyCountry', label: 'Country', category: 'property' },
  { key: 'propertyState', label: 'State', category: 'property' },
  { key: 'propertyArea', label: 'Area', category: 'property' },
  
  { key: 'landlordFirstName', label: 'Landlord First', category: 'landlord' },
  { key: 'landlordLastName', label: 'Landlord Last', category: 'landlord' },
  { key: 'landlordEmail', label: 'Landlord Email', category: 'landlord', type: 'email' },
  { key: 'landlordPhone', label: 'Landlord Phone', category: 'landlord', type: 'tel' },

  { key: 'tenantCommercialName', label: 'Tenant Commercial Name', category: 'tenant' },
  { key: 'tenantFirstName', label: 'Tenant First', category: 'tenant' },
  { key: 'tenantLastName', label: 'Tenant Last', category: 'tenant' },
  { key: 'tenantEmail', label: 'Tenant Email', category: 'tenant', type: 'email' },
  { key: 'tenantPhone', label: 'Tenant Phone', category: 'tenant', type: 'tel' },

  { key: 'unitName', label: 'Unit Name', category: 'unit', required: true },
  { key: 'unitRentAmount', label: 'Rent Amount', category: 'unit', required: true, type: 'number' },
  { key: 'unitRentAmountPaid', label: 'Amount Paid', category: 'unit', type: 'number' },
  { key: 'unitRentType', label: 'Rent Type', category: 'unit', type: 'select', options: ['Monthly', 'Annually', 'Lease'] },
  { key: 'leaseYears', label: 'Lease Years', category: 'unit', type: 'number' },
  { key: 'unitCurrency', label: 'Currency', category: 'unit', type: 'select', options: ['NGN', 'USD', 'GBP', 'EUR'] },
  { key: 'unitRentStartDate', label: 'Start Date', category: 'unit', type: 'date' },
  { key: 'unitRentDueDate', label: 'Rent End Date', category: 'unit', type: 'date', readOnly: true },
  { key: 'unitManagementFee', label: 'Mgmt Fee', category: 'unit', type: 'number' },
  { key: 'unitNotes', label: 'Notes', category: 'unit' },
  { key: 'unitType', label: 'Unit Type', category: 'unit', type: 'select', options: ['Flat / Apartment', 'Duplex', 'Shared Apartment', 'Studio', 'Bungalow', '4 Bedroom Semi-detached Duplex', 'Detached Duplex', '2 Bedroom Flat', '2 Bedroom Serviced Flat', '3 Bedroom Flat', '3 Bedroom Serviced Flat', '2 Bedroom Apartment', 'Studio / Self Contained Flat', 'Mini Flat / 1 Bedroom Flat', 'Flats', 'Terrace House', 'Town House', 'Detached House', 'Semi-detached Duplex', 'Semi-detached House', 'Shortlet Apartment', 'Office Space', 'Studio Room / Self-contain', 'Block Of Flats'] },
]

export const UNIT_COLUMNS: ColumnDef[] = [
  { key: 'unitName', label: 'Unit Name', category: 'unit', required: true },
  { key: 'tenantCommercialName', label: 'Tenant Commercial Name', category: 'tenant' },
  { key: 'tenantFirstName', label: 'Tenant First', category: 'tenant' },
  { key: 'tenantLastName', label: 'Tenant Last', category: 'tenant' },
  { key: 'tenantEmail', label: 'Tenant Email', category: 'tenant', type: 'email' },
  { key: 'tenantPhone', label: 'Tenant Phone', category: 'tenant', type: 'tel' },
  { key: 'rentAmount', label: 'Rent Amount', category: 'unit', required: true, type: 'number' },
  { key: 'rentAmountPaid', label: 'Amount Paid', category: 'unit', type: 'number' },
  { key: 'rentStartDate', label: 'Start Date', category: 'unit', type: 'date' },
  { key: 'rentType', label: 'Rent Type', category: 'unit', type: 'select', options: ['Monthly', 'Annually', 'Lease'] },
  { key: 'leaseYears', label: 'Lease Years', category: 'unit', type: 'number' },
  { key: 'rentDueDate', label: 'Rent End Date', category: 'unit', type: 'date', readOnly: true },
  { key: 'managementFee', label: 'Mgmt Fee', category: 'unit', type: 'number' },
  { key: 'currency', label: 'Currency', category: 'unit', type: 'select', options: ['NGN', 'USD', 'GBP', 'EUR'] },
  { key: 'notes', label: 'Notes', category: 'unit' },
  { key: 'unitType', label: 'Unit Type', category: 'unit', type: 'select', options: ['Flat / Apartment', 'Duplex', 'Shared Apartment', 'Studio', 'Bungalow', '4 Bedroom Semi-detached Duplex', 'Detached Duplex', '2 Bedroom Flat', '2 Bedroom Serviced Flat', '3 Bedroom Flat', '3 Bedroom Serviced Flat', '2 Bedroom Apartment', 'Studio / Self Contained Flat', 'Mini Flat / 1 Bedroom Flat', 'Flats', 'Terrace House', 'Town House', 'Detached House', 'Semi-detached Duplex', 'Semi-detached House', 'Shortlet Apartment', 'Office Space', 'Studio Room / Self-contain', 'Block Of Flats'] },
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
