import React, { useState, useEffect } from 'react'
import { Landmark, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

const BALANCE_KEY = 'upward_demo_bank_balance'
const INITIAL_BALANCE = 1000000000.0 // 1 Billion NGN

const BANKS = [
  'Test Bank',
  'Wema Bank',
  'Providus Bank',
  'Zenith Bank',
  'Access Bank',
  'GTBank',
  'United Bank for Africa (UBA)',
  'First Bank of Nigeria',
  'Sterling Bank',
]

const DemoBank: React.FC = () => {
  const [balance, setBalance] = useState<number>(INITIAL_BALANCE)
  const [beneficiaryBank, setBeneficiaryBank] = useState<string>('Test Bank')
  const [beneficiaryAccount, setBeneficiaryAccount] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [narration, setNarration] = useState<string>('')
  
  const [loading, setLoading] = useState<boolean>(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')
  const [txReference, setTxReference] = useState<string>('')

  // Load balance from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(BALANCE_KEY)
    if (saved) {
      const parsed = parseFloat(saved)
      if (!isNaN(parsed)) {
        setBalance(parsed)
      }
    } else {
      localStorage.setItem(BALANCE_KEY, INITIAL_BALANCE.toString())
    }
  }, [])

  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(val)
  }

  const handleResetBalance = () => {
    localStorage.setItem(BALANCE_KEY, INITIAL_BALANCE.toString())
    setBalance(INITIAL_BALANCE)
    setStatus('idle')
    setMessage('')
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validations
    if (!beneficiaryAccount || beneficiaryAccount.length < 10 || !/^\d+$/.test(beneficiaryAccount)) {
      setStatus('error')
      setMessage('Please enter a valid 10-digit account number.')
      return
    }

    const transferAmount = parseFloat(amount)
    if (isNaN(transferAmount) || transferAmount <= 0) {
      setStatus('error')
      setMessage('Please enter a valid transfer amount greater than 0.')
      return
    }

    if (transferAmount > balance) {
      setStatus('error')
      setMessage('Insufficient balance in your current account.')
      return
    }

    setLoading(true)
    setStatus('idle')
    setMessage('')

    const reference = `TFD_${beneficiaryAccount}_${transferAmount}_${Date.now()}`
    setTxReference(reference)

    const payload = {
      event: 'charge.success',
      data: {
        id: Math.floor(Math.random() * 100000000),
        domain: 'test',
        status: 'success',
        reference: reference,
        amount: Math.round(transferAmount * 100), // in kobo
        gateway_response: 'Successful',
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        channel: 'dedicated_nuban',
        currency: 'NGN',
        ip_address: '127.0.0.1',
        metadata: {
          source_app: 'upward',
        },
        customer: {
          id: 999999,
          first_name: 'Test',
          last_name: 'User',
          email: 'user@test.com',
          customer_code: 'CUS_test_sim',
        },
        dedicated_account: {
          id: 888888,
          account_name: 'UPWARD MOCK DVA',
          account_number: beneficiaryAccount,
          bank: {
            name: beneficiaryBank,
            slug: beneficiaryBank.toLowerCase().replace(/\s+/g, '-'),
          },
        },
      },
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

    try {
      // Simulate real-time bank delay (800ms)
      await new Promise((resolve) => setTimeout(resolve, 800))

      const response = await fetch(`${baseUrl}/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-paystack-signature': 'mock-signature-via-demobank-admin-ui',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`)
      }

      // Deduct from balance and save
      const newBalance = balance - transferAmount
      setBalance(newBalance)
      localStorage.setItem(BALANCE_KEY, newBalance.toString())

      setStatus('success')
      setMessage(`Transfer of ${formatCurrency(transferAmount)} initiated successfully!`)
      setAmount('')
      setNarration('')
    } catch (err: any) {
      console.error('Webhook post failed:', err)
      setStatus('error')
      setMessage(`Simulation failed: ${err.message || 'Could not connect to payment backend.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container fade-in" style={{ maxWidth: '600px', margin: '40px auto' }}>
      <div className="card" style={{ padding: '32px', borderRadius: '24px', position: 'relative' }}>
        
        {/* Header section resembling DemoBank */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-muted)' }}>Hello Administrator,</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="section-title" style={{ fontSize: '26px' }}>{formatCurrency(balance)}</span>
              <button 
                onClick={handleResetBalance}
                title="Reset simulation balance to 1B NGN"
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Current Account <span style={{ color: 'var(--text)', fontWeight: 500 }}>~ 0089234553</span>
            </p>
          </div>
          <div style={{
            background: 'var(--accent-faint)',
            padding: '16px',
            borderRadius: '50%',
            color: 'var(--accent)'
          }}>
            <Landmark size={28} />
          </div>
        </div>

        <hr style={{ border: '0', borderTop: '1px solid var(--border)', marginBottom: '24px' }} />

        {/* Transfer form */}
        <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="section-label" style={{ marginBottom: '8px', display: 'block' }}>Beneficiary Bank</label>
            <select
              value={beneficiaryBank}
              onChange={(e) => setBeneficiaryBank(e.target.value)}
              className="input"
              style={{ width: '100%', height: '48px' }}
            >
              {BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="section-label" style={{ marginBottom: '8px', display: 'block' }}>Beneficiary Account</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 1230021538"
              value={beneficiaryAccount}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                if (val.length <= 10) setBeneficiaryAccount(val)
              }}
              style={{ fontSize: '15px', letterSpacing: beneficiaryAccount ? '2px' : 'normal' }}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="section-label" style={{ marginBottom: '8px', display: 'block' }}>Amount (NGN)</label>
            <input
              type="number"
              className="input"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              min="0.01"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="section-label" style={{ marginBottom: '8px', display: 'block' }}>Narration</label>
            <input
              type="text"
              className="input"
              placeholder="Simulated transfer narration"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Feedback section */}
          {status !== 'idle' && (
            <div style={{
              display: 'flex',
              gap: '12px',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: status === 'success' ? 'var(--success-faint)' : 'var(--danger-faint)',
              color: status === 'success' ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${status === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              <div style={{ marginTop: '2px' }}>
                {status === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{status === 'success' ? 'Transfer Completed' : 'Transfer Failed'}</div>
                <div style={{ opacity: 0.9 }}>{message}</div>
                {status === 'success' && txReference && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', wordBreak: 'break-all' }}>
                    Reference: <strong>{txReference}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              height: '52px',
              fontSize: '16px',
              borderRadius: '14px',
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {loading ? (
              <span className="loader" style={{ width: '18px', height: '18px', borderTopColor: '#fff' }}></span>
            ) : (
              <>
                Continue <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  )
}

export default DemoBank
