'use client'

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_SAVED_LANDLORDS = [
  {
    id: '1',
    name: 'Sunshine Properties Ltd',
    accountName: 'Sunshine Properties Ltd',
    accountNumber: '0123456789',
    bankName: 'GTBank',
    bankCode: '058',
    avatar: 'S',
    lastPaid: '2025-02-01',
    lastAmount: 180000,
  },
  {
    id: '2',
    name: 'Mr. Adebayo Okonkwo',
    accountName: 'Adebayo Okonkwo',
    accountNumber: '2098765432',
    bankName: 'Zenith Bank',
    bankCode: '057',
    avatar: 'A',
    lastPaid: '2024-12-15',
    lastAmount: 120000,
  },
]

const MOCK_PM_LANDLORDS = [
  {
    id: 'pm1',
    name: 'Realty Kings NG',
    accountName: 'Realty Kings Nigeria Ltd',
    accountNumber: '3056781234',
    bankName: 'Access Bank',
    bankCode: '044',
    avatar: 'R',
    source: 'pm',
    lastPaid: null,
    lastAmount: 0,
  },
]

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
}

type PayRentStep = 'select' | 'new' | 'confirm' | 'processing' | 'success'

// ─── ICONS (inline SVG components) ────────────────────────────────────────────
const icons = {
  ArrowLeft: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  Building2: ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
    </svg>
  ),
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  ChevronRight: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  Check: ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  ),
  Shield: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Home: ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Wallet: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  ),
  Loader: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  Star: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Receipt: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8H8M16 12H8M12 16H8" />
    </svg>
  ),
  AlertCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  ),
}

// ─── FORMATTING ───────────────────────────────────────────────────────────────
function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────

function SubpageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="subpage__header">
      <button className="subpage__back" onClick={onBack}>
        <icons.ArrowLeft />
      </button>
      <h2 className="subpage__title">{title}</h2>
      <div style={{ width: 36 }} />
    </div>
  )
}

function LandlordAvatar({ letter, size = 44, color }: { letter: string; size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: color || 'var(--clay)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.42, flexShrink: 0,
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
          Select a saved landlord or add a new payment destination.
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
            <icons.Plus />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>New landlord</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Add bank account details</div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}><icons.ChevronRight /></div>
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
            <icons.Clock />
            Last paid {formatDate(l.lastPaid)} · {formatCurrency(l.lastAmount)}
          </div>
        )}
      </div>
      <div style={{ color: 'var(--text-muted)' }}><icons.ChevronRight /></div>
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
              <icons.Loader />
            </div>
          )}
          {resolved && <div style={{ flexShrink: 0, color: 'var(--success)' }}><icons.Check size={18} /></div>}
        </div>
      </div>

      {resolved && (
        <div style={{ marginBottom: 24, padding: '12px 16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeInUp 0.3s ease-out' }}>
          <LandlordAvatar letter={form.accountName[0]} size={36} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{form.accountName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedBank?.name}</div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'var(--success)' }}><icons.Check size={16} /></div>
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
            <icons.AlertCircle />
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
          {form.save && <icons.Check size={13} />}
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
function StepConfirm({
  landlord, amount, narration, onConfirm, onBack
}: {
  landlord: Landlord
  amount: number
  narration: string
  onConfirm: () => void
  onBack: () => void
}) {
  const fee = 100
  return (
    <div style={{ padding: '0 20px 32px' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-solid)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '24px 20px', textAlign: 'center', background: 'linear-gradient(180deg, var(--clay-faint) 0%, transparent 100%)', borderBottom: '1px solid var(--border)' }}>
          <LandlordAvatar letter={landlord.avatar} size={56} style={{ margin: '0 auto 12px' } as React.CSSProperties} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{landlord.accountName}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{landlord.bankName} · {landlord.accountNumber}</div>
        </div>

        {[
          ['Amount', formatCurrency(amount)],
          ['Transaction fee', formatCurrency(fee)],
          ['Narration', narration || 'Rent payment'],
          ['Total debit', formatCurrency(amount + fee)],
        ].map(([label, value], i, arr) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: i === arr.length - 1 ? 700 : 600, color: i === arr.length - 1 ? 'var(--clay)' : 'var(--text)', fontSize: i === arr.length - 1 ? 16 : 13 } as React.CSSProperties}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20, fontSize: 11, color: 'var(--text-muted)' }}>
        <icons.Shield />
        Secured by Upward · 256-bit encryption
      </div>

      <button onClick={onConfirm} className="btn btn--primary btn--full" style={{ marginBottom: 12 }}>
        Confirm payment · {formatCurrency(amount + fee)}
      </button>
      <button onClick={onBack} className="btn btn--secondary btn--full">
        Go back
      </button>
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
        <icons.Check size={32} />
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
          <icons.Star />
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
        <icons.Receipt />
        Download receipt
      </button>
    </div>
  )
}

// ─── INPUT STYLES ─────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }
const inputWrapStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', background: 'var(--surface)', border: '1px solid var(--border-solid)', borderRadius: 'var(--radius-md)', transition: 'all 0.2s' }
const inputStyle: React.CSSProperties = { flex: 1, background: 'none', border: 'none', padding: '14px 0', fontSize: 15, fontFamily: 'var(--font)', color: 'var(--text)', outline: 'none', width: '100%' }

// ─── AMOUNT SELECTION ─────────────────────────────────────────────────────────
function StepAmount({ landlord, onContinue, onBack }: { landlord: Landlord; onContinue: (amount: number, narration: string) => void; onBack: () => void }) {
  const [amount, setAmount] = React.useState(landlord.lastAmount > 0 ? String(landlord.lastAmount) : '')
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
        onClick={() => onContinue(Number(amount), narration)}
        className="btn btn--primary btn--full"
        style={{ opacity: canProceed ? 1 : 0.4 }}
      >
        Continue
      </button>
    </div>
  )
}

// ─── MAIN PAY RENT FLOW ───────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react'

export function PayRentPage({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<PayRentStep>('select')
  const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(null)
  const [payAmount, setPayAmount] = useState(0)
  const [narration, setNarration] = useState('')
  const [isNew, setIsNew] = useState(false)

  const stepTitle: Record<PayRentStep, string> = {
    select: 'Pay Rent',
    new: 'New Landlord',
    confirm: 'Confirm Payment',
    processing: 'Processing',
    success: 'Payment Sent',
  }

  const showBack = step !== 'processing' && step !== 'success'

  function handleBack() {
    if (step === 'new') { setStep('select'); setIsNew(false) }
    else if (step === 'confirm') { setStep(isNew ? 'new' : 'select') }
    else { onBack() }
  }

  function handleSelectLandlord(l: Landlord) {
    setSelectedLandlord(l)
    if (l.lastAmount > 0) {
      setStep('confirm')
      setPayAmount(l.lastAmount)
      setNarration('Rent payment')
    } else {
      setStep('confirm')
      setPayAmount(0)
    }
    setStep('select') // reset to amount step via amount step
    // Actually show amount step
    setSelectedLandlord(l)
    setStep('confirm')
    // We'll use a separate "amount" step
  }

  return (
    <div className="subpage" style={{ paddingBottom: 120 }}>
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
          saved={MOCK_SAVED_LANDLORDS}
          pm={MOCK_PM_LANDLORDS}
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
              onConfirm={() => {
                setStep('processing')
                setTimeout(() => setStep('success'), 2800)
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

// ─── DASHBOARD PAY RENT CARD (replaces success card when no pending) ──────────
export function PayRentCard({ onOpen }: { onOpen: () => void }) {
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
            <icons.Home size={20} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Pay Rent</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Send directly to your landlord</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Transfer rent directly to any landlord's bank account — and get it recorded on your credit history.
        </p>
      </div>

      {MOCK_SAVED_LANDLORDS.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>Quick pay</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MOCK_SAVED_LANDLORDS.slice(0, 2).map(l => (
              <div
                key={l.id}
                onClick={onOpen}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--clay)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
              >
                <LandlordAvatar letter={l.avatar} size={34} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <icons.Clock />
                    Last: {formatCurrency(l.lastAmount)}
                  </div>
                </div>
                <div style={{ color: 'var(--clay)' }}><icons.ChevronRight size={14} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '14px 16px' }}>
        <button onClick={onOpen} className="btn btn--primary btn--full btn--sm">
          <icons.Wallet />
          Pay rent now
        </button>
      </div>
    </div>
  )
}