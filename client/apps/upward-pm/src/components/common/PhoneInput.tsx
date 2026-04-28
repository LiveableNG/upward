import React from 'react'
import { Phone } from 'lucide-react'
import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js'

interface PhoneInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  onValueChange?: (value: string) => void
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ 
  label, 
  error, 
  onValueChange, 
  value, 
  onChange,
  className,
  ...props 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value
    val = val.replace(/[^\d+]/g, '')
    if (val.includes('+')) {
      val = '+' + val.replace(/\+/g, '')
    }
    if (val.length > 16) {
      val = val.slice(0, 16)
    }

    if (onValueChange) {
      onValueChange(val)
    }
    
    if (onChange) {
      const fakeEvent = {
        ...e,
        target: {
          ...e.target,
          value: val,
          name: props.name || ''
        }
      } as React.ChangeEvent<HTMLInputElement>
      onChange(fakeEvent)
    }
  }

  const formatDisplay = (val: string) => {
    if (!val) return ''
    const phoneNumber = parsePhoneNumberFromString(val)
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.formatInternational()
    }
    return val
  }

  return (
    <div className={`form-group ${error ? 'form-group--error' : ''}`}>
      {label && <label className="form-label">{label}</label>}
      <div className="input-with-icon">
        <Phone size={17} className="input-icon" />
        <input
          {...props}
          type="tel"
          value={value}
          onChange={handleChange}
          className={`form-input ${error ? 'form-input--error' : ''} ${className || ''}`}
          style={{ paddingLeft: '40px' }}
        />
      </div>
      {error && <p className="form-error-text" style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px' }}>{error}</p>}
      
      <style jsx>{`
        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
          pointer-events: none;
        }
        .form-input--error {
          border-color: var(--error) !important;
          background-color: var(--error-bg) !important;
        }
      `}</style>
    </div>
  )
}
