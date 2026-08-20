'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building,
  Clock,
  ImageIcon,
  MessageSquare,
  MessageSquareWarning,
  Star,
  Tag,
} from 'lucide-react'
import { PayPageShell, PayFlowPrimaryButton } from '@/features/dashboard/components/payment/PayPageShell'
import { Modal } from '@/components/common/Modal'
import { useComplaintDetail, useComplaintsInfinite } from '../hooks/useMyHome'
import { useSelectedProperty } from '../context/MyHomePropertyContext'
import { RaiseComplaintForm } from './RaiseComplaintForm'
import { DisputeComplaintForm } from './DisputeComplaintForm'
import { FeedbackComplaintForm } from './FeedbackComplaintForm'
import { COMPLAINT_STATUS_FILTERS, type ComplaintStatusFilter } from '../constants'
import type { Complaint } from '../types'

/** Mirrors GT tenant-app's complaint status vocabulary (Pending/Ongoing/Completed/Disputed). */
function badgeModifier(status: string) {
  const normalized = status.toLowerCase()
  if (['completed', 'resolved'].includes(normalized)) return 'completed'
  if (normalized === 'pending') return 'pending'
  if (normalized === 'ongoing') return 'ongoing'
  if (normalized === 'disputed') return 'disputed'
  return 'ongoing'
}

function displayStatus(status: string) {
  return status.toLowerCase() === 'completed' ? 'Resolved' : status
}

function needsResolutionPrompt(complaint: Complaint) {
  return complaint.status.toLowerCase() === 'completed' && !complaint.rating
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`my-home-list__badge my-home-list__badge--${badgeModifier(status)}`}>
      <span className="my-home-list__badge-dot" />
      {displayStatus(status)}
    </span>
  )
}

function Stars({ score }: { score: number }) {
  return (
    <div className="my-home-list__stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          fill={star <= Math.floor(score) ? 'var(--warning)' : 'none'}
          color={star <= Math.floor(score) ? 'var(--warning)' : 'var(--border-solid)'}
        />
      ))}
    </div>
  )
}

function ComplaintDetailModal({
  propertyUuid,
  complaintId,
  onClose,
}: {
  propertyUuid: string | null
  complaintId: string | null
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'messages'>('details')
  const { data, isPending } = useComplaintDetail(propertyUuid, complaintId)
  const complaint = data?.data

  return (
    <Modal isOpen={!!complaintId} onClose={onClose} size="lg">
      <div className="my-home-detail">
        <h3 className="my-home-detail__title">Complaint Details</h3>

        {isPending || !complaint ? (
          <div className="my-home-list__loading">
            <span className="my-home-list__spinner" />
          </div>
        ) : (
          <>
            <div className="my-home-detail__tabs">
              <button
                type="button"
                className={`my-home-detail__tab ${activeTab === 'details' ? 'my-home-detail__tab--active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                Details
              </button>
              <button
                type="button"
                className={`my-home-detail__tab ${activeTab === 'messages' ? 'my-home-detail__tab--active' : ''}`}
                onClick={() => setActiveTab('messages')}
              >
                Messages{complaint.pm_messages?.length ? ` (${complaint.pm_messages.length})` : ''}
              </button>
            </div>

            {activeTab === 'details' ? (
              <>
                <div className="my-home-detail__section">
                  <StatusBadge status={complaint.status} />
                </div>

                <div className="my-home-detail__section">
                  <span className="my-home-detail__label">
                    <Tag size={13} />
                    Category
                  </span>
                  <p className="my-home-detail__value">{complaint.category}</p>
                </div>

                <div className="my-home-detail__section">
                  <span className="my-home-detail__label">
                    <MessageSquare size={13} />
                    Description
                  </span>
                  <p className="my-home-detail__value">{complaint.description}</p>
                </div>

                {complaint.unit ? (
                  <div className="my-home-detail__section">
                    <span className="my-home-detail__label">
                      <Building size={13} />
                      Property
                    </span>
                    <p className="my-home-detail__value">{complaint.unit.property_address}</p>
                  </div>
                ) : null}

                {complaint.rating ? (
                  <div className="my-home-detail__section">
                    <span className="my-home-detail__label">
                      <Star size={13} />
                      Rating
                    </span>
                    <Stars score={parseFloat(complaint.rating.score)} />
                  </div>
                ) : null}

                {complaint.files?.length ? (
                  <div className="my-home-detail__section">
                    <span className="my-home-detail__label">
                      <ImageIcon size={13} />
                      Attachments
                    </span>
                    <div className="my-home-detail__attachments">
                      {complaint.files.map((file, index) => (
                        <div key={index} className="my-home-detail__attachment">
                          <img src={file.source} alt={`Attachment ${index + 1}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {complaint.pm_messages?.length ? (
                  complaint.pm_messages.map((message, index) => (
                    <div key={index} className="my-home-detail__message">
                      <div className="my-home-detail__message-head">
                        <span className="my-home-detail__message-name">{message.pm_name}</span>
                        <span className="my-home-detail__message-time">{message.created_at}</span>
                      </div>
                      <p className="my-home-detail__message-body">{message.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="my-home-detail__empty">
                    <MessageSquare size={24} />
                    <p className="my-home-detail__value">
                      Your property manager hasn&apos;t sent any messages for this complaint yet.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

export function ComplaintsScreen() {
  const router = useRouter()
  const { selected, selectedUuid } = useSelectedProperty()
  const [openComplaintId, setOpenComplaintId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ComplaintStatusFilter>('pending')
  const [disputeComplaint, setDisputeComplaint] = useState<Complaint | null>(null)
  const [feedbackPromptComplaint, setFeedbackPromptComplaint] = useState<Complaint | null>(null)
  const [feedbackComplaint, setFeedbackComplaint] = useState<Complaint | null>(null)

  const query = useComplaintsInfinite(selectedUuid, statusFilter)
  const complaints = query.data?.pages.flatMap((page) => page.data) ?? []
  const isInitialLoading = query.isPending
  const isEmpty = !isInitialLoading && complaints.length === 0
  const isAllFilter = statusFilter === 'all'

  return (
    <>
    <PayPageShell
      title="Complaints"
      subtitle={selected?.unitName || undefined}
      showBack
      onBack={() => router.push('/dashboard/my-home')}
      pinFooter
      footer={
        <PayFlowPrimaryButton onClick={() => setIsFormOpen(true)}>
          Make a Complaint
        </PayFlowPrimaryButton>
      }
    >
      <div className="my-home-list__filters" role="tablist" aria-label="Filter by status">
        {COMPLAINT_STATUS_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === option.value}
            className={`my-home-list__filter-chip${statusFilter === option.value ? ' my-home-list__filter-chip--active' : ''}`}
            onClick={() => setStatusFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isInitialLoading ? (
        <div className="my-home-list__loading">
          <span className="my-home-list__spinner" />
        </div>
      ) : isEmpty ? (
        <div className="my-home-list__empty">
          <div className="my-home-list__empty-icon">
            <MessageSquareWarning size={24} />
          </div>
          <h4 className="my-home-list__empty-title">
            {isAllFilter ? 'No Complaints Found' : 'No Matching Complaints'}
          </h4>
          <p className="my-home-list__empty-desc">
            {isAllFilter
              ? "You haven't raised any complaints yet for this home."
              : `No complaints with status “${COMPLAINT_STATUS_FILTERS.find((option) => option.value === statusFilter)?.label}”.`}
          </p>
          {isAllFilter ? (
            <button type="button" className="my-home-empty-cta" onClick={() => setIsFormOpen(true)}>
              Raise a Complaint
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {complaints.map((complaint) => {
            const showResolvePrompt = needsResolutionPrompt(complaint)

            return (
            <div key={complaint.complaint_id} className="my-home-list__card">
              <div className="my-home-list__card-body">
                <div className="my-home-list__card-head">
                  <div className="my-home-list__card-head-left">
                    <StatusBadge status={complaint.status} />
                    {complaint.pm_messages?.length ? (
                      <span className="my-home-list__msg-count">
                        <MessageSquare size={13} />
                        {complaint.pm_messages.length}
                      </span>
                    ) : null}
                  </div>
                  <span className="my-home-list__date">
                    <Clock size={13} />
                    {complaint.created_at}
                  </span>
                </div>

                <div className="my-home-list__category">
                  <Tag size={14} />
                  {complaint.category}
                  {complaint.files?.length ? (
                    <ImageIcon size={14} className="my-home-list__category-file-icon" />
                  ) : null}
                </div>

                <p className="my-home-list__desc">{complaint.description}</p>
              </div>

              {showResolvePrompt ? (
                <div className="my-home-list__resolve">
                  <p className="my-home-list__resolve-copy">Has this issue been resolved?</p>
                  <div className="my-home-list__resolve-actions">
                    <button
                      type="button"
                      className="my-home-list__resolve-no"
                      onClick={() => setDisputeComplaint(complaint)}
                    >
                      Not Yet
                    </button>
                    <button
                      type="button"
                      className="my-home-list__resolve-yes"
                      onClick={() => setFeedbackPromptComplaint(complaint)}
                    >
                      Yes, Resolved
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="my-home-list__card-footer"
                  onClick={() => setOpenComplaintId(complaint.complaint_id)}
                >
                  View Details
                </div>
              )}
            </div>
            )
          })}

          {query.hasNextPage ? (
            <button
              type="button"
              className="my-home-list__load-more"
              onClick={() => query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
            >
              {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </button>
          ) : (
            <div className="my-home-list__end">That&apos;s all for now</div>
          )}
        </>
      )}

      <ComplaintDetailModal
        propertyUuid={selectedUuid}
        complaintId={openComplaintId}
        onClose={() => setOpenComplaintId(null)}
      />
    </PayPageShell>
      <RaiseComplaintForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        propertyUuid={selectedUuid}
      />
      <DisputeComplaintForm
        isOpen={!!disputeComplaint}
        onClose={() => setDisputeComplaint(null)}
        propertyUuid={selectedUuid}
        complaint={disputeComplaint}
      />
      <Modal isOpen={!!feedbackPromptComplaint} onClose={() => setFeedbackPromptComplaint(null)} size="sm">
        <div className="my-home-confirm">
          <div className="my-home-confirm__icon">
            <Star size={26} />
          </div>
          <h3 className="my-home-confirm__title">Would you like to give feedback?</h3>
          <p className="my-home-confirm__text">Your feedback helps us improve complaint resolution.</p>
          <div className="my-home-confirm__actions">
            <button
              type="button"
              className="my-home-detail__secondary-btn"
              onClick={() => setFeedbackPromptComplaint(null)}
            >
              Skip
            </button>
            <button
              type="button"
              className="my-home-detail__copy-btn"
              onClick={() => {
                setFeedbackComplaint(feedbackPromptComplaint)
                setFeedbackPromptComplaint(null)
              }}
            >
              Give Feedback
            </button>
          </div>
        </div>
      </Modal>
      <FeedbackComplaintForm
        isOpen={!!feedbackComplaint}
        onClose={() => setFeedbackComplaint(null)}
        propertyUuid={selectedUuid}
        complaint={feedbackComplaint}
      />
    </>
  )
}
