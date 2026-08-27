export interface PropertyManagerProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  businessName?: string;
  pmType?: string;
  phone?: string;
  profilePic?: string;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  letterheadHeaderUrl?: string;
  letterheadFooterUrl?: string;
  isVerified?: boolean;
  verificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED';
  country?: string;
  companyAddress?: string;
  cacNumber?: string;
  isBlocked?: boolean;
  isManuallyBlocked?: boolean;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
  /** False for employee-only team collaborators — company settings tabs are hidden. */
  canManageCompanySettings?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: PropertyManagerProfile;
}
