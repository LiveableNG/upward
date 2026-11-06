export const PASSWORD_REQUIREMENTS = [
  { label: 'Min. 8 characters', regex: /.{8,}/ },
  { label: 'One uppercase letter', regex: /[A-Z]/ },
  { label: 'One number or symbol', regex: /[0-9!@#$%^&*(),.?":{}|<>]/ },
] as const

export function isPasswordStrong(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((req) => req.regex.test(password))
}

export function countPasswordRequirementsMet(password: string): number {
  return PASSWORD_REQUIREMENTS.filter((req) => req.regex.test(password)).length
}
