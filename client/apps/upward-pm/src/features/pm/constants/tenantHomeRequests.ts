export type TenantHomeRequestStatus = 'submitted' | 'contacted' | 'assigned' | 'closed'

export const TENANT_HOME_REQUEST_STATUS_LABELS: Record<TenantHomeRequestStatus, string> = {
  submitted: 'New',
  contacted: 'Contacted',
  assigned: 'Assigned',
  closed: 'Closed',
}

export const TENANT_HOME_REQUEST_PAGE_COPY = {
  listTitle: 'Home Requests',
  listSubtitle:
    'Prospects looking for apartments — reveal contact when you’re ready to reach out on WhatsApp or email.',
  searchPlaceholder: 'Search area, budget, beds, or notes…',
  filterAllStatuses: 'All',
  filteredEmptyTitle: 'No matching requests',
  filteredEmptyText: 'Try a different search term or status.',
  emptyTitle: 'No home requests yet',
  emptyText: 'When someone submits a home brief on the website, it will appear here.',
  detailTitle: 'Home request',
  prospectSection: 'Prospect',
  briefSection: 'Search brief',
  actionsSection: 'Contact',
  revealCta: 'Reveal contact',
  revealHint: 'Revealing logs that you intend to contact this prospect.',
  contactHidden: 'Contact is hidden until you reveal it.',
  contactRevealed: 'Contact revealed — reach out on WhatsApp or email.',
  revealCountLabel: 'PMs who revealed contact',
  bedsLabel: 'Bedrooms',
  budgetLabel: 'Budget',
  moveInLabel: 'Move-in',
  locationsLabel: 'Preferred locations',
  propertyTypesLabel: 'Property type',
  amenitiesLabel: 'Amenities',
  notesLabel: 'Notes',
  submittedLabel: 'Submitted',
  whatsappLabel: 'WhatsApp',
  emailLabel: 'Email',
}

export const TENANT_HOME_REQUEST_STATUS_OPTIONS = [
  { label: TENANT_HOME_REQUEST_PAGE_COPY.filterAllStatuses, value: 'all' },
  ...Object.entries(TENANT_HOME_REQUEST_STATUS_LABELS).map(([value, label]) => ({
    label,
    value,
  })),
] as const
