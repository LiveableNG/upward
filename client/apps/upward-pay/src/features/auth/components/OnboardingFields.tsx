import React from 'react'
import { User, Mail } from 'lucide-react'

interface OnboardingFieldsProps {
  formData: {
    firstName: string
    lastName: string
    email: string
  }
  setFormData: (data: any) => void
  disabled?: boolean
}

export function OnboardingFields({ formData, setFormData, disabled = false }: OnboardingFieldsProps) {
  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="onboarding-fields">
      <div className="auth-form__row">
        <div className="auth-form__field">
          <label>First Name</label>
          <div className="input-with-icon">
            <User size={17} />
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              required
              disabled={disabled}
              placeholder="First name"
            />
          </div>
        </div>
        <div className="auth-form__field">
          <label>Last Name</label>
          <div className="input-with-icon">
            <User size={17} />
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              required
              disabled={disabled}
              placeholder="Last name"
            />
          </div>
        </div>
      </div>

      <div className="auth-form__field auth-u-mt-4">
        <label>Email Address</label>
        <div className="input-with-icon">
          <Mail size={17} />
          <input
            type="email"
            value={formData.email}
            disabled
            className="disabled-input"
            placeholder="your@email.com"
          />
        </div>
      </div>
    </div>
  )
}
