'use client'

import { AlertCircle, Clock, Home, Plus, XCircle } from 'lucide-react'
import { MockCase, PayRentMockFrame } from './PayRentMockFrame'
import './pay-rent-mock.css'

function Pill({
  tone,
  children,
}: {
  tone: 'overdue' | 'soon' | 'calm' | 'warn' | 'neutral' | 'ended'
  children: React.ReactNode
}) {
  return <span className={`pay-rent-mock__pill pay-rent-mock__pill--${tone}`}>{children}</span>
}

function PropertyCard({
  tone = 'default',
  pill,
  address,
  sub,
  amount,
  due,
  progress,
  progressLabel,
  statusLine,
  statusTone,
  cta,
  ctaVariant = 'primary',
  disabled,
}: {
  tone?: 'default' | 'urgent' | 'soon' | 'muted' | 'disabled'
  pill?: React.ReactNode
  address: string
  sub?: string
  amount?: string
  due?: string
  progress?: number
  progressLabel?: string
  statusLine?: string
  statusTone?: 'error' | 'warn' | 'neutral'
  cta?: string
  ctaVariant?: 'primary' | 'secondary'
  disabled?: boolean
}) {
  return (
    <div
      className={`pay-rent-mock__card${
        tone === 'urgent'
          ? ' pay-rent-mock__card--urgent'
          : tone === 'soon'
            ? ' pay-rent-mock__card--soon'
            : tone === 'muted'
              ? ' pay-rent-mock__card--muted'
              : tone === 'disabled'
                ? ' pay-rent-mock__card--disabled'
                : ''
      }`}
    >
      <div className="pay-rent-mock__card-top">
        <p className="pay-rent-mock__address">{address}</p>
        {pill}
      </div>
      {sub ? <p className="pay-rent-mock__sub">{sub}</p> : null}
      {statusLine ? (
        <p
          className={`pay-rent-mock__status-line${
            statusTone === 'error'
              ? ' pay-rent-mock__status-line--error'
              : statusTone === 'warn'
                ? ' pay-rent-mock__status-line--warn'
                : ' pay-rent-mock__status-line--neutral'
          }`}
        >
          {statusTone === 'error' ? <XCircle size={14} /> : statusTone === 'warn' ? <AlertCircle size={14} /> : <Clock size={14} />}
          {statusLine}
        </p>
      ) : null}
      {amount || due ? (
        <div className="pay-rent-mock__amount-row">
          {amount ? <span className="pay-rent-mock__amount">{amount}</span> : <span />}
          {due ? <span className="pay-rent-mock__due">{due}</span> : null}
        </div>
      ) : null}
      {typeof progress === 'number' ? (
        <>
          <div className="pay-rent-mock__progress">
            <div className="pay-rent-mock__progress-fill" style={{ width: `${progress}%` }} />
          </div>
          {progressLabel ? <p className="pay-rent-mock__progress-label">{progressLabel}</p> : null}
        </>
      ) : null}
      {cta ? (
        <button
          type="button"
          className={`pay-rent-mock__cta${
            disabled
              ? ' pay-rent-mock__cta--disabled'
              : ctaVariant === 'secondary'
                ? ' pay-rent-mock__cta--secondary'
                : ''
          }`}
          disabled={disabled}
        >
          {cta}
        </button>
      ) : null}
    </div>
  )
}

export default function PayRentMockPage() {
  return (
    <div className="pay-rent-mock">
      <div className="pay-rent-mock__intro">
        <h1>Pay Rent — UX mock (dev only)</h1>
        <p>
          Temporary catalog of all property-picker cases. Route: <code>/dev/pay-rent-mock</code>. Delete when
          design is finalized.
        </p>
      </div>

      <div className="pay-rent-mock__grid">
        <MockCase
          id="no-properties"
          title="1. No properties"
          conditions={[
            'profile.properties is empty or length === 0',
            'User has not linked any rental yet',
          ]}
          today="StepPropertySelect empty state — already works."
        >
          <PayRentMockFrame subtitle="Choose a property to pay rent and build your score.">
            <div className="pay-rent-mock__empty">
              <div className="pay-rent-mock__empty-icon">
                <Home size={32} />
              </div>
              <h3>No properties linked</h3>
              <p>Add your apartment to pay rent and start building your rental score.</p>
              <button type="button" className="pay-rent-mock__cta">
                Add Property
              </button>
            </div>
          </PayRentMockFrame>
        </MockCase>

        <MockCase
          id="invoice-due-soon"
          title="2. PM invoice — due soon"
          conditions={[
            'pendingPayments has item with status PENDING or PARTIAL',
            'new Date(due_date || dueDate) >= now',
            'amountPaid < total_amount',
            'No blocking latestProof (or proof not PENDING/REJECTED)',
            'On tap → router.push(/pay/{invoice.uuid})',
          ]}
          today="Shown in separate Pending Invoices section; property cards below look identical."
        >
          <PayRentMockFrame subtitle="1 invoice needs payment">
            <p className="pay-rent-mock__summary">₦100,000 outstanding · 1 property</p>
            <p className="pay-rent-mock__section-label">Needs attention</p>
            <div className="pay-rent-mock__card-list">
              <PropertyCard
                tone="soon"
                pill={<Pill tone="soon">Due Jul 15</Pill>}
                address="14 Admiralty Way, Lekki"
                sub="LTP LCC · UPWARD"
                amount="₦100,000"
                due="Invoice from PM"
                cta="Pay Now"
              />
            </div>
            <p className="pay-rent-mock__section-label pay-rent-mock__section-label--spaced">Not due yet</p>
            <PropertyCard
              tone="muted"
              pill={<Pill tone="calm">340 days</Pill>}
              address="3 Bourdillon, Ikoyi"
              sub="Private Landlord"
              amount="₦2,400,000/yr"
              due="Due May 2027"
              cta="Pay Early"
              ctaVariant="secondary"
            />
          </PayRentMockFrame>
        </MockCase>

        <MockCase
          id="invoice-overdue"
          title="3. PM invoice — overdue"
          conditions={[
            'pendingPayments item: status PENDING or PARTIAL',
            'new Date(due_date || dueDate) < now',
            'remaining = total_amount - amountPaid > 0',
            'Dashboard sorts overdue invoices first',
          ]}
          today="Pending section shows DUE badge; no overdue styling on property row."
        >
          <PayRentMockFrame subtitle="₦100,000 overdue at 1 property">
            <p className="pay-rent-mock__section-label">Needs attention</p>
            <PropertyCard
              tone="urgent"
              pill={<Pill tone="overdue">Overdue</Pill>}
              address="14 Admiralty Way, Lekki"
              sub="LTP LCC · UPWARD"
              amount="₦100,000"
              due="Was due Jul 1"
              cta="Pay Now"
            />
          </PayRentMockFrame>
        </MockCase>

        <MockCase
          id="invoice-partial"
          title="4. PM invoice — partially paid"
          conditions={[
            'pendingPayments item: amountPaid > 0',
            'amountPaid < total_amount',
            'remaining = total_amount - amountPaid',
            'ActionCarousel label: Balance Remaining',
          ]}
          today="Amount shown in pending meta only — no progress bar."
        >
          <PayRentMockFrame subtitle="Balance remaining on an invoice">
            <PropertyCard
              tone="soon"
              pill={<Pill tone="soon">Due Jul 15</Pill>}
              address="14 Admiralty Way, Lekki"
              sub="LTP LCC · UPWARD"
              amount="₦60,000 remaining"
              due="Due Jul 15"
              progress={40}
              progressLabel="40% paid · ₦40,000 of ₦100,000"
              cta="Pay ₦60,000"
            />
          </PayRentMockFrame>
        </MockCase>

        <MockCase
          id="proof-review"
          title="5. Proof in review"
          conditions={[
            'pendingPayments item has latestProof',
            'latestProof.status === PENDING',
            'Payment not complete until proof approved',
          ]}
          today="Only surfaced on dashboard ActionCarousel — not on pay-rent page."
        >
          <PayRentMockFrame subtitle="Waiting on proof verification">
            <PropertyCard
              tone="disabled"
              pill={<Pill tone="neutral">In review</Pill>}
              address="14 Admiralty Way, Lekki"
              sub="LTP LCC · UPWARD"
              amount="₦100,000"
              due="Due Jul 15"
              statusLine="Payment proof is being reviewed"
              statusTone="neutral"
              cta="Reviewing…"
              disabled
            />
          </PayRentMockFrame>
        </MockCase>

        <MockCase
          id="proof-rejected"
          title="6. Proof rejected"
          conditions={[
            'pendingPayments item has latestProof',
            'latestProof.status === REJECTED',
            'User must re-upload proof or pay online',
          ]}
          today="Dashboard rent-due label = Proof Rejected — not on pay-rent page."
        >
          <PayRentMockFrame subtitle="Action needed on a payment">
            <PropertyCard
              tone="urgent"
              pill={<Pill tone="overdue">Rejected</Pill>}
              address="14 Admiralty Way, Lekki"
              sub="LTP LCC · UPWARD"
              amount="₦100,000"
              due="Due Jul 15"
              statusLine="Proof rejected — re-upload or pay online"
              statusTone="error"
              cta="Try Again"
            />
          </PayRentMockFrame>
        </MockCase>

        <MockCase
          id="property-overdue"
          title="7. Property overdue — no invoice"
          conditions={[
            'prop.rentEndDate exists and rentEndDate <= now',
            'prop.isPastTenancy === false',
            'No pending payment where userPropertyUuid === prop.uuid',
            'dashboard/page.tsx propertyReminders fires',
          ]}
          today="Dashboard shows Rent Overdue reminder — pay-rent card has no overdue signal."
        >
          <PayRentMockFrame subtitle="Rent overdue at 1 property">
            <PropertyCard
              tone="urgent"
              pill={<Pill tone="overdue">Overdue</Pill>}
              address="14 Admiralty Way, Lekki"
              sub="LTP LCC · UPWARD"
              amount="₦100,000"
              due="Due Jul 10, 2026"
              statusLine="rentEndDate passed · no PM invoice"
              statusTone="error"
              cta="Pay Rent"
            />
          </PayRentMockFrame>
        </MockCase>

        <MockCase
          id="due-soon"
          title="8. Property due soon"
          conditions={[
            'prop.isPastTenancy === false',
            'prop.rentEndDate exists',
            'daysUntil(rentEndDate) >= 0 and within soon threshold (e.g. ≤ 30 days)',
            'No active pending invoice for this property',
            'Dashboard getRentDue picks nearest upcoming rentEndDate',
          ]}
          today="Due-in-X-days not shown on pay-rent page at all."
        >
          <PayRentMockFrame subtitle="Rent due soon at 1 property">
            <PropertyCard
              tone="soon"
              pill={<Pill tone="soon">12 days</Pill>}
              address="14 Admiralty Way, Lekki"
              sub="LTP LCC · UPWARD"
              amount="₦100,000"
              due="Due Jul 22, 2026"
              cta="Pay Rent"
            />
          </PayRentMockFrame>
        </MockCase>

        <MockCase
          id="not-due"
          title="9. Not due yet (~365 days)"
          conditions={[
            'prop.rentEndDate is far in the future (e.g. daysUntil > 30)',
            'amountRemaining === rentAmount (nothing paid yet) or no urgency',
            'No pending invoice for property',
            'Example: rentEndDate Jul 2027, today Jul 2026 → ~364 days',
          ]}
          today="Looks identical to overdue property — no date or calm state shown."
        >
          <PayRentMockFrame subtitle="Choose a property to pay">
            <p className="pay-rent-mock__section-label">Up to date</p>
            <PropertyCard
              tone="muted"
              pill={<Pill tone="calm">364 days</Pill>}
              address="14 Admiralty Way, Lekki"
              sub="LTP LCC · UPWARD · ₦100,000/yr"
              due="Next due Jul 10, 2027"
              cta="Pay Early"
              ctaVariant="secondary"
            />
            <button type="button" className="pay-rent-mock__add-link">
              <Plus size={16} />
              Add another property
            </button>
          </PayRentMockFrame>
        </MockCase>

        <MockCase
          id="balance-remaining"
          title="10. Balance remaining (no invoice)"
          conditions={[
            'prop.amountRemaining > 0 on property object',
            'prop.amountPaid > 0',
            'No pending payment linked to prop.uuid',
            'Amount source: rentAmount - amountPaid (API)',
          ]}
          today="amountRemaining exists in API — not displayed on pay-rent page."
        >
          <PayRentMockFrame subtitle="Partial rent paid on property">
            <PropertyCard
              tone="soon"
              pill={<Pill tone="soon">Due Jul 22</Pill>}
              address="14 Admiralty Way, Lekki"
              sub="LTP LCC · UPWARD"
              amount="₦40,000 remaining"
              due="Due Jul 22"
              progress={60}
              progressLabel="60% paid · ₦60,000 of ₦100,000"
              cta="Pay ₦40,000"
            />
          </PayRentMockFrame>
        </MockCase>

        <MockCase
          id="fully-paid"
          title="11. Fully paid for period"
          conditions={[
            'prop.amountRemaining === 0',
            'prop.rentEndDate still in the future',
            'No outstanding pending invoice',
          ]}
          today="Same card as everything else — no paid/up-to-date state."
        >
          <PayRentMockFrame subtitle="Nothing due right now">
            <p className="pay-rent-mock__section-label">Up to date</p>
            <PropertyCard
              tone="muted"
              pill={<Pill tone="calm">Paid</Pill>}
              address="14 Admiralty Way, Lekki"
              sub="LTP LCC · UPWARD"
              due="Next due Jul 10, 2027"
              statusLine="Rent paid for this period"
              statusTone="neutral"
            />
          </PayRentMockFrame>
        </MockCase>

        <MockCase
          id="past-tenancy"
          title="12. Past tenancy"
          conditions={[
            'prop.isPastTenancy === true',
            'On select → RenewalModal opens',
            'Filtered out of dashboard upcoming rent logic',
          ]}
          today="Renewal modal works on tap — card does not warn before tap."
        >
          <PayRentMockFrame subtitle="Lease ended — renew to continue">
            <PropertyCard
              tone="muted"
              pill={<Pill tone="ended">Lease ended</Pill>}
              address="14 Admiralty Way, Lekki"
              sub="LTP LCC · UPWARD"
              statusLine="Renew before you can pay rent"
              statusTone="warn"
              cta="Renew Lease"
              ctaVariant="secondary"
            />
          </PayRentMockFrame>
        </MockCase>

        <MockCase
          id="no-payout"
          title="13. No payout route"
          conditions={[
            'propertyHasPayoutRoute(prop) === false',
            '!subaccount && !dedicatedAccount && !manualAccount && !isVerified',
            'On select → step new (StepNewLandlord / bank details)',
          ]}
          today="User only discovers missing bank details after tapping the card."
        >
          <PayRentMockFrame subtitle="Bank details needed before paying">
            <PropertyCard
              tone="soon"
              pill={<Pill tone="warn">5 days</Pill>}
              address="14 Admiralty Way, Lekki"
              sub="Private Landlord"
              amount="₦100,000"
              due="Due Jul 15"
              statusLine="Bank details needed to pay"
              statusTone="warn"
              cta="Add Payment Details"
              ctaVariant="secondary"
            />
          </PayRentMockFrame>
        </MockCase>

        <MockCase
          id="mixed"
          title="14. Multiple properties — mixed urgency"
          conditions={[
            'User has 2+ properties in different states',
            'Sort: overdue invoice → overdue property → due soon → not due → paid',
            'Group into Needs attention vs Not due yet',
            'Pending invoice takes priority over rentEndDate for same property',
          ]}
          today="Pending invoices on top; all property cards flat with no grouping or sort."
        >
          <PayRentMockFrame subtitle="₦160,000 due across 2 homes">
            <p className="pay-rent-mock__summary">Sorted by urgency: overdue → due soon → not due</p>
            <p className="pay-rent-mock__section-label">Needs attention</p>
            <div className="pay-rent-mock__card-list">
              <PropertyCard
                tone="urgent"
                pill={<Pill tone="overdue">Overdue</Pill>}
                address="14 Admiralty Way, Lekki"
                sub="LTP LCC · UPWARD"
                amount="₦100,000"
                due="Was due Jul 1"
                cta="Pay Now"
              />
              <PropertyCard
                tone="soon"
                pill={<Pill tone="soon">12 days</Pill>}
                address="8 Ozumba Mbadiwe, VI"
                sub="Coastal PM"
                amount="₦60,000"
                due="Due Jul 22"
                cta="Pay Rent"
              />
            </div>
            <p className="pay-rent-mock__section-label pay-rent-mock__section-label--spaced">Not due yet</p>
            <PropertyCard
              tone="muted"
              pill={<Pill tone="calm">340 days</Pill>}
              address="3 Bourdillon, Ikoyi"
              sub="Private Landlord"
              amount="₦2,400,000/yr"
              due="Due May 2027"
            />
            <button type="button" className="pay-rent-mock__add-link">
              <Plus size={16} />
              Add property
            </button>
          </PayRentMockFrame>
        </MockCase>
      </div>
    </div>
  )
}
