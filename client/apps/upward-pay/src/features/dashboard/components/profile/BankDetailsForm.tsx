'use client'

import { useState } from 'react'
import { AlertCircle, Building2, Landmark, CheckCircle2, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'

export function BankDetailsForm() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data: bankInfo, isLoading } = useQuery({
    queryKey: ['user-bank-details'],
    queryFn: () => api.getBankDetails(),
  })

  const [accountNumber, setAccountNumber] = useState(bankInfo?.accountNumber || '')
  const [bankCode, setBankCode] = useState(bankInfo?.bankCode || '')
  const [bankName, setBankName] = useState(bankInfo?.bankName || '')
  const [accountName, setAccountName] = useState(bankInfo?.accountName || '')
  const [isVerifying, setIsVerifying] = useState(false)

  const { data: banks } = useQuery({
    queryKey: ['banks'],
    queryFn: () => api.getBanks(),
  })

  const verifyMutation = useMutation({
    mutationFn: (data: { accountNumber: string, bankCode: string }) => api.resolveAccount(data.accountNumber, data.bankCode),
    onSuccess: (data) => {
      setAccountName(data.account_name)
      setBankName(banks?.find(b => b.code === bankCode)?.name || '')
      toast.success('Account verified successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Could not verify account details')
    }
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.saveBankDetails(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bank-details'] })
      toast.success('Settlement details saved successfully.')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to save bank details')
    }
  })

  const handleVerify = async () => {
    if (accountNumber.length === 10 && bankCode) {
      setIsVerifying(true)
      try {
        await verifyMutation.mutateAsync({ accountNumber, bankCode })
      } finally {
        setIsVerifying(false)
      }
    }
  }

  if (isLoading) return <div className="p-4 animate-pulse bg-gray-100 rounded-xl h-40" />

  return (
    <div className="bank-details-form">
      <div className="bank-details-form__alert">
        <AlertCircle size={18} />
        <div className="bank-details-form__alert-content">
          <p className="bank-details-form__alert-title">Why do we need this?</p>
          <p className="bank-details-form__alert-text">
            These details are strictly used for <strong>automated refunds</strong>. If you accidentally underpay 
            or violate a "Full Payment Only" requirement, the system will instantly send your money back to this account.
          </p>
          <p className="bank-details-form__alert-warning">
            <strong>Important:</strong> Always include the exact processing fee shown at checkout to ensure your rent is settled instantly.
          </p>
        </div>
      </div>

      <div className="bank-details-form__fields">
        <div className="form-group">
          <label>Select Bank</label>
          <select 
            value={bankCode} 
            onChange={(e) => setBankCode(e.target.value)}
            className="form-select"
          >
            <option value="">Select your bank</option>
            {banks?.map(b => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Account Number</label>
          <div className="input-with-verify">
            <Input 
              value={accountNumber} 
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="0123456789"
              maxLength={10}
            />
            <Button 
              variant="ghost" 
              onClick={handleVerify}
              disabled={accountNumber.length !== 10 || !bankCode || isVerifying}
            >
              {isVerifying ? <Loader2 className="animate-spin" size={16} /> : 'Verify'}
            </Button>
          </div>
        </div>

        {accountName && (
          <div className="bank-details-form__verified-card">
            <CheckCircle2 size={16} color="var(--success)" />
            <span>{accountName}</span>
          </div>
        )}

        <Button 
          variant="primary" 
          fullWidth 
          disabled={!accountName || saveMutation.isPending}
          onClick={() => saveMutation.mutate({ accountNumber, bankCode, bankName, accountName })}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Settlement Details'}
        </Button>
      </div>

      <style jsx>{`
        .bank-details-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 16px;
          background: var(--surface);
          border-radius: 16px;
        }
        .bank-details-form__alert {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: var(--clay-faint);
          border-radius: 12px;
          color: var(--clay);
        }
        .bank-details-form__alert-title {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
        }
        .bank-details-form__alert-text {
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 8px;
        }
        .bank-details-form__alert-warning {
          font-size: 12px;
          padding-top: 8px;
          border-top: 1px dashed rgba(var(--clay-rgb), 0.2);
        }
        .bank-details-form__fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .input-with-verify {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .bank-details-form__verified-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: var(--surface2);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
        }
        .form-select {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}
