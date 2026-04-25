export interface PropertyManagerProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  businessName?: string;
  phone?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: PropertyManagerProfile;
}
