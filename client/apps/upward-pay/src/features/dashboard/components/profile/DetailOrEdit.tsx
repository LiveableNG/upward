'use client'

import { AlertCircle, type LucideIcon } from 'lucide-react'

interface DetailOrEditProps {
  isEditing: boolean
  icon: LucideIcon
  label: string
  value: string
  displayValue?: string
  placeholder?: string
  onChange?: (v: string) => void
  type?: 'text' | 'select' | 'date'
  options?: { value: string; label: string }[]
  isCritical?: boolean
  error?: string
}

export function DetailOrEdit({
  isEditing,
  icon: Icon,
  label,
  value,
  displayValue,
  placeholder,
  onChange,
  type = 'text',
  options,
  isCritical = false,
  error,
}: DetailOrEditProps) {
  const isMissing = !value || value === ''

  if (!isEditing && isMissing && !isCritical) return null

  return (
    <div className={`detail-item ${isEditing ? 'detail-item--editing' : ''} ${isMissing ? 'detail-item--missing' : ''} ${isCritical ? 'detail-item--critical' : ''} ${error ? 'detail-item--error' : ''}`}>
      <div className="detail-item__left">
        <div className="detail-item__icon-container">
          <Icon size={18} />
        </div>
        <div className="detail-item__info">
          <span className="detail-item__label">{label}</span>
          {isEditing ? (
            <div className="detail-item__input-wrapper">
              {type === 'select' ? (
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
              )}
              {error && <span className="detail-item__error-text">{error}</span>}
            </div>
          ) : (
            <span
              className={`detail-item__value ${isMissing ? 'detail-item__value--missing' : ''}`}
            >
              {isMissing ? 'Not provided' : (displayValue || value)}
            </span>
          )}
        </div>
      </div>
      {!isEditing && isMissing && (
        <div className="detail-item__warning" title="Field not filled">
          <AlertCircle size={14} />
        </div>
      )}

      <style jsx>{`
        .detail-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 0;
          transition: all 0.2s ease;
        }

        .detail-item__left {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .detail-item__icon-container {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: var(--bg);
          border: 1px solid var(--border-solid);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .detail-item--editing .detail-item__icon-container {
          background: var(--clay-faint);
          color: var(--clay);
          border-color: transparent;
        }

        .detail-item__info {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          flex: 1;
        }

        .detail-item__label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          transition: color 0.2s ease;
        }

        .detail-item--critical .detail-item__label {
          color: var(--clay);
        }

        .detail-item--critical .detail-item__icon-container {
          color: var(--clay);
          background: var(--clay-faint);
        }

        .detail-item__value {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
          word-break: break-all;
        }

        .detail-item__value--missing {
          color: var(--text-muted);
          font-style: italic;
          font-weight: 400;
        }

        .detail-item__input-wrapper {
          position: relative;
          width: 100%;
        }

        .detail-item__input {
          width: 100%;
          background: var(--local-surface);
          border: 1px solid var(--local-border);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          font-family: inherit;
          color: var(--text);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
          margin-top: 0.25rem;
        }

        .detail-item__input:focus {
          border-color: var(--clay);
          background: var(--bg);
          box-shadow: 0 0 0 4px var(--clay-glow);
        }
        
        .detail-item--error .detail-item__input {
          border-color: var(--error);
          background: #fffafa;
        }

        :global(.theme--dark) .detail-item--error .detail-item__input {
          background: #2a1a1a;
        }

        .detail-item__error-text {
          font-size: 0.75rem;
          color: var(--error);
          font-weight: 600;
          margin-top: 0.25rem;
          display: block;
        }

        .detail-item__warning {
          color: var(--warning);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }

        select.detail-item__input {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23928e89' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
        }
      `}</style>
    </div>
  )
}
