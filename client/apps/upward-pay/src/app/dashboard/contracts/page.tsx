'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, type ContractData } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import PoweredByUpward, { UpwardLogo } from '@/components/payment/PoweredByUpward'
import { FileText, ArrowLeft, MapPin, Mail, Calendar, ClipboardList, FolderOpen, Download } from 'lucide-react'

export default function ContractsPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<ContractData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContract, setSelectedContract] = useState<ContractData | null>(null)

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/dashboard/contracts')
      return
    }
    loadContracts()
  }, [router])

  async function loadContracts() {
    try {
      const data = await api.getMyDocuments()
      setContracts(data.contracts)
    } catch {
      /* silently fail */
    } finally {
      setLoading(false)
    }
  }

  function isActive(contract: ContractData) {
    const now = new Date()
    return new Date(contract.leaseStart) <= now && new Date(contract.leaseEnd) >= now
  }

  return (
    <div className="subpage">
      <header className="subpage__header">
        <button className="subpage__back" onClick={() => router.push('/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="subpage__title">Contracts</h1>
        <div style={{ width: 36 }} />
      </header>

      {loading ? (
        <div className="pay-page__splash">
          <div className="pay-page__logo-pulse">
            <UpwardLogo size={28} color="#fff" />
          </div>
        </div>
      ) : contracts.length === 0 ? (
        <div className="dashboard__empty">
          <span className="dashboard__empty-icon"><FileText size={32} /></span>
          <p>No contracts yet. Your tenancy agreements will appear here.</p>
        </div>
      ) : (
        <div className="subpage__list">
          {contracts.map((c) => (
            <div
              key={c.uuid}
              className={`contract-card ${isActive(c) ? 'contract-card--active' : 'contract-card--expired'}`}
              onClick={() => setSelectedContract(selectedContract?.uuid === c.uuid ? null : c)}
            >
              <div className="contract-card__top">
                <div className="contract-card__left">
                  <div className="contract-card__icon"><FileText size={20} /></div>
                  <div>
                    <span className="contract-card__title">{c.title}</span>
                    <span className="contract-card__company">
                      <img
                        src={c.companyLogo}
                        alt=""
                        width={16}
                        height={16}
                        className="contract-card__company-logo"
                      />
                      {c.companyName}
                    </span>
                  </div>
                </div>
                <span
                  className={`contract-card__status ${isActive(c) ? 'contract-card__status--active' : 'contract-card__status--expired'}`}
                >
                  {isActive(c) ? '● Active' : '○ Expired'}
                </span>
              </div>

              {selectedContract?.uuid === c.uuid && (
                <div className="contract-card__details">
                  <div className="contract-card__detail-row">
                    <span><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} /> Property</span>
                    <span>{c.propertyName}</span>
                  </div>
                  <div className="contract-card__detail-row">
                    <span><Mail size={12} style={{ display: 'inline', marginRight: 4 }} /> Address</span>
                    <span>{c.propertyAddress}</span>
                  </div>
                  <div className="contract-card__detail-row">
                    <span><Calendar size={12} style={{ display: 'inline', marginRight: 4 }} /> Lease Start</span>
                    <span>{formatDate(c.leaseStart)}</span>
                  </div>
                  <div className="contract-card__detail-row">
                    <span><Calendar size={12} style={{ display: 'inline', marginRight: 4 }} /> Lease End</span>
                    <span>{formatDate(c.leaseEnd)}</span>
                  </div>
                  <div className="contract-card__detail-row">
                    <span><ClipboardList size={12} style={{ display: 'inline', marginRight: 4 }} /> Type</span>
                    <span className="contract-card__type">Tenancy Agreement</span>
                  </div>
                  <div className="contract-card__detail-row">
                    <span><FolderOpen size={12} style={{ display: 'inline', marginRight: 4 }} /> File</span>
                    <span className="contract-card__file">{c.fileName}</span>
                  </div>
                  <button
                    className="btn btn--secondary btn--sm btn--full"
                    style={{ marginTop: 12 }}
                  >
                    <Download size={14} style={{ marginRight: 8 }} /> Download Contract
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <PoweredByUpward className="pay-page__footer-badge" />
    </div>
  )
}
