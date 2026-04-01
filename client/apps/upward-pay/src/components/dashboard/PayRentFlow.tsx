'use client'

import React, { useState, useEffect } from 'react'
import { Shield, Clock, Home, Wallet, Check, ChevronRight, Plus, Building2, ArrowLeft, Loader, Star, Receipt, AlertCircle, MapPin, ChevronUp, ChevronDown } from 'lucide-react'
import MockPaystackCheckout from '@/components/payment/MockPaystackCheckout'
import { formatCurrency } from '@/lib/utils'


const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '050', name: 'EcoBank' },
  { code: '011', name: 'First Bank' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'GTBank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '526', name: 'Moniepoint' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'ProvidusBank' },
  { code: '221', name: 'Stanbic IBTC' },
  { code: '068', name: 'Standard Chartered' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'SunTrust Bank' },
  { code: '032', name: 'Union Bank' },
  { code: '033', name: 'UBA' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '565', name: 'Carbon' },
  { code: '090267', name: 'Kuda Bank' },
  { code: '000026', name: 'Taj Bank' },
  { code: '090115', name: 'Opay' },
  { code: '120001', name: 'PalmPay' },
]

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Landlord = {
  id: string
  name: string
  accountName: string
  accountNumber: string
  bankName: string
  bankCode: string
  avatar: string
  source?: string
  lastPaid: string | null
  lastAmount: number
  role?: string
  address?: string
}

type PayRentStep = 'select' | 'new' | 'confirm' | 'checkout' | 'processing' | 'success'

// ─── FORMATTING ───────────────────────────────────────────────────────────────
// Using global formatCurrency from @/lib/utils which handles kobo conversion.
// For the rent flow, we'll keep internal state in NGN (not kobo) for easier input handling.
// But some data from PMs arrives in kobo, so we convert upon loading.

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────

function SubpageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="subpage__header">
      <button className="subpage__back" onClick={onBack}>
        <ArrowLeft size={20} />
      </button>
      <h2 className="subpage__title">{title}</h2>
      <div style={{ width: 36 }} />
    </div>
  )
}

function LandlordAvatar({ letter, size = 44, color, style }: { letter: string; size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: size, height: size, 
      borderRadius: 'var(--radius-md)',
      background: color || 'var(--clay-faint)', 
      color: color ? '#fff' : 'var(--clay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.4, flexShrink: 0,
      border: '1px solid var(--border-solid)',
      ...style,
    }}>
      {letter}
    </div>
  )
}

// ─── STEP: SELECT LANDLORD ────────────────────────────────────────────────────
function StepSelect({
  saved, pm, onSelect, onNew
}: {
  saved: Landlord[]
  pm: Landlord[]
  onSelect: (l: Landlord) => void
  onNew: () => void
}) {
  const all = [...pm, ...saved]
  return (
    <div style={{ padding: '0 0 32px' }}>
      <div style={{ padding: '20px 20px 12px' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Select a saved recipient or add a new payment destination.
        </p>
      </div>

      {all.length > 0 && (
        <>
          {pm.length > 0 && (
            <div style={{ padding: '0 20px 8px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
                From your property manager
              </p>
              {pm.map(l => (
                <LandlordCard key={l.id} landlord={l} onSelect={onSelect} tag="PM" />
              ))}
            </div>
          )}

          {saved.length > 0 && (
            <div style={{ padding: '0 20px 8px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
                Previously paid
              </p>
              {saved.map(l => (
                <LandlordCard key={l.id} landlord={l} onSelect={onSelect} />
              ))}
            </div>
          )}
        </>
      )}

      <div style={{ padding: '12px 20px 0' }}>
        <button
          onClick={onNew}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px', background: 'var(--surface)', border: '1px dashed var(--border-solid)',
            borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: 'var(--font)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--clay)'; (e.currentTarget as HTMLElement).style.background = 'var(--clay-faint)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-solid)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--clay-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clay)' }}>
            <Plus size={20} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>New recipient</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bank account or property manager</div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}><ChevronRight size={16} /></div>
        </button>
      </div>
    </div>
  )
}

function LandlordCard({ landlord: l, onSelect, tag }: { landlord: Landlord; onSelect: (l: Landlord) => void; tag?: string }) {
  return (
    <div
      onClick={() => onSelect(l)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
        background: 'var(--surface)', border: '1px solid var(--border-solid)',
        borderRadius: 'var(--radius-lg)', cursor: 'pointer', marginBottom: 10, transition: 'all 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--clay)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-solid)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
    >
      <LandlordAvatar letter={l.avatar} color={l.source === 'pm' ? '#3b82f6' : undefined} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{l.name}</span>
          {tag && (
            <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: 4, letterSpacing: '0.05em' }}>
              {tag}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.bankName} · {l.accountNumber}</div>
        {l.lastPaid && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: 'var(--text-muted)', fontSize: 11 }}>
            <Clock size={14} />
            Last paid {formatDate(l.lastPaid)} · {formatCurrency(l.lastAmount)}
          </div>
        )}
      </div>
      <div style={{ color: 'var(--text-muted)' }}><ChevronRight size={16} /></div>
    </div>
  )
}

// ─── STEP: NEW LANDLORD FORM ──────────────────────────────────────────────────
function StepNewLandlord({ onContinue, onBack }: { onContinue: (data: Partial<Landlord> & { amount: number; narration: string }) => void; onBack: () => void }) {
  const [form, setForm] = React.useState({ accountNumber: '', bankCode: '', accountName: '', amount: '', narration: '', save: true })
  const [resolving, setResolving] = React.useState(false)
  const [resolved, setResolved] = React.useState(false)

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  function resolveAccount() {
    if (form.accountNumber.length < 10 || !form.bankCode) return
    setResolving(true)
    setTimeout(() => {
      setResolving(false)
      setResolved(true)
      set('accountName', 'Emmanuel Adeyemi')
    }, 1500)
  }

  React.useEffect(() => {
    if (form.accountNumber.length === 10 && form.bankCode) {
      resolveAccount()
    } else {
      setResolved(false)
      set('accountName', '')
    }
  }, [form.accountNumber, form.bankCode])

  const selectedBank = NIGERIAN_BANKS.find(b => b.code === form.bankCode)
  const canProceed = resolved && Number(form.amount) >= 1000

  return (
    <div style={{ padding: '0 20px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Bank</label>
        <div style={inputWrapStyle}>
          <select
            value={form.bankCode}
            onChange={e => set('bankCode', e.target.value)}
            style={{ ...inputStyle, appearance: 'none', background: 'transparent' }}
          >
            <option value="">Select bank</option>
            {NIGERIAN_BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Account number</label>
        <div style={{ ...inputWrapStyle, borderColor: resolving ? 'var(--warning)' : resolved ? 'var(--success)' : 'var(--border-solid)' }}>
          <input
            type="number"
            placeholder="10-digit account number"
            maxLength={10}
            value={form.accountNumber}
            onChange={e => set('accountNumber', e.target.value.slice(0, 10))}
            style={inputStyle}
          />
          {resolving && (
            <div style={{ flexShrink: 0, color: 'var(--warning)', animation: 'spin 1s linear infinite' }}>
              <Loader size={20} />
            </div>
          )}
          {resolved && <div style={{ flexShrink: 0, color: 'var(--success)' }}><Check size={18} /></div>}
        </div>
      </div>

      {resolved && (
        <div style={{ marginBottom: 24, padding: '12px 16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeInUp 0.3s ease-out' }}>
          <LandlordAvatar letter={form.accountName[0]} size={36} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{form.accountName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedBank?.name}</div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'var(--success)' }}><Check size={16} /></div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Amount (₦)</label>
        <div style={inputWrapStyle}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-muted)', paddingLeft: 2 }}>₦</span>
          <input
            type="number"
            placeholder="0"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            style={{ ...inputStyle, fontSize: 18, fontWeight: 700 }}
          />
        </div>
        {Number(form.amount) > 0 && Number(form.amount) < 1000 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: 'var(--warning)', fontSize: 12 }}>
            <AlertCircle size={16} />
            Minimum payment is ₦1,000
          </div>
        )}
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Narration <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
        <div style={inputWrapStyle}>
          <input
            type="text"
            placeholder="e.g. March rent payment"
            value={form.narration}
            onChange={e => set('narration', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div
        onClick={() => set('save', !form.save)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border-solid)', borderRadius: 'var(--radius-md)', cursor: 'pointer', marginBottom: 24 }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: 6, border: `2px solid ${form.save ? 'var(--clay)' : 'var(--border-solid)'}`,
          background: form.save ? 'var(--clay)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s', flexShrink: 0,
        }}>
          {form.save && <Check size={13} />}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Save for future payments</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Quickly pay this landlord next time</div>
        </div>
      </div>

      <button
        disabled={!canProceed}
        onClick={() => {
          if (!canProceed) return
          onContinue({
            id: Date.now().toString(),
            name: form.accountName,
            accountName: form.accountName,
            accountNumber: form.accountNumber,
            bankName: selectedBank?.name || '',
            bankCode: form.bankCode,
            avatar: form.accountName[0],
            amount: Number(form.amount),
            narration: form.narration,
            lastPaid: null,
            lastAmount: 0,
          })
        }}
        className="btn btn--primary btn--full"
        style={{ opacity: canProceed ? 1 : 0.4 }}
      >
        Review payment
      </button>
    </div>
  )
}

// ─── STEP: CONFIRM ────────────────────────────────────────────────────────────
import InvoiceCard from '@/components/payment/InvoiceCard'

function StepConfirm({
  landlord, amount, narration, onConfirm, onBack, isPriorityRequest, useSavings, onToggleSavings, savingsBalance, onPayOther, lineItems = []
}: {
  landlord: Landlord
  amount: number
  narration: string
  onConfirm: () => void
  onBack: () => void
  isPriorityRequest?: boolean
  useSavings: boolean
  onToggleSavings: (v: boolean) => void
  savingsBalance: number
  onPayOther?: () => void
  lineItems?: Array<{ label: string; amount: number }>
}) {
  const fee = 0
  const savingsToUse = useSavings ? Math.min(savingsBalance, amount) : 0
  const balanceDue = amount - savingsToUse
  const totalDebit = balanceDue + fee

  return (
    <div style={{ padding: '0 20px 40px' }}>
      {/* Refined Header (Matches Pay Page) */}
      <div style={{ padding: '20px 0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <LandlordAvatar letter={landlord.avatar} size={48} style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{landlord.name}</h3>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--success)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>
                     <Check size={10} strokeWidth={4} />
                  </div>
               </div>
               <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>{landlord.role || 'Property Manager'}</p>
            </div>
         </div>
         
         <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <MapPin size={14} color="var(--text-muted)" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {landlord.address || 'Lekki Phase 1, Lagos'}
            </span>
         </div>
      </div>

      <div style={{ 
        padding: '24px 20px', 
        background: 'var(--surface)', 
        border: '1px solid var(--border-solid)', 
        borderRadius: 'var(--radius-xl)', 
        textAlign: 'center', 
        marginBottom: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
         <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Amount Due</span>
         <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)' }}>{formatCurrency(amount)}</span>
      </div>

      {/* Collapsible Invoice Breakdown (Consistent with Pay Page) */}
      <div style={{ marginBottom: 20 }}>
        <InvoiceCard 
          invoiceNumber={landlord.accountNumber.slice(-6)}
          notes={narration}
          lineItems={lineItems.length > 0 ? lineItems : [{ label: 'Rent Payment', amount: amount }]}
          totalAmount={amount}
          isPriority={isPriorityRequest}
        />
      </div>

      {/* Savings Wallet Card */}
      <div style={{
        background: useSavings ? 'var(--clay-faint)' : 'var(--surface)',
        border: `1px solid ${useSavings ? 'var(--clay)' : 'var(--border-solid)'}`,
        padding: '16px',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '20px',
        transition: 'all 0.2s ease',
        boxShadow: useSavings ? '0 10px 25px -10px var(--clay-glow)' : 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'var(--clay-faint)', color: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={18} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>Savings Wallet</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Available: {formatCurrency(savingsBalance)}</p>
            </div>
          </div>
          <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
            <input 
              type="checkbox" 
              checked={useSavings} 
              onChange={(e) => onToggleSavings(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: useSavings ? 'var(--clay)' : '#ccc',
              transition: '.4s',
              borderRadius: '34px'
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '16px', width: '16px',
                left: useSavings ? '20px' : '4px',
                bottom: '3px',
                backgroundColor: 'white',
                transition: '.4s',
                borderRadius: '50%'
              }} />
            </span>
          </label>
        </div>
        
        {useSavings && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed rgba(217,119,87,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Savings applied</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--clay)' }}>-{formatCurrency(savingsToUse)}</span>
          </div>
        )}
      </div>

      <div style={{ padding: '0 4px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Total To Pay</span>
          <span style={{ fontSize: 24, fontWeight: 801, color: 'var(--text)' }}>{formatCurrency(totalDebit)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20, fontSize: 11, color: 'var(--text-muted)' }}>
        <Shield size={12} />
        Secured by Upward · 256-bit encryption
      </div>

      <button onClick={onConfirm} className="btn btn--primary btn--full" style={{ marginBottom: 12, height: 56, fontSize: 16 }}>
        {balanceDue <= 0 ? 'Pay with Savings' : `Confirm & Pay`}
      </button>
      {isPriorityRequest && onPayOther ? (
        <button onClick={onPayOther} className="btn btn--secondary btn--full" style={{ height: 50 }}>
          Pay manual transfer instead
        </button>
      ) : (
        <button onClick={onBack} className="btn btn--secondary btn--full" style={{ height: 50 }}>
          Go back
        </button>
      )}
    </div>
  )
}

// ─── STEP: PROCESSING ────────────────────────────────────────────────────────
function StepProcessing() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', gap: 20 }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid var(--border-solid)', borderTopColor: 'var(--clay)', animation: 'spin 1s linear infinite', boxShadow: '0 0 30px var(--clay-glow)' }} />
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Processing transfer</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>This usually takes a few seconds</div>
      </div>
    </div>
  )
}

// ─── STEP: SUCCESS ────────────────────────────────────────────────────────────
function StepSuccess({ landlord, amount, onDone }: { landlord: Landlord; amount: number; onDone: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px 32px', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--success) 0%, #16a34a 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(34,197,94,0.3)', marginBottom: 24, animation: 'successPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        <Check size={32} />
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Payment sent!</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28, maxWidth: 300 }}>
        Your rent of <strong style={{ color: 'var(--text)' }}>{formatCurrency(amount)}</strong> has been sent to <strong style={{ color: 'var(--text)' }}>{landlord.accountName}</strong>.
      </p>

      <div style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border-solid)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 28 }}>
        {[
          ['Recipient', landlord.accountName],
          ['Bank', landlord.bankName],
          ['Account', landlord.accountNumber],
          ['Amount', formatCurrency(amount)],
          ['Status', '✓ Successful'],
          ['Reference', `UPW${Date.now().toString().slice(-8)}`],
        ].map(([label, value], i, arr) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 18px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: value.startsWith('✓') ? 'var(--success)' : 'var(--text)' }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ width: '100%', padding: '20px', background: 'linear-gradient(135deg, var(--clay-faint) 0%, transparent 100%)', border: '1px solid rgba(217,119,87,0.12)', borderRadius: 'var(--radius-lg)', marginBottom: 24, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Star size={14} fill="currentColor" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Rent credit recorded</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          This payment contributes to your rent credit score, helping you build your financial history.
        </p>
      </div>

      <button onClick={onDone} className="btn btn--primary btn--full" style={{ marginBottom: 10 }}>
        Back to dashboard
      </button>
      <button className="btn btn--secondary btn--full">
        <Receipt size={20} />
        Download receipt
      </button>
    </div>
  )
}

// ─── INPUT STYLES ─────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }
const inputWrapStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', background: 'var(--surface)', border: '1px solid var(--border-solid)', borderRadius: 'var(--radius-md)', transition: 'all 0.2s' }
const inputStyle: React.CSSProperties = { flex: 1, background: 'none', border: 'none', padding: '14px 0', fontSize: 15, fontFamily: 'var(--font)', color: 'var(--text)', outline: 'none', width: '100%' }

// ─── STEP: AMOUNT SELECTION ───────────────────────────────────────────────────
function StepAmount({ landlord, onContinue, onBack }: { landlord: Landlord; onContinue: (amount: number, narration: string) => void; onBack: () => void }) {
  const [amount, setAmount] = React.useState(landlord.lastAmount > 0 ? String(landlord.lastAmount / 100) : '')
  const [narration, setNarration] = React.useState('')
  const presets = [50000, 100000, 150000, 200000]
  const canProceed = Number(amount) >= 1000

  return (
    <div style={{ padding: '0 20px 32px' }}>
      <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border-solid)', borderRadius: 'var(--radius-lg)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <LandlordAvatar letter={landlord.avatar} size={40} color={landlord.source === 'pm' ? '#3b82f6' : undefined} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{landlord.accountName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{landlord.bankName} · {landlord.accountNumber}</div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Amount (₦)</label>
        <div style={{ ...inputWrapStyle, borderColor: Number(amount) >= 1000 ? 'var(--clay)' : 'var(--border-solid)' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-muted)' }}>₦</span>
          <input
            type="number"
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ ...inputStyle, fontSize: 22, fontWeight: 700 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button
            key={p}
            onClick={() => setAmount(String(p))}
            style={{
              padding: '7px 14px', borderRadius: 20, border: `1px solid ${amount === String(p) ? 'var(--clay)' : 'var(--border-solid)'}`,
              background: amount === String(p) ? 'var(--clay-faint)' : 'var(--surface)', color: amount === String(p) ? 'var(--clay)' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s',
            }}
          >
            {formatCurrency(p)}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>Narration <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
        <div style={inputWrapStyle}>
          <input
            type="text"
            placeholder="e.g. March rent"
            value={narration}
            onChange={e => setNarration(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <button
        disabled={!canProceed}
        onClick={() => onContinue(Math.round(Number(amount) * 100), narration)}
        className="btn btn--primary btn--full"
        style={{ opacity: canProceed ? 1 : 0.4 }}
      >
        Continue
      </button>
    </div>
  )
}

// ─── MAIN PAY RENT PAGE ───────────────────────────────────────────────────────
export function PayRentPage({
  onBack,
  pendingPayments = [],
  savedLandlords = [],
  savingsBalance = 0,
}: {
  onBack: () => void
  pendingPayments?: any[]
  savedLandlords?: any[]
  savingsBalance?: number
}) {
  const [isPriorityRequest, setIsPriorityRequest] = useState(pendingPayments.length > 0)
  const [isDismissedPriority, setIsDismissedPriority] = useState(false)
  
  const initialStep: PayRentStep = (isPriorityRequest && !isDismissedPriority) ? 'confirm' : 'select'
  const [step, setStep] = useState<PayRentStep>(initialStep)
  
  const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(pendingPayments.length > 0 ? {
    id: pendingPayments[0].uuid,
    name: pendingPayments[0].company_name,
    accountName: pendingPayments[0].company_name,
    accountNumber: pendingPayments[0].invoice_number || 'INV-REQ',
    bankName: pendingPayments[0].company_name,
    bankCode: '',
    avatar: (pendingPayments[0].company_name || 'L')[0],
    source: 'pm',
    lastPaid: null,
    lastAmount: pendingPayments[0].total_amount,
  } : null)

  const [payAmount, setPayAmount] = useState(pendingPayments.length > 0 ? pendingPayments[0].total_amount : 0)
  const [narration, setNarration] = useState(pendingPayments.length > 0 ? pendingPayments[0].notes : '')
  const [isNew, setIsNew] = useState(false)
  const [useSavings, setUseSavings] = useState(savingsBalance > 0)

  // Map API saved landlords to internal Landlord format
  const mappedSaved: Landlord[] = savedLandlords.map(l => ({
    id: l.uuid,
    name: l.name,
    accountName: l.account_name,
    accountNumber: l.account_number,
    bankName: l.bank_name,
    bankCode: l.bank_code,
    avatar: l.name[0],
    lastPaid: l.last_paid,
    lastAmount: l.last_amount,
  }))

  const stepTitle: Record<PayRentStep, string> = {
    select: 'Pay Rent',
    new: 'New Recipient',
    confirm: 'Confirm Payment',
    checkout: 'Checkout',
    processing: 'Processing',
    success: 'Payment Sent',
  }

  const showBack = step !== 'processing' && step !== 'success' && step !== 'checkout'

  function handleBack() {
    if (isPriorityRequest && !isDismissedPriority && step === 'confirm') { 
      onBack() 
    }
    else if (step === 'new') { setStep('select'); setIsNew(false) }
    else if (step === 'confirm') { setStep(isNew ? 'new' : 'select') }
    else { onBack() }
  }

  function handlePayOther() {
    setIsDismissedPriority(true)
    setStep('select')
    setSelectedLandlord(null)
    setPayAmount(0)
    setNarration('')
  }

  // Calculate final checkout amount
  const savingsToUse = useSavings ? Math.min(savingsBalance, payAmount) : 0
  const totalToPay = payAmount - savingsToUse

  return (
    <div className="subpage" style={{ paddingBottom: 120 }}>
      {step === 'checkout' && selectedLandlord && (
        <MockPaystackCheckout
          email="tenant@example.com"
          amount={totalToPay}
          currency="NGN"
          reference={`REF-${Date.now()}`}
          companyName={selectedLandlord.name}
          onSuccess={() => {
            setStep('processing')
            setTimeout(() => setStep('success'), 2000)
          }}
          onClose={() => setStep('confirm')}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes successPop { 0% { transform: scale(0); } 100% { transform: scale(1); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <SubpageHeader
        title={stepTitle[step]}
        onBack={showBack ? handleBack : () => {}}
      />
      
      {step === 'select' && (
        <StepSelect
          saved={mappedSaved}
          pm={[]}
          onSelect={l => {
            setSelectedLandlord(l)
            setIsNew(false)
            setStep('confirm')
          }}
          onNew={() => { setIsNew(true); setStep('new') }}
        />
      )}

      {step === 'new' && (
        <StepNewLandlord
          onContinue={data => {
            setSelectedLandlord(data as Landlord)
            setPayAmount(data.amount)
            setNarration(data.narration)
            setStep('confirm')
          }}
          onBack={() => setStep('select')}
        />
      )}

      {step === 'confirm' && selectedLandlord && (
        <>
          {payAmount === 0 ? (
            <StepAmount
              landlord={selectedLandlord}
              onContinue={(amt, nar) => { setPayAmount(amt); setNarration(nar); setStep('confirm') }}
              onBack={handleBack}
            />
          ) : (
            <StepConfirm
              landlord={selectedLandlord}
              amount={payAmount}
              narration={narration || 'Rent payment'}
              isPriorityRequest={isPriorityRequest && !isDismissedPriority}
              useSavings={useSavings}
              onToggleSavings={setUseSavings}
              savingsBalance={savingsBalance}
              onPayOther={handlePayOther}
              lineItems={isPriorityRequest && !isDismissedPriority && pendingPayments[0]?.lineItems?.length > 0
                ? pendingPayments[0].lineItems.map((li: any) => ({ label: li.label, amount: li.amount }))
                : []}
              onConfirm={() => {
                if (payAmount + 100 <= savingsBalance && useSavings) {
                  setStep('processing')
                  setTimeout(() => setStep('success'), 2000)
                } else {
                  setStep('checkout')
                }
              }}
              onBack={handleBack}
            />
          )}
        </>
      )}

      {step === 'processing' && <StepProcessing />}

      {step === 'success' && selectedLandlord && (
        <StepSuccess landlord={selectedLandlord} amount={payAmount} onDone={onBack} />
      )}
    </div>
  )
}

// ─── DASHBOARD PAY RENT CARD ──────────────────────────────────────────────────
export function PayRentCard({ onOpen, compact, savedLandlords = [] }: { onOpen: () => void; compact?: boolean; savedLandlords?: any[] }) {
  if (compact) {
    return (
      <div
        onClick={onOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px',
          background: 'var(--surface)',
          border: '1px solid var(--border-solid)',
          borderRadius: 'var(--radius-lg)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          animation: 'fadeInUp 0.5s ease-out backwards',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--clay)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-solid)' }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--clay-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clay)', flexShrink: 0 }}>
          <Home size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Send Rent Payment</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Quick transfer to any recipient</div>
        </div>
        <div style={{ color: 'var(--clay)' }}>
          <ChevronRight size={20} />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        margin: '0 0 24px 0',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        border: '1px solid var(--border-solid)',
        background: 'var(--surface)',
        animation: 'fadeInUp 0.5s ease-out backwards',
      }}
    >
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--clay-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clay)' }}>
            <Home size={20} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Pay Rent</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Send directly to any recipient</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Transfer rent directly to any bank account — recorded on your credibility history.
        </p>
      </div>

      {savedLandlords.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>Quick pay</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savedLandlords.slice(0, 2).map(l => (
              <div
                key={l.uuid}
                onClick={onOpen}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--clay)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
              >
                <LandlordAvatar letter={l.name[0]} size={32} />
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{l.name}</div>
                <ChevronRight size={14} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: 16 }}>
        <button className="btn btn--primary btn--full btn--sm" onClick={onOpen}>
          {savedLandlords.length > 0 ? 'New Payment' : 'Pay Rent'}
        </button>
      </div>
    </div>
  )
}