'use client';

import React from 'react';
import { ShieldCheck, Star, Award, Building2 } from 'lucide-react';
import type { PublicPmProfile, PublicRatingSummary } from '../types/alliance.types';

interface AlliancePmProfileCardProps {
  pm: PublicPmProfile;
  ratingSummary?: PublicRatingSummary;
  roleLabel?: string;
}

export const AlliancePmProfileCard: React.FC<AlliancePmProfileCardProps> = ({
  pm,
  ratingSummary,
  roleLabel = 'Listing Property Manager',
}) => {
  const hasQualifications = (pm.qualifications || []).length > 0;
  const ratingScore = ratingSummary?.averageScore;
  const totalRatings = ratingSummary?.totalRatings || 0;

  return (
    <div className="pay-alliance-pm-card">
      {/* Header */}
      <div className="pay-alliance-pm-card__header">
        <div className="pay-alliance-pm-card__profile">
          {/* Avatar Icon */}
          <div className="pay-alliance-pm-card__avatar">
            <Building2 size={24} />
          </div>

          <div>
            <span className="pay-alliance-pm-card__role">{roleLabel}</span>
            <div className="pay-alliance-pm-card__name">
              <span>{pm.displayName}</span>
              {hasQualifications && (
                <span title="Verified Alliance Member" style={{ display: 'inline-flex' }}>
                  <ShieldCheck size={16} style={{ color: '#16a34a' }} />
                </span>
              )}
            </div>
            {pm.pmTitle && (
              <p className="pay-alliance-pm-card__title">{pm.pmTitle}</p>
            )}
          </div>
        </div>

        {/* Rating Score */}
        {totalRatings > 0 && ratingScore ? (
          <div className="pay-alliance-pm-card__rating-pill">
            <Star size={13} style={{ fill: '#d97706', color: '#d97706' }} />
            <span>{ratingScore.toFixed(1)}</span>
            <span style={{ fontSize: '11px', fontWeight: 500, opacity: 0.8 }}>
              ({totalRatings})
            </span>
          </div>
        ) : (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              background: 'rgba(22, 163, 74, 0.1)',
              color: '#16a34a',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            Verified Partner
          </span>
        )}
      </div>

      {/* Bio */}
      {pm.bio && <p className="pay-alliance-pm-card__bio">{pm.bio}</p>}

      {/* Qualification Badges */}
      {hasQualifications && (
        <div>
          <span
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            Active Credentials & Licenses
          </span>
          <div className="pay-alliance-pm-card__credentials">
            {pm.qualifications.map((q) => (
              <div key={q.code} className="pay-alliance-pm-card__credential-chip">
                <Award size={13} style={{ color: 'var(--clay)' }} />
                <span>{q.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
