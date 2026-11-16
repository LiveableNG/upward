export type EmploymentType =
  | 'corporate_salaried'
  | 'self_employed'
  | 'business_owner'
  | 'contract'
  | 'informal'
  | 'unemployed'

export type RsiEnrolmentStatus = 'active' | 'submitted' | 'pending_activation'

export type RsiEnrolmentFormData = {
  propertyUuid: string
  fullName: string
  dateOfBirth: string
  gender: string
  phone: string
  address: string
  occupation: string
  employmentType: EmploymentType | ''
  rentStartDate: string
  annualRent: string
  landlordName: string
  propertyAddress: string
}

export type RsiEnrolmentRecord = {
  submittedAt: string
  termsVersion: string
  status: RsiEnrolmentStatus
  premiumPaid?: number
  paymentReference?: string
  form: RsiEnrolmentFormData
}

export type RsiFlowStep = 'property' | 'details' | 'consent' | 'form' | 'success'
