'use client'

import { AlertCircle, type LucideIcon } from 'lucide-react'

interface DetailOrEditProps {
  isEditing: boolean
  icon: LucideIcon
  label: string
  value: string
  placeholder?: string
  onChange?: (v: string) => void
  type?: 'text' | 'select' | 'date'
  options?: { value: string; label: string }[]
}

export function DetailOrEdit({
  isEditing,
  icon: Icon,
  label,
  value,
  placeholder,
  onChange,
  type = 'text',
  options,
}: DetailOrEditProps) {
  const isMissing = !value || value === ''

  return (
    <div className={`detail-item ${isEditing ? 'detail-item--editing' : ''}`}>
      <div className="detail-item__left">
        <Icon size={18} color={isEditing ? 'var(--clay)' : 'var(--text-muted)'} />
        <div className="detail-item__info">
          <span className="detail-item__label">{label}</span>
          {isEditing ? (
            type === 'select' ? (
              <select
                className="detail-item__input"
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
              >
                <option value="">Select {label}</option>
                {options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                className="detail-item__input"
                value={value}
                placeholder={placeholder || `Enter ${label}`}
                onChange={(e) => onChange?.(e.target.value)}
              />
            )
          ) : (
            <span
              className={`detail-item__value ${isMissing ? 'detail-item__value--missing' : ''}`}
            >
              {isMissing ? 'Not provided' : value}
            </span>
          )}
        </div>
      </div>
      {!isEditing && isMissing && (
        <div className="detail-item__warning" title="Field not filled">
          <AlertCircle size={10} color="#eab308" />
        </div>
      )}
    </div>
  )
}
