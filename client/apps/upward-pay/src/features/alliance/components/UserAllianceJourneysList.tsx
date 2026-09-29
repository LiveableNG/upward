'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  Bed,
  Bath,
  ArrowUpRight,
  Star,
  UserCheck,
  ShieldCheck,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useUserAllianceJourneys } from '../hooks/useAllianceMarketplace';
import { AllianceRatingModal } from './AllianceRatingModal';
import { getAllianceListingImage, ALLIANCE_REAL_ESTATE_PLACEHOLDERS } from '../utils/allianceImages';
import type { UserAllianceJourney } from '../types/alliance.types';

interface UserAllianceJourneysListProps {
  onExploreClick?: () => void;
}

export const UserAllianceJourneysList: React.FC<UserAllianceJourneysListProps> = ({
  onExploreClick,
}) => {
  const { data: journeys, isLoading, isError, error, refetch } = useUserAllianceJourneys();

  const [ratingModalState, setRatingModalState] = useState<{
    isOpen: boolean;
    referralUuid: string;
    pmName: string;
  }>({
    isOpen: false,
    referralUuid: '',
    pmName: '',
  });

  const formatPrice = (amount?: number | null, currency = 'NGN') => {
    if (amount === undefined || amount === null) return 'Price on Request';
    const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '₦';
    return `${symbol}${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="pay-alliance-journey-card" style={{ padding: '24px' }}>
            <div className="pay-alliance-skeleton__line" style={{ width: '40%', height: '24px', marginBottom: '16px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '16px' }}>
              <div className="pay-alliance-skeleton__media" style={{ height: '90px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="pay-alliance-skeleton__line" style={{ width: '75%' }} />
                <div className="pay-alliance-skeleton__line" style={{ width: '40%' }} />
              </div>
            </div>
            <div className="pay-alliance-skeleton__line" style={{ height: '56px', marginTop: '16px', borderRadius: '12px' }} />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="pay-alliance-empty" style={{ borderColor: '#fca5a5' }}>
        <div className="pay-alliance-empty__icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
          <AlertCircle size={28} />
        </div>
        <h3 className="pay-alliance-empty__title" style={{ color: '#991b1b' }}>
          Unable to Load Your Recommendations
        </h3>
        <p className="pay-alliance-empty__desc">
          {(error as any)?.message || 'Something went wrong while loading your property journeys.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="pay-alliance-empty__btn"
          style={{ background: '#dc2626' }}
        >
          Try Again
        </button>
      </div>
    );
  }

  const items = journeys || [];

  if (items.length === 0) {
    return (
      <div className="pay-alliance-empty">
        <div className="pay-alliance-empty__icon">
          <Building2 size={28} />
        </div>
        <h3 className="pay-alliance-empty__title">No Recommended Properties Yet</h3>
        <p className="pay-alliance-empty__desc">
          When a partner agent or property manager shares an exclusive property opportunity with you, or when you place an inquiry, you can track the entire viewing, inspection, and deal progression right here!
        </p>
        {onExploreClick && (
          <button
            type="button"
            onClick={onExploreClick}
            className="pay-alliance-empty__btn"
          >
            Explore Verified Properties
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {items.map((journey) => {
        const listing = journey.listing;
        const referringPm = journey.referringPm;

        return (
          <div key={journey.referralUuid} className="pay-alliance-journey-card">
            {/* Journey Header: Referring PM Info */}
            <div className="pay-alliance-journey-header">
              <div className="pay-alliance-journey-pm-info">
                <div className="pay-alliance-journey-pm-avatar">
                  {referringPm.displayName ? referringPm.displayName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text)' }}>
                      {referringPm.displayName}
                    </span>
                    <ShieldCheck size={15} style={{ color: '#16a34a' }} />
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    {referringPm.companyName ? `${referringPm.companyName} • ` : ''}Partner Agent Referral
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div
                style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  background:
                    journey.stage === 'CONVERTED'
                      ? 'rgba(22, 163, 74, 0.12)'
                      : journey.stage === 'LOST'
                      ? 'rgba(100, 116, 139, 0.12)'
                      : 'rgba(217, 119, 87, 0.12)',
                  color:
                    journey.stage === 'CONVERTED'
                      ? '#16a34a'
                      : journey.stage === 'LOST'
                      ? '#64748b'
                      : 'var(--clay)',
                }}
              >
                {journey.stageLabel}
              </div>
            </div>

            {/* Journey Body */}
            <div className="pay-alliance-journey-body">
              {/* Property Summary Row */}
              <div className="pay-alliance-journey-property-grid">
                <img
                  src={getAllianceListingImage({ primaryMedia: listing.media?.[0], media: listing.media, uuid: listing.uuid })}
                  alt={listing.title}
                  className="pay-alliance-journey-property-img"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = ALLIANCE_REAL_ESTATE_PLACEHOLDERS[0];
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: listing.intent === 'SALE' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(10, 10, 15, 0.06)',
                        color: listing.intent === 'SALE' ? '#16a34a' : 'var(--text)',
                      }}
                    >
                      {listing.intent === 'SALE' ? 'For Sale' : 'For Rent'}
                    </span>
                    {listing.propertyType && (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {listing.propertyType}
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: 'var(--text)',
                      margin: '2px 0 0 0',
                      lineHeight: 1.3,
                    }}
                  >
                    {listing.title}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <MapPin size={13} style={{ color: 'var(--clay)' }} />
                    <span>
                      {[listing.address, listing.city, listing.state].filter(Boolean).join(', ') ||
                        'Location details available'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>
                      {formatPrice(listing.price, listing.currency)}
                    </span>
                    {listing.intent === 'RENT' && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ yr</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Visual Live Stage Progression Stepper */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-muted)' }}>
                    Live Stage Progression
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Updated {new Date(journey.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="pay-alliance-stepper">
                  {journey.stages.map((st, idx) => (
                    <div key={st.key} className="pay-alliance-step-item">
                      <div
                        className={`pay-alliance-step-circle ${
                          st.isCompleted && !st.isCurrent
                            ? 'pay-alliance-step-circle--completed'
                            : st.isCurrent
                            ? 'pay-alliance-step-circle--current'
                            : 'pay-alliance-step-circle--upcoming'
                        }`}
                      >
                        {st.isCompleted && !st.isCurrent ? <CheckCircle2 size={16} /> : idx + 1}
                      </div>
                      <div>
                        <span
                          className={`pay-alliance-step-label ${
                            !st.isCompleted && !st.isCurrent
                              ? 'pay-alliance-step-label--upcoming'
                              : ''
                          }`}
                        >
                          {st.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Explanation Banner */}
              <div className="pay-alliance-journey-status-banner">
                <Clock size={16} style={{ color: 'var(--clay)', flexShrink: 0 }} />
                <span>
                  <strong>Current Stage:</strong> {journey.stageDescription}
                </span>
              </div>

              {/* Notes from PM (if any) */}
              {journey.notes && (
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '12.5px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.5',
                  }}
                >
                  <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '2px' }}>
                    Manager Updates & Notes:
                  </strong>
                  {journey.notes}
                </div>
              )}

              {/* Actions Footer */}
              <div className="pay-alliance-journey-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Link
                    href={`/dashboard/alliance/${listing.uuid}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      background: 'var(--dark, #0a0a0f)',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <span>View Property Details</span>
                    <ArrowUpRight size={14} />
                  </Link>
                </div>

                {/* Rating Button */}
                <div>
                  {!journey.hasRated && (journey.stage === 'VIEWING' || journey.stage === 'APPLICATION' || journey.stage === 'CONVERTED') && (
                    <button
                      type="button"
                      onClick={() =>
                        setRatingModalState({
                          isOpen: true,
                          referralUuid: journey.referralUuid,
                          pmName: referringPm.displayName,
                        })
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: '1px solid #fde68a',
                        background: '#fffbeb',
                        color: '#b45309',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Star size={14} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
                      <span>Rate Partner Experience</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Rating Modal */}
      {ratingModalState.isOpen && (
        <AllianceRatingModal
          isOpen={ratingModalState.isOpen}
          onClose={() =>
            setRatingModalState({ isOpen: false, referralUuid: '', pmName: '' })
          }
          referralUuid={ratingModalState.referralUuid}
          pmName={ratingModalState.pmName}
        />
      )}
    </div>
  );
};
