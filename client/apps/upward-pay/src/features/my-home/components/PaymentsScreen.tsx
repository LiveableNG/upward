'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  FileText,
  Loader2,
  Upload,
  Wallet,
  X,
} from 'lucide-react'
import { PayPageShell, PayFlowPrimaryButton } from '@/features/dashboard/components/payment/PayPageShell'
import { Modal } from '@/components/common/Modal'
import { useToast } from '@/components/common/Toast'
import { formatCurrency } from '@/lib/utils'
import { useTransactions } from '@/features/dashboard/hooks/useDashboard'
import type { CompletedPayment } from '@/features/dashboard/types'
import * as myHomeService from '../services/myHomeService'
import { usePendingBills, useTransactionsInfinite, type MyHomeProperty } from '../hooks/useMyHome'
import { useSelectedProperty } from '../context/MyHomePropertyContext'
import type { GtTransaction, PendingBill, PendingPaymentInfo, UploadedHomeFile } from '../types'

type HistorySource = 'gt' | 'upward'

type HistoryRow = GtTransaction & {
  source: HistorySource
  receiptId?: string
}

function parseAmount(value: string) {
  return parseFloat(value.replace(/,/g, '')) || 0
}

function formatHistoryDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function sortDateKeys(dates: string[]) {
  return [...dates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
}

function mergeTransactionPages(
  pages: Array<{ data: Record<string, GtTransaction[]> }>,
): Record<string, HistoryRow[]> {
  const merged: Record<string, HistoryRow[]> = {}

  for (const page of pages) {
    for (const [date, rows] of Object.entries(page.data)) {
      const tagged = rows.map((row) => ({ ...row, source: 'gt' as const }))
      merged[date] = merged[date] ? [...merged[date], ...tagged] : tagged
    }
  }

  return merged
}

function tokensFromProperty(property: MyHomeProperty | null) {
  return [property?.label, property?.unitName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2)
}

function belongsToSelectedHome(tx: CompletedPayment, property: MyHomeProperty | null) {
  if (!tx.property_address || !property) return true
  const haystack = tx.property_address.toLowerCase()
  const tokens = tokensFromProperty(property)
  if (tokens.length === 0) return true
  return tokens.some((token) => haystack.includes(token))
}

function upwardToHistoryRow(tx: CompletedPayment): HistoryRow {
  const isCredit = tx.type === 'credit' || tx.transactionType === 'FUTURE_CREDIT'
  return {
    category: tx.company_name || 'Rent Payment',
    additional_information: tx.property_address,
    amount: String(tx.amount),
    status: tx.status,
    type: isCredit ? 'credit' : 'debit',
    reference: tx.paystack_reference,
    payment_method: tx.isManual ? 'Manual' : tx.channel || 'Paystack',
    date: formatHistoryDate(tx.paid_at),
    source: 'upward',
    receiptId: tx.uuid,
  }
}

function mergeUpwardIntoHistory(
  grouped: Record<string, HistoryRow[]>,
  upward: CompletedPayment[],
  property: MyHomeProperty | null,
): Record<string, HistoryRow[]> {
  const matched = upward.filter((tx) => belongsToSelectedHome(tx, property))
  const rows = (matched.length > 0 ? matched : upward).map(upwardToHistoryRow)
  const next: Record<string, HistoryRow[]> = { ...grouped }

  for (const row of rows) {
    const date = row.date
    next[date] = next[date] ? [...next[date], row] : [row]
  }

  return next
}

function TransactionRow({
  transaction,
  onOpen,
}: {
  transaction: HistoryRow
  onOpen?: () => void
}) {
  const isCredit = transaction.type === 'credit'
  const Icon = isCredit ? ArrowDownLeft : ArrowUpRight
  const amount = formatCurrency(parseAmount(transaction.amount))
  const clickable = Boolean(onOpen)

  return (
    <div
      className={`my-home-tx__row${clickable ? ' my-home-tx__row--clickable' : ''}`}
      onClick={onOpen}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpen?.()
              }
            }
          : undefined
      }
    >
      <div className={`my-home-tx__icon my-home-tx__icon--${isCredit ? 'credit' : 'debit'}`}>
        <Icon size={16} />
      </div>
      <div className="my-home-tx__body">
        <p className="my-home-tx__title">{transaction.category}</p>
        {transaction.additional_information ? (
          <p className="my-home-tx__sub">{transaction.additional_information}</p>
        ) : null}
        {transaction.payment_method ? (
          <p className="my-home-tx__meta">{transaction.payment_method}</p>
        ) : null}
      </div>
      <div className="my-home-tx__amount-col">
        <p className={`my-home-tx__amount my-home-tx__amount--${isCredit ? 'credit' : 'debit'}`}>
          {isCredit ? '+' : '-'}
          {amount}
        </p>
      </div>
    </div>
  )
}

function proofStatusLabel(bill: PendingBill) {
  if (!bill.proof_file) return null
  if (bill.proof_status === 'rejected') return 'Proof rejected — please re-upload'
  if (bill.proof_status === 'approved') return 'Proof approved'
  return 'Proof uploaded — pending review'
}

function PendingBillCard({
  bill,
  onPay,
  onProof,
  loading,
}: {
  bill: PendingBill
  onPay: (bill: PendingBill) => void
  onProof: (bill: PendingBill) => void
  loading: boolean
}) {
  const proofLabel = proofStatusLabel(bill)
  const proofModifier =
    bill.proof_status === 'rejected'
      ? 'rejected'
      : bill.proof_status === 'approved'
        ? 'approved'
        : 'pending'

  return (
    <div className="my-home-tx__bill">
      <div className="my-home-tx__bill-body">
        <p className="my-home-tx__bill-reason">{bill.reason}</p>
        <p className="my-home-tx__bill-amount">{bill.amount}</p>
        <span className="my-home-list__date">
          <Clock size={13} />
          {bill.created_at}
        </span>
        {proofLabel ? (
          <span className={`my-home-tx__proof-badge my-home-tx__proof-badge--${proofModifier}`}>
            {proofLabel}
          </span>
        ) : null}
      </div>
      <div className="my-home-tx__bill-actions">
        <button
          type="button"
          className="my-home-tx__bill-pay"
          onClick={() => onPay(bill)}
          disabled={loading}
        >
          {loading ? <Loader2 size={16} className="my-home-tx__spin" /> : 'Pay'}
        </button>
        <button
          type="button"
          className="my-home-tx__bill-pay my-home-tx__bill-pay--ghost"
          onClick={() => onProof(bill)}
        >
          Proof
        </button>
      </div>
    </div>
  )
}

function BankPaymentModal({
  isOpen,
  paymentInfo,
  onClose,
  propertyUuid,
  onPaid,
  onUploadProof,
}: {
  isOpen: boolean
  paymentInfo: PendingPaymentInfo | null
  onClose: () => void
  propertyUuid: string
  onPaid: () => void
  onUploadProof: () => void
}) {
  const toast = useToast()
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [pollingStatus, setPollingStatus] = useState<'waiting' | 'success' | 'failed'>('waiting')

  const handleCopy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedField(label)
    toast.success(`${label} copied`)
    window.setTimeout(() => setCopiedField(null), 2000)
  }

  const pollForConfirmation = useCallback(async () => {
    if (!paymentInfo) return

    setIsPolling(true)
    setPollingStatus('waiting')

    let attempts = 0
    const maxAttempts = 10
    const pollInterval = 3000

    const check = async () => {
      try {
        const response = await myHomeService.checkTransactionStatus(propertyUuid, paymentInfo.id)
        if (response.data?.status === 'completed') {
          setPollingStatus('success')
          setIsPolling(false)
          onPaid()
          return
        }
      } catch {
        // keep polling until max attempts
      }

      attempts += 1
      if (attempts >= maxAttempts) {
        setPollingStatus('failed')
        setIsPolling(false)
        toast.error('Payment confirmation timed out. If you transferred, check back shortly.')
        return
      }

      window.setTimeout(check, pollInterval)
    }

    void check()
  }, [onPaid, paymentInfo, propertyUuid, toast])

  if (!paymentInfo) return null

  const currency = paymentInfo.amount_info.currency || 'NGN'

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="my-home-detail">
        <h3 className="my-home-detail__title">Bank Transfer</h3>

        {pollingStatus === 'success' ? (
          <div className="my-home-tx__poll-success">
            <Check size={32} />
            <p>Payment confirmed</p>
          </div>
        ) : isPolling ? (
          <div className="my-home-tx__poll-wait">
            <Loader2 size={28} className="my-home-tx__spin" />
            <p>Waiting for payment confirmation…</p>
          </div>
        ) : (
          <>
            <p className="my-home-tx__bank-hint">
              Transfer the exact total to the account below, then tap &quot;I&apos;ve paid&quot;.
            </p>

            <div className="my-home-tx__bank-fields">
              {[
                { label: 'Bank name', value: paymentInfo.bank_name },
                { label: 'Account number', value: paymentInfo.account_number },
                { label: 'Account name', value: paymentInfo.account_name },
              ].map((field) => (
                <div key={field.label} className="my-home-tx__bank-row">
                  <div>
                    <p className="my-home-tx__bank-label">{field.label}</p>
                    <p className="my-home-tx__bank-value">{field.value}</p>
                  </div>
                  <button
                    type="button"
                    className="my-home-detail__secondary-btn my-home-tx__copy-btn"
                    onClick={() => handleCopy(field.value, field.label)}
                  >
                    {copiedField === field.label ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </div>
              ))}

              <div className="my-home-tx__bank-row">
                <div>
                  <p className="my-home-tx__bank-label">Amount</p>
                  <p className="my-home-tx__bank-value">
                    {formatCurrency(paymentInfo.amount_info.amount, currency)}
                  </p>
                </div>
              </div>

              <div className="my-home-tx__bank-row">
                <div>
                  <p className="my-home-tx__bank-label">Fees</p>
                  <p className="my-home-tx__bank-value">
                    {formatCurrency(paymentInfo.amount_info.fees, currency)}
                  </p>
                </div>
              </div>

              <div className="my-home-tx__bank-row my-home-tx__bank-row--total">
                <div>
                  <p className="my-home-tx__bank-label">Total to transfer</p>
                  <p className="my-home-tx__bank-total">
                    {formatCurrency(paymentInfo.amount_info.total_amount, currency)}
                  </p>
                </div>
                <button
                  type="button"
                  className="my-home-detail__secondary-btn my-home-tx__copy-btn"
                  onClick={() =>
                    handleCopy(String(paymentInfo.amount_info.total_amount), 'Total amount')
                  }
                >
                  {copiedField === 'Total amount' ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
            </div>

            <PayFlowPrimaryButton onClick={() => void pollForConfirmation()}>
              I&apos;ve paid
            </PayFlowPrimaryButton>
            <button type="button" className="my-home-tx__proof-link" onClick={onUploadProof}>
              <Upload size={15} />
              Upload proof of payment
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

function ProofUploadModal({
  isOpen,
  bill,
  propertyUuid,
  onClose,
  onSubmitted,
}: {
  isOpen: boolean
  bill: PendingBill | null
  propertyUuid: string
  onClose: () => void
  onSubmitted: () => void
}) {
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<UploadedHomeFile | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setFile(null)
      setIsUploading(false)
      setIsSubmitting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [isOpen])

  if (!bill) return null

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (!selected) return

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
    if (!allowed.includes(selected.type)) {
      toast.error('Use a JPG, PNG, GIF, or PDF')
      return
    }
    if (selected.size > 20 * 1024 * 1024) {
      toast.error('File must be 20MB or smaller')
      return
    }

    setIsUploading(true)
    try {
      const response = await myHomeService.uploadHomeFile(propertyUuid, selected)
      setFile(response.data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not upload file'
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please upload a proof of payment')
      return
    }

    setIsSubmitting(true)
    try {
      await myHomeService.submitProofOfPayment(propertyUuid, bill.id, file.source)
      toast.success('Proof of payment submitted')
      onSubmitted()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not submit proof of payment'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="my-home-form">
        <h3 className="my-home-detail__title">Upload proof of payment</h3>
        <p className="my-home-form__hint">
          {bill.reason} · {bill.amount}. Upload a screenshot or receipt (JPG, PNG, PDF · max 20MB).
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,application/pdf"
          className="my-home-form__file-input"
          onChange={handleFileSelected}
          disabled={isUploading || isSubmitting}
        />
        <button
          type="button"
          className="my-home-form__upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isSubmitting}
        >
          <Upload size={16} />
          {file ? 'Replace file' : 'Choose file'}
        </button>

        {isUploading ? (
          <div className="my-home-tx__proof-file my-home-tx__proof-file--busy">Uploading…</div>
        ) : null}

        {file ? (
          <div className="my-home-tx__proof-file">
            {file.type === 'pdf' || file.source.toLowerCase().endsWith('.pdf') ? (
              <FileText size={18} />
            ) : (
              <img src={file.source} alt={file.caption} />
            )}
            <span>{file.caption}</span>
            <button
              type="button"
              className="my-home-form__media-remove"
              onClick={() => setFile(null)}
              disabled={isSubmitting}
              aria-label="Remove file"
            >
              <X size={14} />
            </button>
          </div>
        ) : null}

        <PayFlowPrimaryButton onClick={() => void handleSubmit()} disabled={!file || isUploading} loading={isSubmitting}>
          Submit proof
        </PayFlowPrimaryButton>
      </div>
    </Modal>
  )
}

export function PaymentsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { selected, selectedUuid } = useSelectedProperty()

  const pending = usePendingBills(selectedUuid)
  const history = useTransactionsInfinite(selectedUuid)
  const upward = useTransactions()

  const [bankModalOpen, setBankModalOpen] = useState(false)
  const [proofModalOpen, setProofModalOpen] = useState(false)
  const [proofBill, setProofBill] = useState<PendingBill | null>(null)
  const [loadingBillId, setLoadingBillId] = useState<string | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<PendingPaymentInfo | null>(null)

  const pendingBills = pending.data?.data ?? []
  const transactionsByDate = useMemo(
    () =>
      mergeUpwardIntoHistory(
        mergeTransactionPages(history.data?.pages ?? []),
        upward.data ?? [],
        selected,
      ),
    [history.data?.pages, selected, upward.data],
  )
  const dateKeys = sortDateKeys(Object.keys(transactionsByDate))
  const isHistoryLoading = history.isPending || upward.isPending
  const isHistoryEmpty = !isHistoryLoading && dateKeys.length === 0

  const refetchAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-home', 'transactions', 'pending', selectedUuid] }),
      queryClient.invalidateQueries({ queryKey: ['my-home', 'transactions', 'history', 'infinite', selectedUuid] }),
    ])
    setBankModalOpen(false)
    setPaymentInfo(null)
    setProofModalOpen(false)
    setProofBill(null)
  }, [queryClient, selectedUuid])

  const handlePayBill = async (bill: PendingBill) => {
    if (!selectedUuid) return

    try {
      setLoadingBillId(bill.id)
      const response = await myHomeService.getPendingPaymentInfo(selectedUuid, bill.id)
      setPaymentInfo(response.data)
      setBankModalOpen(true)
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Could not load payment details'
      toast.error(message, 'Payment unavailable')
    } finally {
      setLoadingBillId(null)
    }
  }

  const handleUploadProof = (bill: PendingBill) => {
    setProofBill(bill)
    setBankModalOpen(false)
    setProofModalOpen(true)
  }

  return (
    <>
      <PayPageShell
        title="Payments"
        subtitle={selected?.unitName || undefined}
        showBack
        onBack={() => router.push('/dashboard/my-home')}
      >
        {pendingBills.length > 0 ? (
          <div className="my-home-list__section">
            <div className="my-home-list__section-head">
              <h2 className="my-home-list__section-title">Due now</h2>
            </div>
            {pendingBills.map((bill) => (
              <PendingBillCard
                key={bill.id}
                bill={bill}
                onPay={handlePayBill}
                onProof={handleUploadProof}
                loading={loadingBillId === bill.id}
              />
            ))}
          </div>
        ) : null}

        <div className="my-home-list__section">
          <div className="my-home-list__section-head">
            <h2 className="my-home-list__section-title">Transaction history</h2>
          </div>

          {isHistoryLoading ? (
            <div className="my-home-list__loading">
              <span className="my-home-list__spinner" />
            </div>
          ) : isHistoryEmpty ? (
            <div className="my-home-list__empty">
              <div className="my-home-list__empty-icon">
                <Wallet size={24} />
              </div>
              <h4 className="my-home-list__empty-title">No transactions yet</h4>
              <p className="my-home-list__empty-desc">
                Your rent and bill payments will show up here once recorded.
              </p>
            </div>
          ) : (
            <>
              {dateKeys.map((date) => (
                <div key={date} className="my-home-tx__date-group">
                  <div className="my-home-tx__date-head">
                    <span className="my-home-tx__date-dot" />
                    <h3 className="my-home-tx__date-label">{date}</h3>
                    <span className="my-home-tx__date-line" />
                  </div>
                  <div className="my-home-tx__date-rows">
                    {transactionsByDate[date].map((transaction, index) => (
                      <TransactionRow
                        key={`${date}-${transaction.source}-${transaction.reference || index}-${transaction.category}`}
                        transaction={transaction}
                        onOpen={
                          transaction.source === 'upward' && transaction.receiptId
                            ? () => router.push(`/dashboard/receipts?id=${transaction.receiptId}`)
                            : () => toast.info('Receipts not available for this transaction.')
                        }
                      />
                    ))}
                  </div>
                </div>
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
      </PayPageShell>

      {selectedUuid ? (
        <BankPaymentModal
          isOpen={bankModalOpen}
          paymentInfo={paymentInfo}
          onClose={() => {
            setBankModalOpen(false)
            setPaymentInfo(null)
          }}
          propertyUuid={selectedUuid}
          onPaid={() => {
            toast.success('Payment received')
            void refetchAll()
          }}
          onUploadProof={() => {
            const bill = pendingBills.find((item) => item.id === paymentInfo?.id) ?? {
              id: paymentInfo?.id || '',
              amount: '',
              reason: 'Service charge',
              created_at: '',
            }
            handleUploadProof(bill)
          }}
        />
      ) : null}

      {selectedUuid ? (
        <ProofUploadModal
          isOpen={proofModalOpen}
          bill={proofBill}
          propertyUuid={selectedUuid}
          onClose={() => {
            setProofModalOpen(false)
            setProofBill(null)
          }}
          onSubmitted={() => {
            void refetchAll()
          }}
        />
      ) : null}
    </>
  )
}
