'use client'

import React, { useState } from 'react'
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  Building2, 
  Edit3, 
  Trash2, 
  User, 
  ChevronRight,
  ArrowRight
} from 'lucide-react'
import { useApprovalRequests, useResolveApprovalRequest } from '@/features/pm/hooks/useTeam'
import { DataTable, Column } from '@/components/common/DataTable'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'

export function ApprovalsTab() {
  const { data: requests = [], isLoading } = useApprovalRequests()
  const { mutate: resolveRequest, isPending: isResolving } = useResolveApprovalRequest()

  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const handleConfirmResolve = () => {
    if (!selectedRequest || !actionType) return
    resolveRequest({
      uuid: selectedRequest.uuid,
      action: actionType,
      rejectionReason: actionType === 'REJECT' ? rejectionReason : undefined
    }, {
      onSuccess: () => {
        setSelectedRequest(null)
        setActionType(null)
        setRejectionReason('')
      }
    })
  }

  const columns: Column<any>[] = [
    {
      header: 'Manager / Requester',
      render: (req) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--dark)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700
          }}>
            {req.requester.firstName ? req.requester.firstName.charAt(0) : 'M'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {req.requester.firstName ? `${req.requester.firstName} ${req.requester.lastName}`.trim() : req.requester.email}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{req.requester.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Requested Action',
      render: (req) => {
        const isDelete = req.type.startsWith('DELETE')
        const isUnit = req.type.includes('UNIT')
        const label = isDelete ? (isUnit ? 'Delete Unit' : 'Delete Property') : (isUnit ? 'Edit Unit Details' : 'Edit Property')

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              padding: '4px 10px',
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 700,
              background: isDelete ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              color: isDelete ? 'var(--error)' : '#2563eb',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              {isDelete ? <Trash2 size={12} /> : <Edit3 size={12} />}
              {label}
            </div>
          </div>
        )
      }
    },
    {
      header: 'Target Item',
      render: (req) => {
        const isUnit = req.type.includes('UNIT')
        return (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={14} color="var(--forest)" />
              {isUnit ? (req.unitName ? `Unit ${req.unitName}` : 'Unit') : req.propertyName}
            </div>
            {isUnit ? (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Property: {req.propertyName}</div>
            ) : (
              req.proposedData?.address && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{req.proposedData.address}</div>
              )
            )}
          </div>
        )
      }
    },
    {
      header: 'Status',
      render: (req) => {
        const isPending = req.status === 'PENDING'
        const isApproved = req.status === 'APPROVED'
        return (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 700,
            background: isPending ? 'rgba(234, 179, 8, 0.12)' : isApproved ? 'var(--forest-faint)' : 'rgba(239, 68, 68, 0.1)',
            color: isPending ? '#b45309' : isApproved ? 'var(--forest)' : 'var(--error)'
          }}>
            {isPending ? <Clock size={12} /> : isApproved ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {req.status}
          </div>
        )
      }
    },
    {
      header: '',
      align: 'right',
      render: (req) => {
        if (req.status !== 'PENDING') return null
        return (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              className="btn btn--secondary btn--sm"
              style={{ borderRadius: 8, padding: '4px 12px', fontSize: 12 }}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedRequest(req)
                setActionType('REJECT')
              }}
            >
              Reject
            </button>
            <button
              className="btn btn--primary btn--sm"
              style={{ borderRadius: 8, padding: '4px 12px', fontSize: 12, background: 'var(--forest)', color: 'white' }}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedRequest(req)
                setActionType('APPROVE')
              }}
            >
              Approve
            </button>
          </div>
        )
      }
    }
  ]

  const pendingRequests = requests.filter((r: any) => r.status === 'PENDING')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--forest-faint)',
            color: 'var(--forest)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Manager Approval Queue</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
              Review and approve or reject property modification requests from your team managers.
            </p>
          </div>
        </div>

        <div style={{
          padding: '6px 16px',
          borderRadius: 100,
          fontSize: 12,
          fontWeight: 800,
          background: pendingRequests.length > 0 ? 'rgba(234, 179, 8, 0.15)' : 'var(--bg)',
          color: pendingRequests.length > 0 ? '#b45309' : 'var(--text-muted)'
        }}>
          {pendingRequests.length} Pending Approval{pendingRequests.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Requests Table */}
      <DataTable
        data={requests}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No pending or historical approval requests found."
      />

      {/* Confirmation Modal */}
      {selectedRequest && actionType && (
        <ConfirmationModal
          isOpen={!!selectedRequest}
          onClose={() => {
            setSelectedRequest(null)
            setActionType(null)
          }}
          onConfirm={handleConfirmResolve}
          title={actionType === 'APPROVE' ? `Approve ${selectedRequest.type.startsWith('DELETE') ? 'Deletion' : 'Edits'}` : 'Reject Approval Request'}
          message={
            <div>
              <p style={{ marginBottom: 12 }}>
                Are you sure you want to {actionType === 'APPROVE' ? 'approve' : 'reject'} this {selectedRequest.type.startsWith('DELETE') ? 'deletion' : 'edit'} request for <strong>{selectedRequest.unitName ? `Unit ${selectedRequest.unitName}` : selectedRequest.propertyName}</strong> submitted by {selectedRequest.requester.firstName || selectedRequest.requester.email}?
              </p>

              {actionType === 'APPROVE' && selectedRequest.proposedData && (
                <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Proposed Changes:</div>
                  {Object.entries(selectedRequest.proposedData).map(([key, val]) => (
                    val !== undefined && val !== null ? (
                      <div key={key} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                        <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{key}:</span>
                        <span style={{ fontWeight: 600 }}>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                      </div>
                    ) : null
                  ))}
                </div>
              )}

              {actionType === 'REJECT' && (
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Rejection Reason (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter reason for rejecting..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      padding: '0 12px',
                      fontSize: 13
                    }}
                  />
                </div>
              )}
            </div>
          }
          confirmText={actionType === 'APPROVE' ? 'Approve & Apply' : 'Reject Request'}
          confirmVariant={actionType === 'APPROVE' ? 'primary' : 'danger'}
          isLoading={isResolving}
        />
      )}
    </div>
  )
}
