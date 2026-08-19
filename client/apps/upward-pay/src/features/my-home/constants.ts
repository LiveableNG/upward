/**
 * Copied from GoodTenant Tenant App:
 * raiseIssueBottomSheet.tsx / raiseIssue.tsx and visitorAccessForm.tsx
 */

export const COMPLAINT_CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  {
    value: 'hvac',
    label: 'HVAC (Heating, Ventilation, and Air Conditioning)',
  },
  { value: 'general-repairs', label: 'General Repairs' },
  { value: 'lift', label: 'Lift' },
  { value: 'pest-control', label: 'Pest Control' },
  { value: 'safety-and-security', label: 'Safety and Security' },
  { value: 'noise-disturbance', label: 'Noise Disturbance' },
  { value: 'water-supply', label: 'Water Supply' },
  { value: 'electricity', label: 'Electricity/Power' },
  { value: 'gas', label: 'Gas' },
  { value: 'structural-issues', label: 'Structural Issues' },
  { value: 'apartment-conditions', label: 'Apartment Conditions' },
  { value: 'rental-agreement-issues', label: 'Rental Agreement Issues' },
  { value: 'neighbor-issues', label: 'Neighbor Issues' },
  { value: 'communication', label: 'Communication' },
  { value: 'health-and-safety', label: 'Health and Safety' },
  { value: 'environmental-concerns', label: 'Environmental Concerns' },
  { value: 'leakage-and-water-damage', label: 'Leakage and Water Damage' },
] as const

export const COMPLAINT_STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Resolved' },
  { value: 'disputed', label: 'Disputed' },
] as const

export type ComplaintStatusFilter = (typeof COMPLAINT_STATUS_FILTERS)[number]['value']

export const VISITOR_TYPE_OPTIONS = [
  { value: 'family', label: 'Family Member' },
  { value: 'friend', label: 'Friend' },
  { value: 'guest', label: 'Guest' },
  { value: 'cleaner', label: 'Cleaner/Helper' },
  { value: 'delivery', label: 'Food/Package Delivery' },
  { value: 'maintenance', label: 'Maintenance/Repair' },
  { value: 'mover', label: 'Mover' },
  { value: 'medical', label: 'Medical Professional' },
  { value: 'caregiver', label: 'Caregiver/Nurse' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'agent', label: 'Real Estate Agent' },
] as const

export const VISITOR_DURATION_OPTIONS = [
  { value: '1', label: '1 Hour' },
  { value: '2', label: '2 Hours' },
  { value: '3', label: '3 Hours' },
  { value: '6', label: '6 Hours' },
  { value: '12', label: '12 Hours' },
  { value: '24', label: '24 Hours' },
  { value: '48', label: '48 Hours' },
  { value: '72', label: '72 Hours' },
] as const

export const NUMBER_OF_VISITORS_OPTIONS = Array.from({ length: 10 }, (_, index) => {
  const count = index + 1
  return {
    value: String(count),
    label: count === 1 ? '1 Person' : `${count} People`,
  }
})

export const DEFAULT_VISITOR_FORM = {
  numberOfVisitors: '1',
  name: '',
  phone: '',
  duration: '24',
  visitorType: '',
  notes: '',
}

/** Copied from GoodTenant Tenant App FeedbackBottomSheet.tsx */
export const COMPLAINT_FEEDBACK_QUESTIONS = [
  {
    key: 'promptness',
    question: 'How promptly did the property manager respond?',
    options: ['Immediately', 'On time', 'Delayed', 'Late', 'Very late'],
  },
  {
    key: 'resolution',
    question: 'How well did the property manager resolve your complaint?',
    options: ['Excellent', 'Good', 'Satisfactory', 'Poor', 'Very Poor'],
  },
  {
    key: 'communication',
    question: 'How well did they communicate with you while solving the problem?',
    options: ['Good', 'Fair', 'Not so well', 'Bad', 'Very Bad'],
  },
] as const

export const COMPLAINT_VENDOR_FEEDBACK_QUESTIONS = [
  {
    key: 'vendorQuality',
    question: 'How would you rate the quality of work done by the vendor?',
    options: ['Excellent', 'Good', 'Satisfactory', 'Poor', 'Very Poor'],
  },
  {
    key: 'vendorCommunication',
    question: 'How well did the vendor communicate with you?',
    options: ['Excellent', 'Good', 'Fair', 'Poor', 'Very Poor'],
  },
  {
    key: 'vendorTimeliness',
    question: "How timely was the vendor's service?",
    options: ['Very timely', 'Timely', 'Somewhat delayed', 'Delayed', 'Very delayed'],
  },
] as const
