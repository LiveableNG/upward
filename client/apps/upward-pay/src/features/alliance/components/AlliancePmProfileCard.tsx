'use client';

import React from 'react';
import { ShieldCheck, Star, Award, Building2 } from 'lucide-react';
import { PublicPmProfile, PublicRatingSummary } from '../types/alliance.types';

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
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-white">
            <Building2 className="h-6 w-6 stroke-[1.75]" />
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              {roleLabel}
            </span>
            <div className="flex items-center gap-1.5">
              <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                {pm.displayName}
              </h4>
              {hasQualifications && (
                <span title="Verified Alliance Member" className="inline-flex items-center">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </span>
              )}
            </div>
            {pm.pmTitle && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {pm.pmTitle}
              </p>
            )}
          </div>
        </div>

        {/* Rating Score */}
        {totalRatings > 0 && ratingScore ? (
          <div className="flex items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>{ratingScore.toFixed(1)}</span>
            <span className="text-[10px] font-normal text-amber-600/80">
              ({totalRatings})
            </span>
          </div>
        ) : (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            Verified Partner
          </span>
        )}
      </div>

      {/* Bio */}
      {pm.bio && (
        <p className="mt-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
          {pm.bio}
        </p>
      )}

      {/* Qualification Badges */}
      {hasQualifications && (
        <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <span className="text-[11px] font-medium text-neutral-400">
            Active Qualifications & Credentials
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pm.qualifications.map((q) => (
              <div
                key={q.code}
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-200/60 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-700/60 dark:bg-neutral-800 dark:text-neutral-300"
              >
                <Award className="h-3 w-3 text-emerald-600" />
                <span>{q.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
