'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { request } from '@/lib/api-client'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { useToast } from '@/components/common/Toast'
import { ShieldAlert, Copy, Check, LogOut, Coins, CreditCard, RefreshCw, AlertCircle } from 'lucide-react'

interface DvaData {
  bankName: string
  accountNumber: string
  accountName: string
}

interface WalletData {
  balance: number
}

export function AccessSuspended() {
  const { logout, user, refreshUser } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
  const [dva, setDva] = useState<DvaData | null>(null)
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [minRequiredDeposit, setMinRequiredDeposit] = useState<number>(50000)
  
  // Paystack top-up states
  const [topUpAmount, setTopUpAmount] = useState<string>('')
  const [paying, setPaying] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const currentBalance = wallet?.balance ?? 0
  const deficit = Math.max(0, minRequiredDeposit - currentBalance)
  const isManuallyBlocked = !!user?.isManuallyBlocked

  const fetchData = async () => {
    try {
      const walletRes = await request<WalletData>('/pm/wallet')
      setWallet(walletRes)
      
      const dvaRes = await request<{ data: DvaData | null }>('/pm/subscription/wallet/dva')
      if (dvaRes?.data) {
        setDva(dvaRes.data)
      }

      const subRes = await request<any>('/pm/subscription')
      if (subRes?.minRequiredDeposit) {
        setMinRequiredDeposit(subRes.minRequiredDeposit)
      }
    } catch (err) {
      console.error('Failed to load access suspension billing info:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Auto-fill top-up amount with deficit when loading is finished
  useEffect(() => {
    if (!loading && deficit > 0) {
      setTopUpAmount(String(deficit))
    }
  }, [loading, deficit])

  const handleGenerateDva = async () => {
    setGenerating(true)
    try {
      const res = await request<{ data: DvaData }>('/pm/subscription/wallet/dva/generate', {
        method: 'POST',
      })
      if (res?.data) {
        setDva(res.data)
      }
    } catch (err) {
      console.error('Failed to generate virtual account:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handlePaystackTopUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountToTopUp = parseFloat(topUpAmount)
    if (!amountToTopUp || amountToTopUp <= 0 || paying) return

    if (amountToTopUp < deficit) {
      toastError(`Minimum amount required to top up is ₦${deficit.toLocaleString()}`)
      return
    }

    try {
      setPaying(true)
      
      const response = await new Promise<any>((resolve, reject) => {
        const scriptId = 'paystack-inline-js'
        let script = document.getElementById(scriptId) as HTMLScriptElement | null

        const launch = () => {
          try {
            const popup = new (window as any).PaystackPop()
            popup.newTransaction({
              key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
              email: user?.email || '',
              amount: Math.round(amountToTopUp * 100),
              currency: 'NGN',
              onSuccess: (res: any) => resolve(res),
              onCancel: () => reject(new Error('Payment cancelled')),
            })
          } catch (err) {
            reject(err)
          }
        }

        if (!script) {
          script = document.createElement('script')
          script.id = scriptId
          script.src = 'https://js.paystack.co/v2/inline.js'
          script.async = true
          script.onload = launch
          script.onerror = () => reject(new Error('Failed to load Paystack'))
          document.body.appendChild(script)
          return
        }

        if ((window as any).PaystackPop) launch()
        else script.addEventListener('load', launch)
      })

      // Verify the transaction with the backend
      await request('/pm/wallet/top-up', {
        method: 'POST',
        body: JSON.stringify({
          amount: amountToTopUp,
          reference: response.reference,
        })
      })

      setPaymentSuccess(true)
      await refreshUser()
    } catch (err: any) {
      console.error('Paystack error:', err)
      toastError(err.message || 'Payment processing failed')
    } finally {
      setPaying(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      // Refresh the authoritative user access state
      await refreshUser()
      const profile = await request<any>('/pm/auth/me')
      const walletRes = await request<WalletData>('/pm/wallet')
      setWallet(walletRes)
      const subRes = await request<any>('/pm/subscription')
      
      let latestMin = minRequiredDeposit
      if (subRes?.minRequiredDeposit) {
        latestMin = subRes.minRequiredDeposit
        setMinRequiredDeposit(subRes.minRequiredDeposit)
      }

      if (profile && !profile.isBlocked && !profile.isManuallyBlocked) {
        toastSuccess("Access restored successfully!")
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.reload()
          }
        }, 1000)
      } else {
        if (profile?.isManuallyBlocked) {
          toastError("Account suspension is still active. Please contact support.")
        } else {
          const diff = Math.max(0, latestMin - walletRes.balance)
          if (diff > 0) {
            toastError(`Access restricted. Please fund at least ₦${diff.toLocaleString()} to restore access.`)
          } else {
            toastError("Access restricted. Processing unblocking conditions...")
          }
        }
      }
    } catch (err: any) {
      console.error(err)
      toastError(err.message || "Failed to check access status")
    } finally {
      setRefreshing(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      backgroundColor: 'var(--bg)',
      fontFamily: 'var(--font-main)',
      padding: '40px 16px',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        boxSizing: 'border-box'
      }}>
        {/* Branding Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <UpwardLogo />
        </div>

        {isManuallyBlocked ? (
          <>
            {/* Administrative Ban State */}
            <div style={{ textAlign: 'center' }}>
              <h1 style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--text)',
                margin: '0 0 8px 0',
                letterSpacing: '-0.02em'
              }}>
                Account restricted
              </h1>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.5',
                margin: 0
              }}>
                Your Upward portal access has been restricted by an administrator. If you believe this is an error or would like to appeal this restriction, please contact our support team.
              </p>
            </div>

            {/* Support Callout */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: 'var(--ivory-dim)',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <AlertCircle size={20} style={{ color: 'var(--error)' }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                CUSTOMER SUPPORT EMAIL
              </div>
              <a href="mailto:hello@goodtenants.africa" style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--clay)',
                textDecoration: 'none',
                wordBreak: 'break-all'
              }}>
                hello@goodtenants.africa
              </a>
            </div>

            {/* Standard Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                style={{
                  width: '100%',
                  height: '42px',
                  backgroundColor: 'var(--clay)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Check access status
              </button>

              <button
                onClick={logout}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '8px',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <LogOut size={14} />
                Sign out of account
              </button>
            </div>
          </>
        ) : (
          <>
            {/* State and Reason Section */}
            <div style={{ textAlign: 'center' }}>
              <h1 style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--text)',
                margin: '0 0 8px 0',
                letterSpacing: '-0.02em'
              }}>
                Access unavailable
              </h1>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.5',
                margin: 0
              }}>
                Your Upward portal access is restricted because your subscription is inactive or has expired. Settle the required deposit to restore features.
              </p>
            </div>

            {/* Compact Access Status Card */}
            <div style={{
              background: 'var(--ivory-dim)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Access Status</span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--error-bg)',
                color: 'var(--error)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <ShieldAlert size={12} />
                Restricted
              </span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid var(--border)',
                  borderTopColor: 'var(--clay)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Primary Action Area: Restore access */}
                <div style={{
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  background: 'var(--surface)'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Restore access
                  </h3>

                  {/* Wallet metrics */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>WALLET BALANCE</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
                        ₦{currentBalance.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>MINIMUM REQUIRED</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '2px' }}>
                        ₦{minRequiredDeposit.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Option A: Paystack Payment Flow */}
                  <form onSubmit={handlePaystackTopUp} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Option 1: Pay online (Paystack)</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>₦</span>
                         <input
                          type="number"
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value)}
                          placeholder="Amount to Top Up"
                          style={{
                            width: '100%',
                            height: '38px',
                            padding: '8px 12px 8px 24px',
                            border: '1px solid var(--border-strong)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.875rem',
                            fontFamily: 'var(--font-main)',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={paying || parseFloat(topUpAmount) <= 0}
                        style={{
                          height: '38px',
                          padding: '0 16px',
                          backgroundColor: 'var(--forest)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Coins size={14} />
                        {paying ? 'Processing...' : 'Pay Online'}
                      </button>
                    </div>
                  </form>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                  </div>

                  {/* Option B: Bank Transfer DVA Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Option 2: Direct bank transfer</div>
                    {dva ? (
                      <div style={{
                        background: 'var(--bg)',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px dashed var(--border-strong)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bank Name</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>{dva.bankName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Name</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{dva.accountName}</span>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: '1px solid var(--border)',
                          paddingTop: '8px',
                          marginTop: '4px'
                        }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Number</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '0.025em' }}>{dva.accountNumber}</span>
                            <button
                              onClick={() => handleCopy(dva.accountNumber)}
                              style={{
                                border: 'none',
                                background: 'none',
                                padding: '4px',
                                cursor: 'pointer',
                                color: copied ? 'var(--success)' : 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Copy Account Number"
                            >
                              {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleGenerateDva}
                        disabled={generating}
                        style={{
                          height: '36px',
                          backgroundColor: 'transparent',
                          color: 'var(--clay)',
                          border: '1px solid var(--clay)',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 700,
                          fontSize: '0.8.rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        {generating ? 'Generating...' : 'Get Bank Transfer Details'}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Professional Callout */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  backgroundColor: 'var(--ivory-dim)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  alignItems: 'flex-start'
                }}>
                  <AlertCircle size={16} style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    Direct bank transfers fund your wallet balance automatically. Access will be restored immediately once the minimum deposit confirmation is received.
                  </div>
                </div>

                {/* Structured Action Hierarchy */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    style={{
                      width: '100%',
                      height: '42px',
                      backgroundColor: 'var(--clay)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    Check access status
                  </button>

                  <button
                    onClick={logout}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: '8px',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <LogOut size={14} />
                    Sign out of account
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
