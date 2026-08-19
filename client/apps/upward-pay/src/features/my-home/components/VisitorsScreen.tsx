'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Capacitor } from '@capacitor/core'
import { Ban, Clock, Copy, History, KeyRound, Share2, UserRound } from 'lucide-react'
import { PayPageShell, PayFlowPrimaryButton } from '@/features/dashboard/components/payment/PayPageShell'
import { Modal } from '@/components/common/Modal'
import { useToast } from '@/components/common/Toast'
import { useActiveVisitors, useVisitorHistoryInfinite } from '../hooks/useMyHome'
import { useSelectedProperty } from '../context/MyHomePropertyContext'
import { revokeVisitor, extendVisitor } from '../services/myHomeService'
import type { Visitor } from '../types'
import { GenerateVisitorForm } from './GenerateVisitorForm'
import { VISITOR_DURATION_OPTIONS } from '../constants'

function badgeModifier(status: string) {
  return status.toLowerCase()
}

function canRevoke(status: string) {
  const normalized = status.toLowerCase()
  return normalized !== 'expired' && normalized !== 'revoked'
}

function canExtend(status: string) {
  const normalized = status.toLowerCase()
  return normalized === 'expired' || normalized === 'extended' || normalized === 'overstay'
}

function visitorInviteText(visitor: Visitor) {
  return `Hi ${visitor.visitor_name},\n\nYour one-time code is\n\n${visitor.code}\n\n${visitor.unit.name}, ${visitor.unit.address}\n\n${visitor.details}`
}

function isShareCancel(err: unknown) {
  if (!err || typeof err !== 'object') return false
  const name = 'name' in err ? String(err.name) : ''
  const message = 'message' in err ? String(err.message).toLowerCase() : ''
  return name === 'AbortError' || message.includes('cancel')
}

function VisitorBadge({ status }: { status: string }) {
  return (
    <span className={`my-home-list__badge my-home-list__badge--${badgeModifier(status)}`}>
      <span className="my-home-list__badge-dot" />
      {status}
    </span>
  )
}

function VisitorCard({ visitor, onOpen }: { visitor: Visitor; onOpen: (visitor: Visitor) => void }) {
  return (
    <div
      className="my-home-list__card my-home-list__card--clickable"
      onClick={() => onOpen(visitor)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen(visitor)
      }}
    >
      <div className="my-home-list__card-body">
        <div className="my-home-list__card-head">
          <div className="my-home-list__card-head-left">
            <VisitorBadge status={visitor.status} />
          </div>
          <span className="my-home-list__code">{visitor.code}</span>
        </div>

        <div className="my-home-list__category">
          <UserRound size={14} />
          {visitor.visitor_name}
        </div>

        <p className="my-home-list__desc">{visitor.details}</p>
        <span className="my-home-list__tap-hint">Tap to view details</span>
      </div>
    </div>
  )
}

function VisitorDetailModal({
  visitor,
  propertyUuid,
  onClose,
  onRevoked,
  onExtended,
}: {
  visitor: Visitor | null
  propertyUuid: string | null
  onClose: () => void
  onRevoked: () => void
  onExtended: (visitor: Visitor) => void
}) {
  const { success, error } = useToast()
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [confirmExtend, setConfirmExtend] = useState(false)
  const [extendDuration, setExtendDuration] = useState('24')

  useEffect(() => {
    setConfirmRevoke(false)
    setConfirmExtend(false)
    setExtendDuration('24')
  }, [visitor?.id])

  const revokeMutation = useMutation({
    mutationFn: () => revokeVisitor(propertyUuid as string, visitor!.id),
    onSuccess: () => {
      success('Visitor access revoked.')
      onRevoked()
      onClose()
    },
    onError: (err: { message?: string }) => {
      error(err?.message || 'Could not revoke visitor access')
    },
  })

  const extendMutation = useMutation({
    mutationFn: () => extendVisitor(propertyUuid as string, visitor!.id, Number(extendDuration)),
    onSuccess: (response) => {
      success('Visitor access extended.')
      onExtended(response.data)
    },
    onError: (err: { message?: string }) => {
      error(err?.message || 'Could not extend visitor access')
    },
  })

  const handleCopy = async () => {
    if (!visitor) return
    try {
      await navigator.clipboard.writeText(visitorInviteText(visitor))
      success('Copied to clipboard')
    } catch {
      error('Could not copy visitor access')
    }
  }

  const handleShare = async () => {
    if (!visitor) return
    const text = visitorInviteText(visitor)

    try {
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share')
        await Share.share({
          title: 'Gate Access Invitation',
          text,
          dialogTitle: 'Share visitor access',
        })
        return
      }

      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'Gate Access Invitation',
          text,
        })
        return
      }

      await handleCopy()
    } catch (err) {
      if (isShareCancel(err)) return
      error('Could not share visitor access')
    }
  }

  return (
    <>
    <Modal isOpen={!!visitor && !confirmRevoke && !confirmExtend} onClose={onClose} size="md">
      {visitor ? (
        <div className="my-home-detail">
          <h3 className="my-home-detail__title">Visitor Pass</h3>

          <div className="my-home-detail__section">
            <VisitorBadge status={visitor.status} />
          </div>

          <div className="my-home-detail__section">
            <span className="my-home-detail__label">Visitor</span>
            <p className="my-home-detail__value">
              {visitor.visitor_name} · {visitor.phone}
            </p>
          </div>

          <div className="my-home-detail__section">
            <span className="my-home-detail__label">Visit</span>
            <p className="my-home-detail__value">{visitor.details}</p>
          </div>

          <div className="my-home-detail__section">
            <span className="my-home-detail__label">Access Code</span>
            <p className="my-home-detail__value">{visitor.code}</p>
          </div>

          {visitor.notes ? (
            <div className="my-home-detail__section">
              <span className="my-home-detail__label">Notes</span>
              <p className="my-home-detail__value">{visitor.notes}</p>
            </div>
          ) : null}

          <div className="my-home-detail__pass-actions">
            <button type="button" className="my-home-detail__copy-btn" onClick={handleShare}>
              <Share2 size={15} />
              <span>Share</span>
            </button>
            <button type="button" className="my-home-detail__secondary-btn" onClick={handleCopy}>
              <Copy size={15} />
              <span>Copy</span>
            </button>
          </div>
          {canExtend(visitor.status) ? (
            <button
              type="button"
              className="my-home-detail__copy-btn"
              onClick={() => setConfirmExtend(true)}
            >
              Extend access
            </button>
          ) : null}
          {canRevoke(visitor.status) ? (
            <button
              type="button"
              className="my-home-detail__danger-btn my-home-detail__danger-btn--outline"
              onClick={() => setConfirmRevoke(true)}
            >
              Revoke access
            </button>
          ) : null}
        </div>
      ) : null}
    </Modal>

    <Modal isOpen={!!visitor && confirmRevoke} onClose={() => setConfirmRevoke(false)} size="sm">
      <div className="my-home-confirm">
        <div className="my-home-confirm__icon my-home-confirm__icon--danger">
          <Ban size={26} />
        </div>
        <h3 className="my-home-confirm__title">Revoke this access?</h3>
        <p className="my-home-confirm__text">
          {visitor
            ? `${visitor.visitor_name}'s code will stop working immediately.`
            : 'This access code will stop working immediately.'}
        </p>
        <div className="my-home-confirm__actions">
          <button
            type="button"
            className="my-home-detail__secondary-btn"
            onClick={() => setConfirmRevoke(false)}
            disabled={revokeMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="my-home-detail__danger-btn"
            onClick={() => revokeMutation.mutate()}
            disabled={revokeMutation.isPending || !propertyUuid}
          >
            {revokeMutation.isPending ? 'Revoking…' : 'Revoke'}
          </button>
        </div>
      </div>
    </Modal>

    <Modal isOpen={!!visitor && confirmExtend} onClose={() => setConfirmExtend(false)} size="sm">
      <div className="my-home-confirm">
        <div className="my-home-confirm__icon">
          <Clock size={26} />
        </div>
        <h3 className="my-home-confirm__title">Extend access</h3>
        <p className="my-home-confirm__text">
          A new code will be generated for this visitor. The current code will expire.
        </p>
        <label className="my-home-form__field my-home-confirm__field">
          <span className="my-home-form__label">Access Duration</span>
          <select
            className="my-home-form__input"
            value={extendDuration}
            onChange={(event) => setExtendDuration(event.target.value)}
            disabled={extendMutation.isPending}
          >
            {VISITOR_DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="my-home-confirm__actions">
          <button
            type="button"
            className="my-home-detail__secondary-btn"
            onClick={() => setConfirmExtend(false)}
            disabled={extendMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="my-home-detail__copy-btn"
            onClick={() => extendMutation.mutate()}
            disabled={extendMutation.isPending || !propertyUuid}
          >
            {extendMutation.isPending ? 'Extending…' : 'Extend'}
          </button>
        </div>
      </div>
    </Modal>
    </>
  )
}

export function VisitorsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { selected, selectedUuid } = useSelectedProperty()
  const [openVisitor, setOpenVisitor] = useState<Visitor | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const active = useActiveVisitors(selectedUuid)
  const history = useVisitorHistoryInfinite(selectedUuid)

  const activeVisitors = active.data?.data ?? []
  const historyVisitors = history.data?.pages.flatMap((page) => page.data) ?? []

  return (
    <>
    <PayPageShell
      title="Visitors"
      subtitle={selected?.unitName || undefined}
      showBack
      onBack={() => router.push('/dashboard/my-home')}
      pinFooter
      footer={
        <PayFlowPrimaryButton onClick={() => setIsFormOpen(true)}>
          Generate Access
        </PayFlowPrimaryButton>
      }
    >
      <div className="my-home-list__section">
        <div className="my-home-list__section-head">
          <h2 className="my-home-list__section-title">Active Passes</h2>
        </div>

        {active.isPending ? (
          <div className="my-home-list__loading">
            <span className="my-home-list__spinner" />
          </div>
        ) : activeVisitors.length === 0 ? (
          <div className="my-home-list__empty">
            <div className="my-home-list__empty-icon">
              <KeyRound size={24} />
            </div>
            <h4 className="my-home-list__empty-title">No Active Passes</h4>
            <p className="my-home-list__empty-desc">No visitors are checked in right now.</p>
          </div>
        ) : (
          activeVisitors.map((visitor) => (
            <VisitorCard key={visitor.id} visitor={visitor} onOpen={setOpenVisitor} />
          ))
        )}
      </div>

      <div className="my-home-list__section">
        <div className="my-home-list__section-head">
          <h2 className="my-home-list__section-title">Access History</h2>
          <History size={14} color="var(--text-muted)" />
        </div>

        {history.isPending ? (
          <div className="my-home-list__loading">
            <span className="my-home-list__spinner" />
          </div>
        ) : historyVisitors.length === 0 ? (
          <p className="my-home__panel-empty">No past visitor passes for this home.</p>
        ) : (
          <>
            {historyVisitors.map((visitor) => (
              <VisitorCard key={visitor.id} visitor={visitor} onOpen={setOpenVisitor} />
            ))}

            {history.hasNextPage ? (
              <button
                type="button"
                className="my-home-list__load-more"
                onClick={() => history.fetchNextPage()}
                disabled={history.isFetchingNextPage}
              >
                {history.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            ) : (
              <div className="my-home-list__end">That&apos;s all for now</div>
            )}
          </>
        )}
      </div>

      <VisitorDetailModal
        visitor={openVisitor}
        propertyUuid={selectedUuid}
        onClose={() => setOpenVisitor(null)}
        onRevoked={() => {
          queryClient.invalidateQueries({ queryKey: ['my-home', 'visitors'] })
        }}
        onExtended={(visitor) => {
          queryClient.invalidateQueries({ queryKey: ['my-home', 'visitors'] })
          setOpenVisitor(visitor)
        }}
      />
    </PayPageShell>
      <GenerateVisitorForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        propertyUuid={selectedUuid}
        onSuccess={(visitor) => setOpenVisitor(visitor)}
      />
    </>
  )
}
