'use client'

import { Calendar } from 'lucide-react'
import { useState } from 'react'

interface DateInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}

export default function DateInput({ id, label, value, onChange, required }: DateInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <div className={`auth-form__field ${isFocused ? 'is-focused' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="input-with-icon">
        <Calendar size={17} />
        <input
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          required={required}
          style={{ appearance: 'none' }}
        />
      </div>
    </div>
  )
}
