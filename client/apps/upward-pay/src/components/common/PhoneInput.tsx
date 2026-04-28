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

    // Only allow digits and +
    val = val.replace(/[^\d+]/g, '')

    // Ensure only one + at the beginning
    if (val.includes('+')) {
      val = '+' + val.replace(/\+/g, '')
    }

    // Limit length to reasonable international number
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

  return (
    <div className={`auth-form__field ${error ? 'auth-form__field--error' : ''}`}>
      {label && <label>{label}</label>}
      <div className="input-with-icon">
        <Phone size={17} className="input-icon" />
        <input
          {...props}
          type="tel"
          value={value}
          onChange={handleChange}
          className={`${className || ''} ${error ? 'input--error' : ''}`}
          style={{ paddingLeft: '40px' }}
        />
      </div>
      {error && <p className="error-text">{error}</p>}
      
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
        .error-text {
          color: var(--error);
          font-size: 12px;
          margin-top: 4px;
          font-weight: 500;
        }
        .input--error {
          border-color: var(--error) !important;
          background-color: var(--error-bg, rgba(239, 68, 68, 0.05)) !important;
        }
      `}</style>
    </div>
  )
}
