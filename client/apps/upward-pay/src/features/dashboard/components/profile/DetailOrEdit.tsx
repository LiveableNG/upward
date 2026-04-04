'use client'

import { AlertCircle, type LucideIcon } from 'lucide-react'

interface DetailOrEditProps {
  isEditing: boolean
  icon: LucideIcon
  label: string
  value: string
  placeholder?: string
  onChange?: (v: string) => void
}

export function DetailOrEdit({
  isEditing,
  icon: Icon,
  label,
  value,
  placeholder,
  onChange,
}: DetailOrEditProps) {
  const isMissing = !value || value === ''

  return (
    <div className={`detail-item ${isEditing ? 'detail-item--editing' : ''}`}>
      <div className="detail-item__left">
        <Icon size={18} color={isEditing ? 'var(--clay)' : 'var(--text-muted)'} />
        <div className="detail-item__info">
          <span className="detail-item__label">{label}</span>
          {isEditing ? (
            <input
              type="text"
              className="detail-item__input"
              value={value}
              placeholder={placeholder || `Enter ${label}`}
              onChange={(e) => onChange?.(e.target.value)}
            />
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
