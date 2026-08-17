'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Capacitor } from '@capacitor/core'
import { Copy, History, KeyRound, Share2, UserRound } from 'lucide-react'
import { PayPageShell, PayFlowPrimaryButton } from '@/features/dashboard/components/payment/PayPageShell'
import { Modal } from '@/components/common/Modal'
import { useToast } from '@/components/common/Toast'
import { useActiveVisitors, useVisitorHistoryInfinite } from '../hooks/useMyHome'
import { useSelectedProperty } from '../context/MyHomePropertyContext'
import { revokeVisitor } from '../services/myHomeService'
import type { Visitor } from '../types'
import { GenerateVisitorForm } from './GenerateVisitorForm'

function badgeModifier(status: string) {
  return status.toLowerCase()
}

function canRevoke(status: string) {
  const normalized = status.toLowerCase()
  return normalized !== 'expired' && normalized !== 'revoked'
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
}: {
  visitor: Visitor | null
  propertyUuid: string | null
  onClose: () => void
  onRevoked: () => void
}) {
  const { success, error } = useToast()
  const [confirmRevoke, setConfirmRevoke] = useState(false)

  useEffect(() => {
    setConfirmRevoke(false)
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
    <Modal isOpen={!!visitor} onClose={onClose} size="md">
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

          {confirmRevoke ? (
            <div className="my-home-detail__revoke">
              <p className="my-home-detail__revoke-copy">
                Are you sure you want to revoke this access code?
              </p>
              <div className="my-home-detail__revoke-actions">
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
          ) : (
            <>
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
              {canRevoke(visitor.status) ? (
                <button
                  type="button"
                  className="my-home-detail__danger-btn my-home-detail__danger-btn--outline"
                  onClick={() => setConfirmRevoke(true)}
                >
                  Revoke access
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </Modal>
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
