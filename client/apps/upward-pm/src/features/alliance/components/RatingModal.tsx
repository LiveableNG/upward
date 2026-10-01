'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Star,
  MessageSquare,
  AlertCircle,
  Award,
} from 'lucide-react'
import { useSubmitAllianceRating } from '../hooks/useAlliance'
import { AllianceReferral } from '../types/alliance.types'
import { useToast } from '@/components/common/Toast'

interface RatingModalProps {
  isOpen: boolean
  onClose: () => void
  referral: AllianceReferral
}

export function RatingModal({
  isOpen,
  onClose,
  referral,
}: RatingModalProps) {
  const toast = useToast()
  const submitRatingMutation = useSubmitAllianceRating()

  const [mounted, setMounted] = useState(false)
  const [score, setScore] = useState<number>(5)
  const [hoverScore, setHoverScore] = useState<number | null>(null)
  const [review, setReview] = useState<string>('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const handleReset = () => {
    setFormError(null)
    setReview('')
    setScore(5)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (score < 1 || score > 5) {
      setFormError('Please select a star rating between 1 and 5.')
      return
    }

    try {
      await submitRatingMutation.mutateAsync({
        referralUuid: referral.uuid,
        score,
        review: review.trim() || undefined,
      })
      toast.success('Rating submitted successfully!')
      handleReset()
    } catch (err: any) {
      const message = err.message || 'Failed to submit rating.'
      setFormError(message)
      toast.error(message)
    }
  }

  const activeRating = hoverScore !== null ? hoverScore : score

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={handleReset}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(234, 179, 8, 0.12)',
                color: '#eab308',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Rate Completed Relationship
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Share your review for this completed transaction
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {formError && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--danger)',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{formError}</span>
            </div>
          )}

          {/* Star Rating Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Select Overall Experience
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setScore(star)}
                  onMouseEnter={() => setHoverScore(star)}
                  onMouseLeave={() => setHoverScore(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    transition: 'transform 0.1s ease',
                  }}
                >
                  <Star
                    size={32}
                    fill={star <= activeRating ? '#eab308' : 'transparent'}
                    color={star <= activeRating ? '#eab308' : 'var(--text-muted)'}
                  />
                </button>
              ))}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#eab308' }}>
              {activeRating === 5 && 'Outstanding (5/5)'}
              {activeRating === 4 && 'Very Good (4/5)'}
              {activeRating === 3 && 'Average (3/5)'}
              {activeRating === 2 && 'Poor (2/5)'}
              {activeRating === 1 && 'Terrible (1/5)'}
            </div>
          </div>

          {/* Written Review */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
              <MessageSquare size={14} color="var(--text-muted)" />
              Written Review <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Prompt communication and smooth handover process."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '13px',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Modal Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={handleReset}
              className="btn btn--secondary"
              disabled={submitRatingMutation.isPending}
              style={{ height: '38px', padding: '0 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitRatingMutation.isPending}
              style={{
                height: '38px',
                padding: '0 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Star size={16} />
              <span>{submitRatingMutation.isPending ? 'Submitting...' : 'Submit Rating'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
