'use client';

import React from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { SubscriptionTier } from '@/features/pm/types/subscription';

interface PlanSelectionCardProps {
  selectedTier: 'TIER_2' | 'TIER_3';
  onSelectTier: (tier: 'TIER_2' | 'TIER_3') => void;
  unitCount: number;
  currentSubscriptionTier?: SubscriptionTier;
  isInitialDepositPaid?: boolean;
}

export function PlanSelectionCard({
  selectedTier,
  onSelectTier,
  unitCount,
  currentSubscriptionTier,
  isInitialDepositPaid,
}: PlanSelectionCardProps) {
  const isCurrentPro = currentSubscriptionTier === 'TIER_2' && isInitialDepositPaid;
  const isCurrentEnt = currentSubscriptionTier === 'TIER_3' && isInitialDepositPaid;

  const proYearlyTotal = unitCount * 1500;
  const entYearlyTotal = unitCount * 2250;

  return (
    <div className="plan-selection-section">
      <div className="plan-selection-header">
        <h2 className="plan-selection-title">Choose your plan</h2>
        <p className="plan-selection-subtitle">
          Select the subscription tier that best fits your property management operation.
        </p>
      </div>

      <div className="plan-selection-grid">
        {/* Tier 2: Professional Card */}
        <div
          className={`plan-card ${selectedTier === 'TIER_2' ? 'plan-card--selected' : ''}`}
          onClick={() => onSelectTier('TIER_2')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectTier('TIER_2');
            }
          }}
          aria-pressed={selectedTier === 'TIER_2'}
        >
          <div className="plan-card__top">
            <div className="plan-card__identity">
              <div className="plan-card__name-row">
                <h3 className="plan-card__name">Professional</h3>
                <span className="plan-card__tier-pill">Tier 2</span>
              </div>
              {isCurrentPro ? (
                <span className="plan-card__badge plan-card__badge--current">
                  Your Current Plan
                </span>
              ) : isCurrentEnt ? (
                <span className="plan-card__badge plan-card__badge--downgrade">
                  Downgrade Option
                </span>
              ) : null}
            </div>
            <p className="plan-card__tagline">
              Best for professional property managers scaling their business operations.
            </p>
          </div>

          <div className="plan-card__pricing">
            <div className="plan-card__rate">
              <span className="plan-card__rate-amount">₦1,500</span>
              <span className="plan-card__rate-unit">/ unit / year</span>
            </div>
            <div className="plan-card__calc-text">
              ₦{proYearlyTotal.toLocaleString()} / year for {unitCount} {unitCount === 1 ? 'unit' : 'units'}
            </div>
          </div>

          <div className="plan-card__divider" />

          <div className="plan-card__features">
            <span className="plan-card__features-heading">Included in Professional:</span>
            <ul className="plan-card__feature-list">
              <li>
                <Check size={14} className="plan-card__check" />
                <span>Automated Rent Receipts via Email</span>
              </li>
              <li>
                <Check size={14} className="plan-card__check" />
                <span>Tenancy Data Upload & Portfolio Tracking</span>
              </li>
              <li>
                <Check size={14} className="plan-card__check" />
                <span>Rent Collection & Due Date Reminders</span>
              </li>
              <li>
                <Check size={14} className="plan-card__check" />
                <span>Document Management & Lease Templates</span>
              </li>
              <li>
                <Check size={14} className="plan-card__check" />
                <span>Service Charge Tracking & Payments</span>
              </li>
              <li>
                <Check size={14} className="plan-card__check" />
                <span>Listing & Brokerage (up to 30% vacancy)</span>
              </li>
            </ul>
          </div>

          <div className="plan-card__action-wrap">
            {selectedTier === 'TIER_2' ? (
              <div className="plan-card__status-btn plan-card__status-btn--selected">
                <Check size={15} />
                <span>Selected</span>
              </div>
            ) : (
              <button
                type="button"
                className="plan-card__status-btn plan-card__status-btn--selectable"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTier('TIER_2');
                }}
              >
                <span>Select Professional</span>
              </button>
            )}
          </div>
        </div>

        {/* Tier 3: Enterprise Card */}
        <div
          className={`plan-card plan-card--enterprise ${selectedTier === 'TIER_3' ? 'plan-card--selected' : ''}`}
          onClick={() => onSelectTier('TIER_3')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectTier('TIER_3');
            }
          }}
          aria-pressed={selectedTier === 'TIER_3'}
        >
          <div className="plan-card__top">
            <div className="plan-card__identity">
              <div className="plan-card__name-row">
                <h3 className="plan-card__name">Enterprise</h3>
                <span className="plan-card__tier-pill plan-card__tier-pill--tier3">Tier 3</span>
              </div>
              {isCurrentEnt ? (
                <span className="plan-card__badge plan-card__badge--current">
                  Your Current Plan
                </span>
              ) : isCurrentPro ? (
                <span className="plan-card__badge plan-card__badge--promo">
                  Upgrade (25% Off)
                </span>
              ) : (
                <span className="plan-card__badge plan-card__badge--promo">
                  25% Promo Discount
                </span>
              )}
            </div>
            <p className="plan-card__tagline">
              Designed for large-scale portfolios with complete feature capabilities and branding.
            </p>
          </div>

          <div className="plan-card__pricing">
            <div className="plan-card__rate">
              <span className="plan-card__rate-strikethrough">₦3,000</span>
              <span className="plan-card__rate-amount">₦2,250</span>
              <span className="plan-card__rate-unit">/ unit / year</span>
            </div>
            <div className="plan-card__calc-text">
              ₦{entYearlyTotal.toLocaleString()} / year for {unitCount} {unitCount === 1 ? 'unit' : 'units'}
            </div>
          </div>

          <div className="plan-card__divider" />

          <div className="plan-card__features">
            <span className="plan-card__features-heading">Everything in Professional, plus:</span>
            <ul className="plan-card__feature-list">
              <li>
                <Check size={14} className="plan-card__check" />
                <span>Rent Collection Reports & Dashboards</span>
              </li>
              <li>
                <Check size={14} className="plan-card__check" />
                <span>Team Activity Tracking & Audit Logs</span>
              </li>
              <li>
                <Check size={14} className="plan-card__check" />
                <span>Full Branding & White-labelled PDF Receipts</span>
              </li>
              <li>
                <Check size={14} className="plan-card__check" />
                <span>100% Unlimited Listing & Brokerage Capacity</span>
              </li>
              <li>
                <Check size={14} className="plan-card__check" />
                <span>Multi-Manager Company Scope & Permissions</span>
              </li>
            </ul>
          </div>

          <div className="plan-card__action-wrap">
            {selectedTier === 'TIER_3' ? (
              <div className="plan-card__status-btn plan-card__status-btn--selected">
                <Check size={15} />
                <span>Selected</span>
              </div>
            ) : (
              <button
                type="button"
                className="plan-card__status-btn plan-card__status-btn--selectable"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTier('TIER_3');
                }}
              >
                <span>Select Enterprise</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
