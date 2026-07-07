'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Eye, FileText, Download, Loader2 } from 'lucide-react'
import { getPendingManualPayments, reviewManualPayment } from '../../services/paymentService'
import { useToast } from '@/components/common/Toast'
import { Modal } from '@/components/ui/Modal/Modal'
import { formatCurrency } from '@/lib/utils'

export function ApprovePaymentsQueue() {
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const [selectedProof, setSelectedProof] = useState<any>(null)
  const [remarks, setRemarks] = useState('')
  
  const { data: proofs = [], isLoading } = useQuery({
    queryKey: ['pm-pending-proofs'],
    queryFn: getPendingManualPayments
  })

  const { mutate: reviewProof, isPending } = useMutation({
    mutationFn: ({ id, status, remarks }: { id: string, status: 'APPROVED' | 'REJECTED', remarks?: string }) => 
      reviewManualPayment(id, status, remarks),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pm-pending-proofs'] })
      queryClient.invalidateQueries({ queryKey: ['pm-payment-requests'] })
      success(`Payment proof ${variables.status.toLowerCase()} successfully`)
      setSelectedProof(null)
      setRemarks('')
    },
    onError: (err: any) => {
      error(err.message || 'Failed to review payment proof')
    }
  })

  const handleDownload = async (proof: any) => {
    try {
      // Create a temporary link to download the file directly from our endpoint
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/payments/manual/proof/${proof.id}`
      // We'll need to pass the auth token. Better way: fetch it as blob
      const token = localStorage.getItem('upward_pm_token')
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch document')
      
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = proof.fileName || 'proof_of_payment'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)
    } catch (err: any) {
      error('Failed to download document')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 size={24} className="animate-spin text-[var(--clay)]" />
      </div>
    )
  }

  if (proofs.length === 0) {
    return (
      <div className="text-center p-12 bg-[var(--surface)] rounded-2xl border border-[var(--border-solid)]">
        <div className="mx-auto w-12 h-12 rounded-full bg-[var(--clay-faint)] flex items-center justify-center mb-4">
          <CheckCircle size={24} className="text-[var(--clay)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text)]">All Caught Up!</h3>
        <p className="text-[var(--text-secondary)] mt-1">There are no pending manual payment proofs to review.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {proofs.map((proof: any) => (
        <div key={proof.id} className="bg-[var(--bg)] p-5 rounded-2xl border border-[var(--border-solid)] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface2)] flex items-center justify-center text-[var(--clay)]">
              <FileText size={24} />
            </div>
            <div>
              <h4 className="font-bold text-[var(--text)]">{proof.paymentRequest?.tenant?.firstName} {proof.paymentRequest?.tenant?.lastName}</h4>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {proof.paymentRequest?.unit?.property?.name} - Unit {proof.paymentRequest?.unit?.unitName}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold bg-[var(--clay-faint)] text-[var(--clay)] px-2 py-1 rounded-md">
                  {formatCurrency(proof.paymentRequest?.amount || 0, proof.paymentRequest?.currency || 'NGN')}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  Uploaded on {new Date(proof.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              className="btn btn--secondary btn--sm"
              onClick={() => setSelectedProof(proof)}
            >
              <Eye size={16} className="mr-2" /> Review
            </button>
          </div>
        </div>
      ))}

      {selectedProof && (
        <Modal 
          isOpen={true} 
          onClose={() => {
            setSelectedProof(null)
            setRemarks('')
          }}
          title="Review Payment Proof"
          size="md"
        >
          <div className="p-6 space-y-6">
            <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border-solid)]">
              <h5 className="font-bold text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-3">Payment Details</h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Tenant</span>
                  <span className="font-medium">{selectedProof.paymentRequest?.tenant?.firstName} {selectedProof.paymentRequest?.tenant?.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Property</span>
                  <span className="font-medium">{selectedProof.paymentRequest?.unit?.property?.name} (Unit {selectedProof.paymentRequest?.unit?.unitName})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Expected Amount</span>
                  <span className="font-bold text-[var(--clay)]">{formatCurrency(selectedProof.paymentRequest?.amount || 0, selectedProof.paymentRequest?.currency || 'NGN')}</span>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg)] p-4 rounded-xl border border-[var(--border-solid)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-[var(--text-muted)]" />
                <div>
                  <p className="font-medium text-sm">{selectedProof.fileName}</p>
                  <p className="text-xs text-[var(--text-muted)]">Document ready for review</p>
                </div>
              </div>
              <button 
                className="btn btn--secondary btn--sm btn--pill"
                onClick={() => handleDownload(selectedProof)}
              >
                <Download size={14} className="mr-2" /> View / Download
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--text)] mb-2">Remarks (Optional)</label>
              <textarea 
                className="w-full p-3 rounded-xl border border-[var(--border-solid)] bg-[var(--surface)] focus:border-[var(--clay)] outline-none resize-none transition-colors"
                rows={3}
                placeholder="Add a note for the tenant..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                className="btn flex-1 py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                style={{ background: 'var(--error)' }}
                onClick={() => reviewProof({ id: selectedProof.id, status: 'REJECTED', remarks })}
                disabled={isPending}
              >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />} Reject
              </button>
              <button 
                className="btn btn--primary flex-1 py-3 rounded-xl flex items-center justify-center gap-2"
                onClick={() => reviewProof({ id: selectedProof.id, status: 'APPROVED', remarks })}
                disabled={isPending}
              >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} Approve
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
