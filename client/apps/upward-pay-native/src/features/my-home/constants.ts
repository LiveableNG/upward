export const COMPLAINT_CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'general-repairs', label: 'General repairs' },
  { value: 'pest-control', label: 'Pest control' },
  { value: 'safety-and-security', label: 'Safety & security' },
  { value: 'water-supply', label: 'Water supply' },
  { value: 'electricity', label: 'Electricity / power' },
  { value: 'structural-issues', label: 'Structural issues' },
  { value: 'noise-disturbance', label: 'Noise disturbance' },
] as const

export const VISITOR_TYPE_OPTIONS = [
  { value: 'guest', label: 'Guest' },
  { value: 'family', label: 'Family' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'maintenance', label: 'Maintenance' },
] as const

export const COMPLAINT_STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Resolved' },
  { value: 'disputed', label: 'Disputed' },
] as const

export type ComplaintStatusFilter = (typeof COMPLAINT_STATUS_FILTERS)[number]['value']

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

export const VISITOR_DURATION_OPTIONS = [
  { value: '2', label: '2 hours' },
  { value: '6', label: '6 hours' },
  { value: '24', label: '24 hours' },
  { value: '48', label: '48 hours' },
] as const
