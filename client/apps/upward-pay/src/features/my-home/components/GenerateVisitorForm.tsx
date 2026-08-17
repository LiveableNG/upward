'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/common/Modal'
import { useToast } from '@/components/common/Toast'
import {
  DEFAULT_VISITOR_FORM,
  NUMBER_OF_VISITORS_OPTIONS,
  VISITOR_DURATION_OPTIONS,
  VISITOR_TYPE_OPTIONS,
} from '../constants'
import { generateVisitor, searchVisitors } from '../services/myHomeService'
import type { Visitor, VisitorSearchHit } from '../types'

type Props = {
  isOpen: boolean
  onClose: () => void
  propertyUuid: string | null
  onSuccess?: (visitor: Visitor) => void
}

type VisitorForm = typeof DEFAULT_VISITOR_FORM
type VisitorFormErrors = Partial<Record<keyof VisitorForm, string>>

function validateVisitorForm(form: VisitorForm): VisitorFormErrors {
  const errors: VisitorFormErrors = {}
  if (!form.numberOfVisitors) errors.numberOfVisitors = 'Please select number of visitors'
  if (!form.name.trim() || form.name.trim().length < 2) {
    errors.name = 'Please enter a valid name'
  }
  if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) {
    errors.phone = 'Please enter a valid phone number'
  }
  if (!form.visitorType) errors.visitorType = 'Please select visitor type'
  if (!form.duration) errors.duration = 'Please select duration'
  return errors
}

export function GenerateVisitorForm({ isOpen, onClose, propertyUuid, onSuccess }: Props) {
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<VisitorForm>(DEFAULT_VISITOR_FORM)
  const [errors, setErrors] = useState<VisitorFormErrors>({})
  const [searchResults, setSearchResults] = useState<VisitorSearchHit[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchFieldRef = useRef<HTMLDivElement | null>(null)

  const mutation = useMutation({
    mutationFn: (input: {
      name: string
      phone: string
      visitorType: string
      duration: number
      numberOfVisitors: number
      notes?: string
    }) => generateVisitor(propertyUuid as string, input),
    onSuccess: (response) => {
      success('Visitor access generated.')
      queryClient.invalidateQueries({ queryKey: ['my-home', 'visitors'] })
      onSuccess?.(response.data)
      onClose()
    },
    onError: (err: { message?: string }) => {
      error(err?.message || 'Could not generate visitor access')
    },
  })

  useEffect(() => {
    if (!isOpen) {
      setForm(DEFAULT_VISITOR_FORM)
      setErrors({})
      setSearchResults([])
      setShowSearchResults(false)
      setIsSearching(false)
      mutation.reset()
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (searchFieldRef.current && !searchFieldRef.current.contains(target)) {
        setShowSearchResults(false)
      }
    }

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSearchResults])

  const runSearch = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    if (!propertyUuid || value.trim().length < 3) {
      setSearchResults([])
      setShowSearchResults(false)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchTimerRef.current = setTimeout(async () => {
      try {
        const response = await searchVisitors(propertyUuid, value.trim())
        setSearchResults(response.data || [])
        setShowSearchResults(true)
      } catch {
        setSearchResults([])
        setShowSearchResults(false)
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (name === 'name') runSearch(value)
  }

  const selectVisitorFromSearch = (visitor: VisitorSearchHit) => {
    setForm((prev) => ({
      ...prev,
      name: visitor.name || '',
      phone: visitor.phone || '',
      visitorType: visitor.visitor_type || prev.visitorType,
    }))
    setShowSearchResults(false)
    setSearchResults([])
    setErrors((prev) => {
      const next = { ...prev }
      delete next.name
      delete next.phone
      if (visitor.visitor_type) delete next.visitorType
      return next
    })
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!propertyUuid) {
      error('Select a home before generating access')
      return
    }

    const nextErrors = validateVisitorForm(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    mutation.mutate({
      name: form.name.trim(),
      phone: form.phone.trim(),
      visitorType: form.visitorType,
      duration: Number(form.duration),
      numberOfVisitors: Number(form.numberOfVisitors),
      notes: form.notes.trim() || undefined,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <form className="my-home-form" onSubmit={handleSubmit}>
        <h3 className="my-home-detail__title">Generate Access</h3>

        <label className="my-home-form__field">
          <span className="my-home-form__label">Number of Visitors</span>
          <select
            name="numberOfVisitors"
            className={`my-home-form__input${errors.numberOfVisitors ? ' my-home-form__input--error' : ''}`}
            value={form.numberOfVisitors}
            onChange={handleChange}
            disabled={mutation.isPending}
          >
            {NUMBER_OF_VISITORS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.numberOfVisitors ? (
            <span className="my-home-form__error">{errors.numberOfVisitors}</span>
          ) : null}
        </label>

        <div className="my-home-form__field" ref={searchFieldRef}>
          <span className="my-home-form__label">Main Visitor&apos;s Name</span>
          <div className="my-home-form__search">
            <input
              type="text"
              name="name"
              className={`my-home-form__input${errors.name ? ' my-home-form__input--error' : ''}`}
              placeholder="Start typing to search previous visitors"
              value={form.name}
              onChange={handleChange}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchResults(true)
              }}
              disabled={mutation.isPending}
              autoComplete="off"
            />
            {isSearching ? <span className="my-home-form__search-spinner" aria-hidden /> : null}
            {showSearchResults && searchResults.length > 0 ? (
              <ul className="my-home-form__search-results" role="listbox">
                {searchResults.map((visitor) => (
                  <li key={visitor.id}>
                    <button
                      type="button"
                      className="my-home-form__search-option"
                      onClick={() => selectVisitorFromSearch(visitor)}
                    >
                      <span className="my-home-form__search-name">{visitor.name}</span>
                      {visitor.phone ? (
                        <span className="my-home-form__search-meta">{visitor.phone}</span>
                      ) : null}
                      {visitor.visitor_type ? (
                        <span className="my-home-form__search-type">{visitor.visitor_type}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {errors.name ? <span className="my-home-form__error">{errors.name}</span> : null}
        </div>

        <label className="my-home-form__field">
          <span className="my-home-form__label">Phone Number</span>
          <input
            type="tel"
            name="phone"
            className={`my-home-form__input${errors.phone ? ' my-home-form__input--error' : ''}`}
            value={form.phone}
            onChange={handleChange}
            disabled={mutation.isPending}
          />
          {errors.phone ? <span className="my-home-form__error">{errors.phone}</span> : null}
        </label>

        <label className="my-home-form__field">
          <span className="my-home-form__label">Visitor Type</span>
          <select
            name="visitorType"
            className={`my-home-form__input${errors.visitorType ? ' my-home-form__input--error' : ''}`}
            value={form.visitorType}
            onChange={handleChange}
            disabled={mutation.isPending}
          >
            <option value="" disabled>
              Select visitor type
            </option>
            {VISITOR_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.visitorType ? (
            <span className="my-home-form__error">{errors.visitorType}</span>
          ) : null}
        </label>

        <label className="my-home-form__field">
          <span className="my-home-form__label">Access Duration</span>
          <select
            name="duration"
            className="my-home-form__input"
            value={form.duration}
            onChange={handleChange}
            disabled={mutation.isPending}
          >
            {VISITOR_DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="my-home-form__field">
          <span className="my-home-form__label">Additional Notes (Optional)</span>
          <textarea
            name="notes"
            className="my-home-form__input my-home-form__input--area"
            placeholder="Any special instructions or information"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            maxLength={200}
            disabled={mutation.isPending}
          />
        </label>

        <button type="submit" className="my-home-detail__copy-btn" disabled={mutation.isPending}>
          {mutation.isPending ? 'Generating…' : 'Generate Access'}
        </button>
      </form>
    </Modal>
  )
}
