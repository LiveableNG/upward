'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  Loader2,
  Wallet,
} from 'lucide-react'
import { PayPageShell, PayFlowPrimaryButton } from '@/features/dashboard/components/payment/PayPageShell'
import { Modal } from '@/components/common/Modal'
import { useToast } from '@/components/common/Toast'
import { formatCurrency } from '@/lib/utils'
import * as myHomeService from '../services/myHomeService'
import { usePendingBills, useTransactionsInfinite } from '../hooks/useMyHome'
import { useSelectedProperty } from '../context/MyHomePropertyContext'
import type { GtTransaction, PendingBill, PendingPaymentInfo } from '../types'

function parseAmount(value: string) {
  return parseFloat(value.replace(/,/g, '')) || 0
}

function mergeTransactionPages(
  pages: Array<{ data: Record<string, GtTransaction[]> }>,
): Record<string, GtTransaction[]> {
  const merged: Record<string, GtTransaction[]> = {}

  for (const page of pages) {
    for (const [date, rows] of Object.entries(page.data)) {
      merged[date] = merged[date] ? [...merged[date], ...rows] : rows
    }
  }

  return merged
}

function TransactionRow({ transaction }: { transaction: GtTransaction }) {
  const isCredit = transaction.type === 'credit'
  const Icon = isCredit ? ArrowDownLeft : ArrowUpRight

  return (
    <div className="my-home-tx__row">
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
          {transaction.amount}
        </p>
      </div>
    </div>
  )
}

function PendingBillCard({
  bill,
  onPay,
  loading,
}: {
  bill: PendingBill
  onPay: (bill: PendingBill) => void
  loading: boolean
}) {
  return (
    <div className="my-home-tx__bill">
      <div className="my-home-tx__bill-body">
        <p className="my-home-tx__bill-reason">{bill.reason}</p>
        <p className="my-home-tx__bill-amount">{bill.amount}</p>
        <span className="my-home-list__date">
          <Clock size={13} />
          {bill.created_at}
        </span>
      </div>
      <button
        type="button"
        className="my-home-tx__bill-pay"
        onClick={() => onPay(bill)}
        disabled={loading}
      >
        {loading ? <Loader2 size={16} className="my-home-tx__spin" /> : 'Pay'}
      </button>
    </div>
  )
}

function PendingBillsModal({
  isOpen,
  bills,
  loadingBillId,
  onClose,
  onPay,
}: {
  isOpen: boolean
  bills: PendingBill[]
  loadingBillId: string | null
  onClose: () => void
  onPay: (bill: PendingBill) => void
}) {
  const total = bills.reduce((sum, bill) => sum + parseAmount(bill.amount), 0)
  const currency = 'NGN'

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="my-home-detail">
        <h3 className="my-home-detail__title">Outstanding Bills</h3>
        <p className="my-home-tx__bills-total">
          Total due: <strong>{formatCurrency(total, currency)}</strong>
        </p>

        <div className="my-home-tx__bills-list">
          {bills.map((bill) => (
            <PendingBillCard
              key={bill.id}
              bill={bill}
              onPay={onPay}
              loading={loadingBillId === bill.id}
            />
          ))}
        </div>
      </div>
    </Modal>
  )
}

function BankPaymentModal({
  isOpen,
  paymentInfo,
  onClose,
  propertyUuid,
  onPaid,
}: {
  isOpen: boolean
  paymentInfo: PendingPaymentInfo | null
  onClose: () => void
  propertyUuid: string
  onPaid: () => void
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
          </>
        )}
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

  const [billsSheetOpen, setBillsSheetOpen] = useState(false)
  const [bankModalOpen, setBankModalOpen] = useState(false)
  const [loadingBillId, setLoadingBillId] = useState<string | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<PendingPaymentInfo | null>(null)
  const [hasAutoOpened, setHasAutoOpened] = useState(false)

  const pendingBills = pending.data?.data ?? []
  const transactionsByDate = useMemo(
    () => mergeTransactionPages(history.data?.pages ?? []),
    [history.data?.pages],
  )
  const dateKeys = Object.keys(transactionsByDate)
  const isHistoryEmpty = !history.isPending && dateKeys.length === 0

  useEffect(() => {
    if (pendingBills.length > 0 && !hasAutoOpened && !pending.isPending) {
      setBillsSheetOpen(true)
      setHasAutoOpened(true)
    }
  }, [hasAutoOpened, pending.isPending, pendingBills.length])

  const refetchAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-home', 'transactions', 'pending', selectedUuid] }),
      queryClient.invalidateQueries({ queryKey: ['my-home', 'transactions', 'history', 'infinite', selectedUuid] }),
    ])
    setBillsSheetOpen(false)
    setBankModalOpen(false)
    setPaymentInfo(null)
  }, [queryClient, selectedUuid])

  const handlePayBill = async (bill: PendingBill) => {
    if (!selectedUuid) return

    try {
      setLoadingBillId(bill.id)
      const response = await myHomeService.getPendingPaymentInfo(selectedUuid, bill.id)
      setPaymentInfo(response.data)
      setBillsSheetOpen(false)
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

  const footer =
    pendingBills.length > 0 ? (
      <PayFlowPrimaryButton onClick={() => setBillsSheetOpen(true)}>
        Pay bills ({pendingBills.length})
      </PayFlowPrimaryButton>
    ) : undefined

  return (
    <>
      <PayPageShell
        title="Payments"
        subtitle={selected?.unitName || undefined}
        showBack
        onBack={() => router.push('/dashboard/my-home')}
        pinFooter={!!footer}
        footer={footer}
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
                loading={loadingBillId === bill.id}
              />
            ))}
          </div>
        ) : null}

        <div className="my-home-list__section">
          <div className="my-home-list__section-head">
            <h2 className="my-home-list__section-title">Transaction history</h2>
          </div>

          {history.isPending ? (
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
                        key={`${date}-${transaction.reference || index}-${transaction.category}`}
                        transaction={transaction}
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

      <PendingBillsModal
        isOpen={billsSheetOpen}
        bills={pendingBills}
        loadingBillId={loadingBillId}
        onClose={() => setBillsSheetOpen(false)}
        onPay={handlePayBill}
      />

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
        />
      ) : null}
    </>
  )
}
