'use client'

type AmountInputProps = {
  id: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  placeholder?: string
  'aria-invalid'?: boolean
}

const amountFormatter = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 })

function formatAmountDisplay(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return ''
  return amountFormatter.format(Math.trunc(value))
}

function parseAmountInput(raw: string): number | undefined {
  const digitsOnly = raw.replace(/[^\d]/g, '')
  if (!digitsOnly) return undefined
  const n = Number(digitsOnly)
  return Number.isFinite(n) ? n : undefined
}

export function AmountInput({
  id,
  value,
  onChange,
  placeholder = 'Enter amount',
  'aria-invalid': ariaInvalid,
}: AmountInputProps) {
  return (
    <div className="rah-amount">
      <span className="rah-amount__currency" aria-hidden>
        ₦
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="rah-input rah-amount__input"
        placeholder={placeholder}
        value={formatAmountDisplay(value)}
        aria-invalid={ariaInvalid}
        onChange={(event) => onChange(parseAmountInput(event.target.value))}
      />
    </div>
  )
}
