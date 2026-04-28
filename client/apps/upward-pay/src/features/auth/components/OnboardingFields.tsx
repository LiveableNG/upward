import React from 'react'
import { User, Mail } from 'lucide-react'
import { PhoneInput } from '@/components/common/PhoneInput'
import { isValidPhoneNumber } from 'libphonenumber-js'

interface OnboardingFieldsProps {
  formData: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  setFormData: (data: any) => void
  disabled?: boolean
}

export function OnboardingFields({ formData, setFormData, disabled = false }: OnboardingFieldsProps) {
  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const phoneError = formData.phone && !isValidPhoneNumber(formData.phone) 
    ? 'Invalid international phone number' 
    : undefined

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
            />
          </div>
        </div>
      </div>

      <div className="auth-form__field mt-3">
        <label>Email Address</label>
        <div className="input-with-icon">
          <Mail size={17} />
          <input
            type="email"
            value={formData.email}
            disabled
            className="disabled-input"
          />
        </div>
      </div>

      <div className="mt-3">
        <PhoneInput
          label="Phone Number"
          value={formData.phone}
          onValueChange={(val) => handleChange('phone', val)}
          placeholder="e.g. +234..."
          disabled={disabled}
          error={phoneError}
        />
      </div>

      <style jsx>{`
        .auth-form__row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .mt-3 {
          margin-top: 12px;
        }
        .disabled-input {
          cursor: not-allowed;
          opacity: 0.7;
          background: var(--surface2) !important;
        }
        @media (max-width: 480px) {
          .auth-form__row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

