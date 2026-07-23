'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  BedDouble,
  Calendar,
  Eye,
  EyeOff,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { Spinner } from '@/components/common/Spinner'
import {
  TENANT_HOME_REQUEST_PAGE_COPY,
  TENANT_HOME_REQUEST_STATUS_LABELS,
} from '@/features/pm/constants/tenantHomeRequests'
import {
  getHomeRequest,
  revealHomeRequestContact,
  type PmHomeRequest,
} from '@/features/pm/services/homeRequestService'
import {
  formatPropertyTypes,
  formatTenantHomeRequestBudget,
  formatTenantHomeRequestLocation,
  statusLabelKey,
} from '@/features/pm/utils/tenantHomeRequests'
import '@/styles/home-requests.css'

function whatsappHref(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '')
  const normalized = digits.startsWith('0') ? `234${digits.slice(1)}` : digits
  return `https://wa.me/${normalized}`
}

export function TenantHomeRequestDetailPage({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [request, setRequest] = useState<PmHomeRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [revealing, setRevealing] = useState(false)
  const [error, setError] = useState('')
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      setLoadFailed(false)
      try {
        const data = await getHomeRequest(requestId)
        if (!cancelled) setRequest(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load request')
          setLoadFailed(true)
          setRequest(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [requestId, reloadToken])

  const handleRetryLoad = useCallback(() => setReloadToken((n) => n + 1), [])

  const handleReveal = async () => {
    if (!request || revealing) return
    setRevealing(true)
    setError('')
    try {
      const updated = await revealHomeRequestContact(request.uuid)
      setRequest(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal contact')
    } finally {
      setRevealing(false)
    }
  }

  if (loading) {
    return (
      <div className="home-requests-view animate-fade-in">
        <PageHeader title={TENANT_HOME_REQUEST_PAGE_COPY.detailTitle} showBack />
        <div className="home-requests-empty home-requests-empty--loading">
          <Spinner size={28} />
          <p>Loading request…</p>
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="home-requests-view animate-fade-in">
        <PageHeader title={TENANT_HOME_REQUEST_PAGE_COPY.detailTitle} showBack />
        <div className="home-requests-empty home-requests-empty--error">
          <h2>{loadFailed ? 'Couldn’t load request' : 'Request not found'}</h2>
          <p>{error || 'This home request may have been removed.'}</p>
          <div className="home-request-actions">
            {loadFailed && (
              <button type="button" className="btn btn--secondary" onClick={handleRetryLoad}>
                <RefreshCw size={16} />
                Try again
              </button>
            )}
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => router.push('/home-requests')}
            >
              Back to Home Requests
            </button>
          </div>
        </div>
      </div>
    )
  }

  const status = statusLabelKey(request.status)
  const contact = request.contact
  const propertyTypes = formatPropertyTypes(request.propertyTypes)

  return (
    <div className="home-requests-view home-requests-view--detail animate-fade-in">
      <PageHeader
        title={request.displayName}
        subtitle={`${request.beds} bed · ${propertyTypes} · ${formatTenantHomeRequestBudget(
          request.budgetMin,
          request.budgetMax,
        )}`}
        showBack
        actions={
          <span className={`home-request-status home-request-status--${status}`}>
            {TENANT_HOME_REQUEST_STATUS_LABELS[status]}
          </span>
        }
      />

      {error ? <div className="home-requests-error">{error}</div> : null}

      <div className="home-request-detail-layout">
        <div className="home-request-detail-main">
          <section className="home-request-panel home-request-panel--summary">
            <div className="home-request-summary-hero">
              <div className="home-request-summary-hero__icon" aria-hidden>
                <Home size={22} />
              </div>
              <div>
                <p className="home-request-summary-hero__eyebrow">Search brief</p>
                <h2 className="home-request-summary-hero__title">
                  {formatTenantHomeRequestLocationsLabel(request)}
                </h2>
              </div>
            </div>

            <div className="home-request-metric-grid">
              <div className="home-request-metric">
                <span className="home-request-metric__label">
                  <BedDouble size={14} /> Bedrooms
                </span>
                <strong>{request.beds}</strong>
              </div>
              <div className="home-request-metric">
                <span className="home-request-metric__label">
                  <Wallet size={14} /> Budget / year
                </span>
                <strong>{formatTenantHomeRequestBudget(request.budgetMin, request.budgetMax)}</strong>
              </div>
              <div className="home-request-metric">
                <span className="home-request-metric__label">
                  <Calendar size={14} /> Move-in
                </span>
                <strong>
                  {request.moveInDate
                    ? format(new Date(request.moveInDate), 'MMM d, yyyy')
                    : 'Flexible'}
                </strong>
              </div>
              <div className="home-request-metric">
                <span className="home-request-metric__label">
                  <Home size={14} /> Property type
                </span>
                <strong>{propertyTypes}</strong>
              </div>
            </div>
          </section>

          <section className="home-request-panel">
            <h2 className="home-request-panel__title">
              <MapPin size={14} /> Preferred locations
            </h2>
            <ul className="home-request-locations">
              {request.locations.map((location) => (
                <li key={`${location.state}|${location.area}|${location.subArea || ''}`}>
                  <span className="home-request-locations__area">
                    {formatTenantHomeRequestLocation(location)}
                  </span>
                  <em>{location.state}</em>
                </li>
              ))}
            </ul>
          </section>

          {(request.amenities.length > 0 || request.notes) && (
            <section className="home-request-panel">
              {request.amenities.length > 0 ? (
                <div className="home-request-block">
                  <h2 className="home-request-panel__title">
                    <Sparkles size={14} /> Amenities
                  </h2>
                  <div className="home-request-chips">
                    {request.amenities.map((amenity) => (
                      <span key={amenity} className="home-request-chip">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {request.notes ? (
                <div className={`home-request-block${request.amenities.length ? ' home-request-block--spaced' : ''}`}>
                  <h2 className="home-request-panel__title">Notes</h2>
                  <p className="home-request-notes-text">{request.notes}</p>
                </div>
              ) : null}
            </section>
          )}

          <p className="home-request-submitted">
            Submitted {format(new Date(request.submittedAt), 'MMM d, yyyy · h:mm a')}
          </p>
        </div>

        <aside className="home-request-detail-side">
          <section className="home-request-panel home-request-panel--contact">
            <h2 className="home-request-panel__title">Prospect contact</h2>

            <div className="home-request-tenant">
              <div
                className={`home-request-tenant__avatar${
                  contact ? ' home-request-tenant__avatar--open' : ''
                }`}
              >
                {contact ? <Eye size={22} /> : <EyeOff size={22} />}
              </div>
              <div>
                <h3>{request.displayName}</h3>
                {contact ? (
                  <>
                    <p>{contact.email}</p>
                    <p>{contact.phone}</p>
                  </>
                ) : (
                  <p className="home-request-contact-hidden">
                    {TENANT_HOME_REQUEST_PAGE_COPY.contactHidden}
                  </p>
                )}
              </div>
            </div>

            <div className="home-request-reveal-meta">
              <Users size={15} aria-hidden />
              <span>
                {request.contactRevealCount} PM
                {request.contactRevealCount === 1 ? '' : 's'} revealed contact
              </span>
            </div>

            <div className="home-request-contact-actions">
              {contact ? (
                <>
                  <p className="home-request-action-hint">
                    {TENANT_HOME_REQUEST_PAGE_COPY.contactRevealed}
                  </p>
                  <a
                    className="btn btn--primary home-request-contact-cta"
                    href={whatsappHref(contact.phone)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={16} />
                    Message on WhatsApp
                  </a>
                  <a className="btn btn--secondary home-request-contact-cta" href={`mailto:${contact.email}`}>
                    <Mail size={16} />
                    Send email
                  </a>
                </>
              ) : (
                <>
                  <p className="home-request-action-hint">
                    {TENANT_HOME_REQUEST_PAGE_COPY.revealHint}
                  </p>
                  <button
                    type="button"
                    className="btn btn--primary home-request-contact-cta"
                    onClick={handleReveal}
                    disabled={revealing}
                  >
                    {revealing ? <Spinner size={16} color="#fff" /> : <Eye size={16} />}
                    {revealing ? 'Revealing…' : TENANT_HOME_REQUEST_PAGE_COPY.revealCta}
                  </button>
                </>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function formatTenantHomeRequestLocationsLabel(request: PmHomeRequest): string {
  if (request.locations.length === 0) return 'No preferred locations'
  if (request.locations.length === 1) {
    const location = request.locations[0]!
    return `${formatTenantHomeRequestLocation(location)}, ${location.state}`
  }
  return `${request.locations.length} preferred areas`
}
