'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Flag,
  Send,
  UserRound,
  MapPin,
  Wallet,
  Home,
  BedDouble,
  Sparkles,
  MessageSquare,
  Check,
  Building,
  Coins,
  BadgePercent,
  Key,
} from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import type { RequestHomeLocation } from '@/lib/request-home-locations'
import { AmountInput } from './AmountInput'
import { LocationMultiSelect } from './LocationMultiSelect'
import { BudgetGuidance } from './BudgetGuidance'

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'studio', label: 'Studio' },
  { value: 'house', label: 'House' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'terrace', label: 'Terrace' },
  { value: 'any', label: 'Any' },
] as const

const BED_OPTIONS = [1, 2, 3, 4] as const

const AMENITY_OPTIONS = [
  '24/7 power / inverter',
  'Reliable water',
  'Parking',
  'Gated estate / security',
  'Fitted kitchen',
  'Air conditioning',
  'Serviced apartment',
  'Elevator',
  'Pet friendly',
  'Close to main road',
] as const

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

const schema = z
  .object({
    requestType: z.enum(['RENT', 'BUY']),
    fullName: z.string().max(120).optional().or(z.literal('')),
    email: z.string().email('Enter a valid email'),
    phone: z.string().min(7, 'Enter a valid phone number').max(40, 'Phone number is too long'),
    // Rent fields
    budgetMin: z.coerce.number().optional(),
    budgetMax: z.coerce.number().optional(),
    moveInDate: z.string().optional().or(z.literal('')),
    // Buy fields
    savedAmount: z.coerce.number().optional(),
    overallBudget: z.coerce.number().optional(),
    // Shared
    beds: z.coerce.number().int().min(1).max(6),
    notes: z.string().max(2000).optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.requestType === 'RENT') {
        return (data.budgetMin ?? 0) > 0
      }
      return true
    },
    {
      message: 'Enter a minimum rental budget',
      path: ['budgetMin'],
    },
  )
  .refine(
    (data) => {
      if (data.requestType === 'RENT') {
        return (data.budgetMax ?? 0) > 0
      }
      return true
    },
    {
      message: 'Enter a maximum rental budget',
      path: ['budgetMax'],
    },
  )
  .refine(
    (data) => {
      if (data.requestType === 'RENT' && data.budgetMin && data.budgetMax) {
        return data.budgetMax >= data.budgetMin
      }
      return true
    },
    {
      message: 'Max budget must be at least the min budget',
      path: ['budgetMax'],
    },
  )
  .refine(
    (data) => {
      if (data.requestType === 'BUY') {
        return (data.overallBudget ?? 0) > 0
      }
      return true
    },
    {
      message: 'Enter your overall purchase budget',
      path: ['overallBudget'],
    },
  )
  .refine(
    (data) => {
      if (data.requestType === 'BUY' && data.savedAmount && data.overallBudget) {
        return data.savedAmount <= data.overallBudget * 2
      }
      return true
    },
    {
      message: 'Saved amount cannot exceed double the total budget',
      path: ['savedAmount'],
    },
  )
  .refine((data) => !data.moveInDate || data.moveInDate >= todayIsoDate(), {
    message: 'Move-in date cannot be in the past',
    path: ['moveInDate'],
  })

type FormData = z.infer<typeof schema>
type PropertyTypeValue = (typeof PROPERTY_TYPES)[number]['value']

function scrollToFirstError() {
  requestAnimationFrame(() => {
    document.querySelector('.rah-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

export function RequestAHomeForm() {
  const toast = useToast()
  const [requestType, setRequestType] = useState<'RENT' | 'BUY'>('RENT')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState('')
  const [selectedLocations, setSelectedLocations] = useState<RequestHomeLocation[]>([])
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeValue[]>(['apartment'])
  const [amenities, setAmenities] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      requestType: 'RENT',
      beds: 2,
      fullName: '',
      email: '',
      phone: '',
      budgetMin: undefined,
      budgetMax: undefined,
      savedAmount: undefined,
      overallBudget: undefined,
      moveInDate: '',
      notes: '',
    },
  })

  const beds = watch('beds')
  const budgetMin = watch('budgetMin')
  const budgetMax = watch('budgetMax')
  const savedAmount = watch('savedAmount')
  const overallBudget = watch('overallBudget')
  const notes = watch('notes')

  const handleIntentChange = (type: 'RENT' | 'BUY') => {
    setRequestType(type)
    setValue('requestType', type, { shouldValidate: true })
  }

  const togglePropertyType = (value: PropertyTypeValue) => {
    setPropertyTypes((prev) => {
      if (value === 'any') {
        return prev.includes('any') ? [] : ['any']
      }

      const withoutAny = prev.filter((type) => type !== 'any')
      if (withoutAny.includes(value)) {
        return withoutAny.filter((type) => type !== value)
      }
      return [...withoutAny, value]
    })
  }

  const toggleAmenity = (value: string) => {
    setAmenities((prev) =>
      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value],
    )
  }

  const onSubmit = async (data: FormData) => {
    if (selectedLocations.length === 0) {
      setStatus('error')
      toast.error('Select at least one preferred location')
      scrollToFirstError()
      return
    }

    if (propertyTypes.length === 0) {
      setStatus('error')
      toast.error('Select at least one property type')
      scrollToFirstError()
      return
    }

    setStatus('submitting')
    setSubmitError('')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
      const response = await fetch(`${apiUrl}/public/home-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType,
          fullName: data.fullName?.trim() || undefined,
          email: data.email.trim(),
          phone: data.phone.trim(),
          locations: selectedLocations,
          budgetMin: requestType === 'RENT' ? Number(data.budgetMin) : Number(data.overallBudget || 0),
          budgetMax: requestType === 'RENT' ? Number(data.budgetMax) : Number(data.overallBudget || 0),
          savedAmount: requestType === 'BUY' && data.savedAmount ? Number(data.savedAmount) : undefined,
          overallBudget: requestType === 'BUY' && data.overallBudget ? Number(data.overallBudget) : undefined,
          propertyTypes,
          beds: Number(data.beds),
          moveInDate: requestType === 'RENT' ? data.moveInDate || undefined : undefined,
          amenities,
          notes: data.notes?.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        const apiMessage = Array.isArray(result.message) ? result.message[0] : result.message
        throw new Error(
          typeof apiMessage === 'string' && apiMessage.trim()
            ? apiMessage
            : 'Failed to submit request',
        )
      }

      toast.success('Request received. We’ll reach out on email or phone.')
      setStatus('success')
      reset({ requestType })
      setSelectedLocations([])
      setPropertyTypes(['apartment'])
      setAmenities([])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setSubmitError(msg)
      toast.error(msg)
      setStatus('error')
    }
  }

  useEffect(() => {
    if (status === 'success') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [status])

  if (status === 'success') {
    return (
      <div className="rah-success">
        <div className="rah-success__icon">
          <CheckCircle2 size={44} />
        </div>
        <h1 className="rah-success__title">
          {requestType === 'BUY' ? 'Home Purchase Request Received' : 'Rental Request Received'}
        </h1>
        <p className="rah-success__text">
          {requestType === 'BUY'
            ? 'A verified property advisor will review your buying brief and reach out with matching verified properties.'
            : 'A verified agent will review your brief and contact you with matching rental options.'}
        </p>
        <ul className="rah-success__steps">
          <li>
            <span className="rah-success__step-num">1</span>
            We match your brief to verified listings across Nigeria
          </li>
          <li>
            <span className="rah-success__step-num">2</span>
            A NIESV-verified agent or advisor reaches out to you
          </li>
          <li>
            <span className="rah-success__step-num">3</span>
            You review options — no browsing or endless agent calls required
          </li>
        </ul>
        <button type="button" className="rah-success__btn" onClick={() => setStatus('idle')}>
          Submit another request
        </button>
      </div>
    )
  }

  return (
    <div className="rah">
      {/* PropertyPro style Rent vs Buy Switcher */}
      <div className="rah-intent-switcher" role="tablist" aria-label="Choose Rent or Buy">
        <button
          type="button"
          role="tab"
          aria-selected={requestType === 'RENT'}
          className={`rah-intent-tab${requestType === 'RENT' ? ' rah-intent-tab--active' : ''}`}
          onClick={() => handleIntentChange('RENT')}
        >
          <Key size={16} aria-hidden />
          Rent a Home
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={requestType === 'BUY'}
          className={`rah-intent-tab${requestType === 'BUY' ? ' rah-intent-tab--active' : ''}`}
          onClick={() => handleIntentChange('BUY')}
        >
          <Building size={16} aria-hidden />
          Buy a Home (Sale)
        </button>
      </div>

      <span className="rah__badge">
        <Home size={14} aria-hidden />
        {requestType === 'BUY' ? 'Buy a Property (Sale)' : 'Request a Rental Home'}
      </span>

      <h1 className="rah__title">
        Tell us what you{' '}
        <span className="rah__title-accent">
          {requestType === 'BUY' ? 'want to buy.' : 'need to rent.'}
        </span>
      </h1>

      <p className="rah__lead">
        {requestType === 'BUY'
          ? 'Share your purchase criteria, savings, and overall budget once. Verified advisors match you directly with inspected homes.'
          : 'Share your rental brief once. Verified agents match you to verified apartments — zero stress.'}
      </p>

      <div className="rah__trust">
        <div className="rah__trust-item">
          <ShieldCheck size={16} aria-hidden />
          <span>NIESV-verified agents</span>
        </div>
        <div className="rah__trust-item">
          <ShieldAlert size={16} aria-hidden />
          <span>Scam-protected process</span>
        </div>
        <div className="rah__trust-item">
          <Flag size={16} aria-hidden />
          <span>We report members who scam</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, scrollToFirstError)} className="rah-form" noValidate>
        {/* Contact Info Card */}
        <div className="rah-card">
          <div className="rah-card__header">
            <span className="rah-icon">
              <UserRound size={18} aria-hidden />
            </span>
            <div>
              <h2 className="rah-card__title">How should we reach you?</h2>
              <p className="rah-card__hint">We’ll use these to follow up with matching options.</p>
            </div>
          </div>

          <div className="rah-grid">
            <div className="rah-field">
              <label className="rah-label" htmlFor="rah-name">
                Full name <span className="rah-optional">(optional)</span>
              </label>
              <input
                id="rah-name"
                className="rah-input"
                placeholder="Adaeze Okonkwo"
                {...register('fullName')}
              />
              {errors.fullName && <span className="rah-error">{errors.fullName.message}</span>}
            </div>
            <div className="rah-field">
              <label className="rah-label" htmlFor="rah-email">
                Email
              </label>
              <input
                id="rah-email"
                type="email"
                className="rah-input"
                placeholder="you@email.com"
                {...register('email')}
              />
              {errors.email && <span className="rah-error">{errors.email.message}</span>}
            </div>
            <div className="rah-field">
              <label className="rah-label" htmlFor="rah-phone">
                WhatsApp number
              </label>
              <input
                id="rah-phone"
                type="tel"
                className="rah-input"
                placeholder="0803 000 0000"
                {...register('phone')}
              />
              <p className="rah-field-hint">
                Prefer a number you use on WhatsApp — agents will message you there.
              </p>
              {errors.phone && <span className="rah-error">{errors.phone.message}</span>}
            </div>
          </div>
        </div>

        {/* Preferred Locations Card */}
        <div className="rah-card">
          <div className="rah-card__header">
            <span className="rah-icon">
              <MapPin size={18} aria-hidden />
            </span>
            <div>
              <h2 className="rah-card__title">
                {requestType === 'BUY' ? 'Target purchase areas' : 'Preferred rental locations'}
              </h2>
              <p className="rah-card__hint">
                Search and add up to 3 areas — e.g. Yaba, Lekki Phase 1, Wuse 2.
              </p>
            </div>
          </div>
          <LocationMultiSelect value={selectedLocations} onChange={setSelectedLocations} />
          {status === 'error' && selectedLocations.length === 0 && (
            <span className="rah-error">Select at least one location</span>
          )}
        </div>

        {/* Home Details Card */}
        <div className="rah-card">
          <div className="rah-card__header">
            <span className="rah-icon">
              <Home size={18} aria-hidden />
            </span>
            <div>
              <h2 className="rah-card__title">Property details</h2>
              <p className="rah-card__hint">Property type and number of bedrooms.</p>
            </div>
          </div>

          <p className="rah-subhint">Property type — select one or more</p>
          <div className="rah-chips" role="group" aria-label="Property type">
            {PROPERTY_TYPES.map((opt) => {
              const active = propertyTypes.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`rah-chip${active ? ' rah-chip--active' : ''}`}
                  onClick={() => togglePropertyType(opt.value)}
                  aria-pressed={active}
                >
                  {active && <Check size={13} aria-hidden />}
                  {opt.label}
                </button>
              )
            })}
          </div>
          {status === 'error' && propertyTypes.length === 0 && (
            <span className="rah-error">Select at least one property type</span>
          )}

          <p className="rah-subhint rah-subhint--spaced">
            <BedDouble size={14} aria-hidden /> Bedrooms
          </p>
          <div className="rah-chips" role="group" aria-label="Bedrooms">
            {BED_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={`rah-chip${beds === value ? ' rah-chip--active' : ''}`}
                onClick={() => setValue('beds', value, { shouldValidate: true })}
                aria-pressed={beds === value}
              >
                {beds === value && <Check size={13} aria-hidden />}
                {value === 4 ? '4+' : `${value} bed`}
              </button>
            ))}
          </div>
        </div>

        {/* Financial & Budget Card: Dynamic for Rent vs Buy */}
        {requestType === 'RENT' ? (
          <div className="rah-card">
            <div className="rah-card__header">
              <span className="rah-icon">
                <Wallet size={18} aria-hidden />
              </span>
              <div>
                <h2 className="rah-card__title">Rental budget</h2>
                <p className="rah-card__hint">Annual rent range in Naira.</p>
              </div>
            </div>
            <BudgetGuidance
              locations={selectedLocations}
              bedrooms={beds}
              onApplyRange={(min, max) => {
                setValue('budgetMin', min as FormData['budgetMin'], {
                  shouldValidate: true,
                  shouldDirty: true,
                })
                setValue('budgetMax', max as FormData['budgetMax'], {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }}
            />
            <div className="rah-grid rah-grid--2">
              <div className="rah-field">
                <label className="rah-label" htmlFor="rah-budget-min">
                  Minimum (₦ / year)
                </label>
                <AmountInput
                  id="rah-budget-min"
                  value={budgetMin}
                  placeholder="Enter minimum amount"
                  aria-invalid={Boolean(errors.budgetMin)}
                  onChange={(value) =>
                    setValue('budgetMin', value as FormData['budgetMin'], {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                />
                {errors.budgetMin && <span className="rah-error">{errors.budgetMin.message}</span>}
              </div>
              <div className="rah-field">
                <label className="rah-label" htmlFor="rah-budget-max">
                  Maximum (₦ / year)
                </label>
                <AmountInput
                  id="rah-budget-max"
                  value={budgetMax}
                  placeholder="Enter maximum amount"
                  aria-invalid={Boolean(errors.budgetMax)}
                  onChange={(value) =>
                    setValue('budgetMax', value as FormData['budgetMax'], {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                />
                {errors.budgetMax && <span className="rah-error">{errors.budgetMax.message}</span>}
              </div>
            </div>
          </div>
        ) : (
          <div className="rah-card">
            <div className="rah-card__header">
              <span className="rah-icon">
                <Coins size={18} aria-hidden />
              </span>
              <div>
                <h2 className="rah-card__title">Purchase budget & savings</h2>
                <p className="rah-card__hint">
                  Tell us your current savings towards the purchase and your overall target budget.
                </p>
              </div>
            </div>

            <div className="rah-grid rah-grid--2">
              <div className="rah-field">
                <label className="rah-label" htmlFor="rah-saved-amount">
                  How much have you saved? <span className="rah-optional">(Deposit / Equity in ₦)</span>
                </label>
                <AmountInput
                  id="rah-saved-amount"
                  value={savedAmount}
                  placeholder="e.g. 15,000,000"
                  aria-invalid={Boolean(errors.savedAmount)}
                  onChange={(value) =>
                    setValue('savedAmount', value as FormData['savedAmount'], {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                />
                <p className="rah-field-hint">Your liquid cash or deposit currently set aside.</p>
                {errors.savedAmount && (
                  <span className="rah-error">{errors.savedAmount.message}</span>
                )}
              </div>

              <div className="rah-field">
                <label className="rah-label" htmlFor="rah-overall-budget">
                  Overall purchase budget (₦)
                </label>
                <AmountInput
                  id="rah-overall-budget"
                  value={overallBudget}
                  placeholder="e.g. 60,000,000"
                  aria-invalid={Boolean(errors.overallBudget)}
                  onChange={(value) =>
                    setValue('overallBudget', value as FormData['overallBudget'], {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                />
                <p className="rah-field-hint">Maximum target property acquisition price.</p>
                {errors.overallBudget && (
                  <span className="rah-error">{errors.overallBudget.message}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Amenities Card */}
        <div className="rah-card">
          <div className="rah-card__header">
            <span className="rah-icon">
              <Sparkles size={18} aria-hidden />
            </span>
            <div>
              <h2 className="rah-card__title">
                Amenities <span className="rah-optional">(optional)</span>
              </h2>
              <p className="rah-card__hint">Pick must-haves for the property.</p>
            </div>
          </div>
          <div className="rah-chips" role="group" aria-label="Amenities">
            {AMENITY_OPTIONS.map((value) => {
              const active = amenities.includes(value)
              return (
                <button
                  key={value}
                  type="button"
                  className={`rah-chip${active ? ' rah-chip--active' : ''}`}
                  onClick={() => toggleAmenity(value)}
                  aria-pressed={active}
                >
                  {active && <Check size={13} aria-hidden />}
                  {value}
                </button>
              )
            })}
          </div>
        </div>

        {/* Timing / Notes Card */}
        <div className="rah-card">
          <div className="rah-card__header">
            <span className="rah-icon">
              <MessageSquare size={18} aria-hidden />
            </span>
            <div>
              <h2 className="rah-card__title">
                {requestType === 'BUY' ? 'Purchase timeline & notes' : 'Move-in date & preferences'}
              </h2>
              <p className="rah-card__hint">
                {requestType === 'BUY'
                  ? 'Let us know if you need mortgage assistance or have specific estate preferences.'
                  : 'Move-in date and any other preferences.'}
              </p>
            </div>
          </div>

          {requestType === 'RENT' && (
            <div className="rah-field">
              <label className="rah-label" htmlFor="rah-move-in">
                Move-in date <span className="rah-optional">(optional)</span>
              </label>
              <input
                id="rah-move-in"
                type="date"
                className="rah-input"
                min={todayIsoDate()}
                aria-invalid={Boolean(errors.moveInDate)}
                {...register('moveInDate')}
              />
              {errors.moveInDate && <span className="rah-error">{errors.moveInDate.message}</span>}
            </div>
          )}

          <div className={`rah-field${requestType === 'RENT' ? ' rah-field--spaced' : ''}`}>
            <label className="rah-label" htmlFor="rah-notes">
              {requestType === 'BUY' ? 'Special requirements or financing preferences' : 'Notes'}
            </label>
            <textarea
              id="rah-notes"
              className="rah-textarea"
              rows={4}
              maxLength={2000}
              placeholder={
                requestType === 'BUY'
                  ? 'e.g. Looking for brand new building, Governor’s consent title, payment plans accepted…'
                  : 'Anything else — pets, work-from-home, estate preferences…'
              }
              {...register('notes')}
            />
            <span className="rah-charcount">{notes?.length || 0}/2000</span>
          </div>
        </div>

        {submitError && (
          <div className="rah-alert" role="alert">
            {submitError}
          </div>
        )}

        <button type="submit" className="rah-submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? (
            <span className="rah-spinner" aria-hidden />
          ) : (
            <>
              {requestType === 'BUY' ? 'Submit purchase request' : 'Submit rental request'} <Send size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
