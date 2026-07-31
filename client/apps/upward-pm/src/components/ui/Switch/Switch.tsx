'use client'

import React, { useId } from 'react'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
  className?: string
  id?: string
  name?: string
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className = '',
  id,
  name,
}: SwitchProps) {
  const generatedId = useId()
  const switchId = id || generatedId

  return (
    <label className={`upward-switch ${className} ${disabled ? 'upward-switch--disabled' : ''}`} htmlFor={switchId}>
      <span className="upward-switch__copy">
        <span className="upward-switch__label">{label}</span>
        {description ? <span className="upward-switch__description">{description}</span> : null}
      </span>

      <span className="upward-switch__control">
        <input
          id={switchId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          disabled={disabled}
          className="upward-switch__input"
        />
        <span aria-hidden="true" className="upward-switch__track">
          <span className="upward-switch__thumb" />
        </span>
      </span>

      <style jsx>{`
        .upward-switch {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          width: 100%;
          padding: 16px 18px;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 247, 0.96));
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.75) inset;
          cursor: pointer;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease;
        }

        .upward-switch:hover {
          border-color: rgba(22, 101, 52, 0.22);
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(17, 24, 39, 0.06), 0 1px 0 rgba(255, 255, 255, 0.75) inset;
        }

        .upward-switch:focus-within {
          border-color: rgba(22, 101, 52, 0.4);
          box-shadow: 0 0 0 4px rgba(22, 101, 52, 0.08);
        }

        .upward-switch--disabled {
          cursor: not-allowed;
          opacity: 0.6;
          transform: none;
        }

        .upward-switch__copy {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .upward-switch__label {
          font-size: 14px;
          font-weight: 700;
          color: var(--dark);
          line-height: 1.2;
        }

        .upward-switch__description {
          font-size: 12.5px;
          line-height: 1.45;
          color: var(--text-secondary);
        }

        .upward-switch__control {
          position: relative;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
        }

        .upward-switch__input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          margin: 0;
          opacity: 0;
          cursor: inherit;
        }

        .upward-switch__track {
          width: 52px;
          height: 32px;
          border-radius: 999px;
          background: rgba(17, 24, 39, 0.1);
          padding: 3px;
          transition: background 0.2s ease, box-shadow 0.2s ease;
          box-shadow: inset 0 0 0 1px rgba(17, 24, 39, 0.06);
        }

        .upward-switch__thumb {
          display: block;
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: white;
          box-shadow: 0 3px 10px rgba(15, 23, 42, 0.18);
          transform: translateX(0);
          transition: transform 0.2s ease;
        }

        .upward-switch__input:checked + .upward-switch__track {
          background: var(--forest);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .upward-switch__input:checked + .upward-switch__track .upward-switch__thumb {
          transform: translateX(20px);
        }

        .upward-switch__input:focus-visible + .upward-switch__track {
          box-shadow: 0 0 0 4px rgba(22, 101, 52, 0.18);
        }

        @media (max-width: 640px) {
          .upward-switch {
            align-items: flex-start;
          }

          .upward-switch__control {
            margin-top: 2px;
          }
        }
      `}</style>
    </label>
  )
}