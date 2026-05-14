'use client'

import React, { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="form-group">
        {label && <label>{label}</label>}
        <input
          ref={ref}
          className={`form-input ${error ? 'form-input--error' : ''} ${className}`}
          {...props}
        />
        {error && <span className="form-error">{error}</span>}
        <style jsx>{`
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
          }
          .form-group label {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
          }
          .form-input {
            width: 100%;
            background: var(--surface);
            border: 1px solid var(--border-solid);
            border-radius: var(--radius-md);
            padding: 14px 16px;
            font-size: 15px;
            font-family: var(--font);
            color: var(--text);
            outline: none;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .form-input:focus {
            border-color: var(--clay);
            background: var(--bg);
            box-shadow: 0 0 0 3px var(--clay-faint);
          }
          .form-input:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background: var(--surface2);
          }
          .form-input--error {
            border-color: var(--error);
          }
          .form-error {
            font-size: 12px;
            color: var(--error);
            margin-top: 4px;
            font-weight: 500;
          }
          .form-input::placeholder {
            color: var(--text-muted);
            opacity: 0.8;
          }
        `}</style>
      </div>
    )
  }
)

Input.displayName = 'Input'
