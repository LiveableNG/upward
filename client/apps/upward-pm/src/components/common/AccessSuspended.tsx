'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { request } from '@/lib/api-client'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { ShieldAlert, Copy, Check, LogOut, Coins, CreditCard, RefreshCw } from 'lucide-react'

interface DvaData {
  bankName: string
  accountNumber: string
  accountName: string
}

interface WalletData {
  balance: number
}

export function AccessSuspended() {
  const { logout, user } = useAuth()
  const [dva, setDva] = useState<DvaData | null>(null)
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      const walletRes = await request<WalletData>('/pm/wallet')
      setWallet(walletRes)
      
      const dvaRes = await request<{ data: DvaData | null }>('/pm/subscription/wallet/dva')
      if (dvaRes?.data) {
        setDva(dvaRes.data)
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

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    // Soft delay for smooth micro-animation
    setTimeout(() => setRefreshing(false), 800)
    // If the account has been unblocked in the database, a simple page reload will restore full access
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg)',
      fontFamily: 'var(--font-main)',
      padding: '24px',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99999,
      overflowY: 'auto'
    }}>
      {/* Decorative Blur Background Elements */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: 'rgba(217, 119, 87, 0.08)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        top: '10%',
        left: '15%',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        background: 'rgba(22, 101, 52, 0.05)',
        borderRadius: '50%',
        filter: 'blur(100px)',
        bottom: '10%',
        right: '15%',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '540px',
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        padding: '40px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <UpwardLogo />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--clay-faint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: 'var(--clay)',
            boxShadow: '0 0 0 8px rgba(217, 119, 87, 0.03)'
          }}>
            <ShieldAlert size={32} />
          </div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text)',
            margin: '0 0 12px 0',
            letterSpacing: '-0.025em'
          }}>
            Platform Access Suspended
          </h1>
          <p style={{
            fontSize: '0.925rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            margin: 0,
            maxWidth: '420px'
          }}>
            Hello {user?.firstName || 'Manager'}, your platform features have been locked because your account does not have an active subscription or wallet balance.
          </p>
        </div>

        {/* Content Box */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '2.5px solid var(--border)',
              borderTopColor: 'var(--clay)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Wallet Balance Card */}
            <div style={{
              background: 'var(--ivory-dim)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Coins size={20} style={{ color: 'var(--accent)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Wallet Balance
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>
                    ₦{(wallet?.balance ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--clay-faint)',
                color: 'var(--clay)'
              }}>
                INSUFFICIENT
              </span>
            </div>

            {/* Billing / Bank Transfer Details */}
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <CreditCard size={18} style={{ color: 'var(--clay)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Direct Top-Up Instructions
                </span>
              </div>

              {dva ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0 0 4px 0', lineHeight: 1.4 }}>
                    Transfer your subscription amount to the dedicated account below. Your wallet balance will update instantly.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bank Name</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>{dva.bankName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Name</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>{dva.accountName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Number</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '0.05em' }}>{dva.accountNumber}</span>
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
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.4 }}>
                    Generating a secure virtual account allows you to fund your wallet instantly via bank transfer.
                  </p>
                  <button
                    onClick={handleGenerateDva}
                    disabled={generating}
                    style={{
                      backgroundColor: 'var(--clay)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      margin: '0 auto',
                      transition: 'background 0.2s'
                    }}
                  >
                    {generating ? 'Generating Account...' : 'Generate Dedicated Transfer Account'}
                  </button>
                </div>
              )}
            </div>
            
            {/* Automatic Activation Notice */}
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              lineHeight: '1.5',
              textAlign: 'center',
              backgroundColor: 'var(--bg)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)'
            }}>
              💡 <strong>Instant Activation:</strong> Once the transfer is received, your payment is processed automatically and full portal features will unlock instantly.
            </div>

            {/* Bottom Actions */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '12px',
              borderTop: '1px solid var(--border)',
              paddingTop: '24px'
            }}>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                style={{
                  flex: 1,
                  height: '42px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s'
                }}
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Check Status
              </button>

              <button
                onClick={logout}
                style={{
                  flex: 1,
                  height: '42px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--error)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--error)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s'
                }}
              >
                <LogOut size={14} />
                Log Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
