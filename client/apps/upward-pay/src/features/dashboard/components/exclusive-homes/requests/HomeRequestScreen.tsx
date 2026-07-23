'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import {
  PayFlowPrimaryButton,
  PayPageShell,
} from '@/features/dashboard/components/payment/PayPageShell'
import {
  HOME_REQUEST_PAGE_COPY,
  HOME_REQUEST_PROPERTY_TYPES,
  type HomeRequestPropertyType,
} from '@/features/dashboard/constants/exclusiveHomeRequests'
import type { HomeRequestLocation } from '@/features/dashboard/constants/homeRequestLocations'
import {
  createHomeRequest,
  saveHomeRequest,
} from '@/features/dashboard/utils/exclusiveHomeRequests'
import { HomeRequestLocationPicker } from './HomeRequestLocationPicker'

const BED_OPTIONS = [1, 2, 3, 4] as const

export function HomeRequestScreen() {
  const router = useRouter()
  const [locations, setLocations] = useState<HomeRequestLocation[]>([])
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [propertyType, setPropertyType] = useState<HomeRequestPropertyType>('apartment')
  const [beds, setBeds] = useState<number>(2)
  const [moveInDate, setMoveInDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit =
    locations.length > 0 &&
    budgetMin.trim().length > 0 &&
    budgetMax.trim().length > 0 &&
    moveInDate.length > 0 &&
    Number(budgetMax) >= Number(budgetMin)

  const handleSubmit = () => {
    if (!canSubmit || submitting) return

    setSubmitting(true)
    const request = createHomeRequest({
      locations,
      budgetMin: Number(budgetMin),
      budgetMax: Number(budgetMax),
      propertyType,
      beds,
      moveInDate,
      notes,
    })
    saveHomeRequest(request)
    router.push(`/dashboard/exclusive-homes/request/submitted?requestId=${request.id}`)
  }

  return (
    <PayPageShell
      title={HOME_REQUEST_PAGE_COPY.formTitle}
      subtitle={HOME_REQUEST_PAGE_COPY.formSubtitle}
      showBack
      onBack={() => router.push('/dashboard')}
      pinFooter
      footer={
        <div className="home-req__footer">
          <PayFlowPrimaryButton disabled={!canSubmit} loading={submitting} onClick={handleSubmit}>
            {HOME_REQUEST_PAGE_COPY.submitLabel}
          </PayFlowPrimaryButton>
          <button
            type="button"
            className="home-req__browse-link"
            onClick={() => router.push('/dashboard/exclusive-homes')}
          >
            {HOME_REQUEST_PAGE_COPY.browseLink}
          </button>
        </div>
      }
    >
      <div className="home-req__trust">
        <span className="home-req__trust-icon" aria-hidden>
          <ShieldCheck size={18} />
        </span>
        <p className="home-req__trust-text">{HOME_REQUEST_PAGE_COPY.trustBanner}</p>
      </div>

      <HomeRequestLocationPicker value={locations} onChange={setLocations} />

      <div className="home-req__row">
        <div className="pay-flow__field home-req__row-field">
          <label className="pay-flow__field-label" htmlFor="home-req-budget-min">
            Budget min (₦/yr)
          </label>
          <div className="pay-flow__input-wrap">
            <input
              id="home-req-budget-min"
              type="number"
              inputMode="numeric"
              placeholder="2,000,000"
              value={budgetMin}
              onChange={(event) => setBudgetMin(event.target.value)}
            />
          </div>
        </div>

        <div className="pay-flow__field home-req__row-field">
          <label className="pay-flow__field-label" htmlFor="home-req-budget-max">
            Budget max (₦/yr)
          </label>
          <div className="pay-flow__input-wrap">
            <input
              id="home-req-budget-max"
              type="number"
              inputMode="numeric"
              placeholder="3,000,000"
              value={budgetMax}
              onChange={(event) => setBudgetMax(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="pay-flow__field">
        <span className="pay-flow__field-label">{HOME_REQUEST_PAGE_COPY.propertyTypeLabel}</span>
        <div className="home-req__chips" role="group" aria-label={HOME_REQUEST_PAGE_COPY.propertyTypeLabel}>
          {HOME_REQUEST_PROPERTY_TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`exclusive-homes__filter-chip${
                propertyType === option.value ? ' exclusive-homes__filter-chip--active' : ''
              }`}
              onClick={() => setPropertyType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pay-flow__field">
        <span className="pay-flow__field-label">Bedrooms</span>
        <div className="home-req__chips" role="group" aria-label="Bedrooms">
          {BED_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              className={`exclusive-homes__filter-chip${
                beds === value ? ' exclusive-homes__filter-chip--active' : ''
              }`}
              onClick={() => setBeds(value)}
            >
              {value === 4 ? '4+' : `${value} bed`}
            </button>
          ))}
        </div>
      </div>

      <div className="pay-flow__field">
        <label className="pay-flow__field-label" htmlFor="home-req-move-in">
          Move-in date
        </label>
        <div className="pay-flow__input-wrap">
          <input
            id="home-req-move-in"
            type="date"
            value={moveInDate}
            onChange={(event) => setMoveInDate(event.target.value)}
          />
        </div>
      </div>

      <div className="pay-flow__field">
        <label className="pay-flow__field-label" htmlFor="home-req-notes">
          Notes <span className="pay-flow__field-optional">(optional)</span>
        </label>
        <textarea
          id="home-req-notes"
          className="home-req__textarea"
          placeholder="Must-haves, pets, parking, power preferences…"
          rows={4}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
    </PayPageShell>
  )
}
