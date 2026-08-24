'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Users, 
  Home, 
  Mail, 
  Phone, 
  Download, 
  Plus, 
  Search, 
  FileText, 
  ChevronLeft,
  ArrowRight,
  TrendingUp,
  CreditCard
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Property, Unit } from '../../services/propertyService'
import { LandlordRentTracker } from './LandlordRentTracker'
import { cn } from '@/lib/utils'

interface LandlordDetailViewProps {
  landlordName: string
  landlordEmail: string
  landlordPhone: string
  properties: Property[]
  units: Unit[]
  paymentRequests: any[]
  onBack: () => void
  onCreateReport: () => void
}

export function LandlordDetailView({ 
  landlordName, 
  landlordEmail, 
  landlordPhone, 
  properties, 
  units, 
  paymentRequests,
  onBack,
  onCreateReport
}: LandlordDetailViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'properties' | 'units' | 'rent' | 'actions'>('properties')
  const [searchQuery, setSearchQuery] = useState('')

  // Stats
  const totalProperties = properties.length
  const totalUnits = units.length
  const totalTenants = units.filter(u => u.tenantId || u.tenantUuid).length

  // Filtered Data
  const filteredProperties = useMemo(() => {
    return properties.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.address.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [properties, searchQuery])

  const filteredUnits = useMemo(() => {
    return units.filter(u => u.unitName.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [units, searchQuery])

  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [isSendingReminders, setIsSendingReminders] = useState(false)
  const [reportContent, setReportContent] = useState('')

  const { data: reports = [], isLoading: isLoadingReports } = useQuery({
    queryKey: ['landlord-reports', landlordEmail],
    queryFn: () => api.getLandlordReports(landlordEmail),
    enabled: !!landlordEmail
  })

  const handleDownloadHistory = async (reportUuid: string, subject: string) => {
    setIsDownloading(reportUuid)
    try {
      const report = await api.getLandlordReport(reportUuid)
      setReportContent(report.content)
      
      // Give React time to render the content in the hidden div
      setTimeout(async () => {
        const element = document.getElementById('history-print-container')
        if (!element) return

        const html2canvas = (await import('html2canvas')).default
        const { jsPDF } = await import('jspdf')

        element.style.display = 'block'
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
        element.style.display = 'none'

        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const imgProps = pdf.getImageProperties(imgData)
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
        pdf.save(`${subject.toLowerCase().replace(/\s+/g, '-')}.pdf`)
        setIsDownloading(null)
      }, 100)
    } catch (err) {
      console.error('Failed to download historical report:', err)
      setIsDownloading(null)
    }
  }

  const handleSendReminders = async () => {
    if (!window.confirm(`Are you sure you want to send rent reminders to all tenants under ${landlordName}?`)) return
    
    setIsSendingReminders(true)
    try {
      const res = await api.sendBulkReminders(landlordEmail)
      alert(`Successfully sent ${res.sentCount} reminders!`)
    } catch (err) {
      console.error('Failed to send bulk reminders:', err)
      alert('Failed to send reminders. Please try again.')
    } finally {
      setIsSendingReminders(false)
    }
  }

  return (
    <div className="landlord-detail animate-fade-in" style={{ paddingBottom: 60 }}>
      <header style={{ marginBottom: 32 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
          <ChevronLeft size={18} /> Back to Landlords
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 24, marginBottom: 36 }}>
        {/* Left: Profile Card */}
        <div 
          className="glass"
          style={{ 
            borderRadius: 24, 
            border: '1px solid var(--border)', 
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
            transition: 'transform 0.3s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ height: 100, background: 'var(--forest)' }} />
          <div style={{ padding: '0 24px 24px 24px', marginTop: -50, textAlign: 'center' }}>
            <div style={{ 
              width: 90, 
              height: 90, 
              borderRadius: 28, 
              background: 'var(--dark)', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: 32, 
              fontWeight: 800, 
              margin: '0 auto 16px auto',
              border: '5px solid white',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
            }}>
              {landlordName.charAt(0)}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--dark)', marginBottom: 10 }}>{landlordName}</h1>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, wordBreak: 'break-all' }}>
                <Phone size={14} color="var(--forest)" style={{ flexShrink: 0 }} /> {landlordPhone || 'No phone provided'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, wordBreak: 'break-all' }}>
                <Mail size={14} color="var(--forest)" style={{ flexShrink: 0 }} /> {landlordEmail || 'No email provided'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Properties', value: totalProperties, bg: 'var(--forest-faint)', color: 'var(--forest)' },
                { label: 'Units', value: totalUnits, bg: 'var(--ivory-dim)', color: 'var(--dark)' },
                { label: 'Tenants', value: totalTenants, bg: 'var(--accent-faint)', color: 'var(--accent)' }
              ].map((stat, i) => (
                <div key={i} style={{ background: stat.bg, padding: '14px 10px', borderRadius: 14, textAlign: 'left' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>{stat.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: stat.color, margin: 0 }}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Report History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)', margin: 0 }}>Landlord Report History</h2>
            <button 
              className="btn btn--primary" 
              style={{ borderRadius: 100, padding: '9px 20px', fontSize: 13, whiteSpace: 'nowrap' }}
              onClick={onCreateReport}
            >
              Create Report
            </button>
          </div>

          <div style={{ background: 'white', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ overflowY: 'auto', maxHeight: 300 }}>
                <table className="landlord-detail__table" style={{ minWidth: 420, width: '100%' }}>
                  <thead style={{ background: 'var(--ivory-dim)', position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ fontSize: 10, padding: '14px 20px', textAlign: 'left' }}>REPORT NAME</th>
                      <th style={{ fontSize: 10, padding: '14px 20px', textAlign: 'left' }}>DATE SENT</th>
                      <th className="col-actions" style={{ fontSize: 10, padding: '14px 20px', textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.length > 0 ? reports.map((report: any) => (
                      <tr key={report.uuid} className="tenant-table-row">
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileText size={16} color="var(--forest)" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>{report.subject}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(report.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="col-actions" style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button 
                            className="btn btn--text" 
                            onClick={() => handleDownloadHistory(report.uuid, report.subject)}
                            disabled={isDownloading === report.uuid}
                            style={{ 
                              fontSize: 12, 
                              fontWeight: 700, 
                              color: 'var(--forest)', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: 4 
                            }}
                          >
                            {isDownloading === report.uuid ? (
                              'Preparing...'
                            ) : (
                              <><Download size={14} /> Download</>
                            )}
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '50px 24px', color: 'var(--text-muted)' }}>
                          {isLoadingReports ? (
                            <div className="animate-pulse">Loading report history...</div>
                          ) : (
                            <div style={{ opacity: 0.5 }}>
                              <FileText size={32} style={{ marginBottom: 12, margin: '0 auto' }} />
                              <p style={{ margin: 0 }}>No reports generated yet.</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {reports.length > 0 && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                <button style={{ fontSize: 13, fontWeight: 700, color: 'var(--forest)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  View All History
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { id: 'properties', label: 'Properties', icon: Building2 },
            { id: 'units', label: 'Units', icon: Home },
            { id: 'rent', label: 'Rent Tracker', icon: TrendingUp },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{ 
                padding: '9px 16px', 
                borderRadius: 12, 
                fontSize: 13, 
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                background: activeTab === tab.id ? 'var(--dark)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="filters-bar" style={{ marginBottom: 20, background: 'var(--ivory-dim)', border: 'none', borderRadius: 16 }}>
          <div className="search-input" style={{ maxWidth: '100%', width: '100%' }}>
            <Search size={18} className="search-icon" color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent' }}
            />
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {activeTab === 'properties' && (
              <table className="tenant-table" style={{ minWidth: 480, width: '100%' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '14px 20px' }}>PROPERTY</th>
                    <th style={{ padding: '14px 20px' }}>UNITS</th>
                    <th style={{ padding: '14px 20px' }}>TENANTS</th>
                    <th className="col-actions" style={{ padding: '14px 20px' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map(prop => (
                    <tr key={prop.uuid} className="tenant-table-row">
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--forest-faint)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                            {prop.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--dark)' }}>{prop.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{prop.address}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 600 }}>{prop.totalUnits}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 600 }}>{units.filter(u => u.propertyId === prop.id).length}</td>
                      <td className="col-actions" style={{ padding: '16px 20px' }}>
                        <button 
                          onClick={() => router.push(`/properties/view?uuid=${prop.uuid}`)}
                          style={{ color: 'var(--forest)', fontWeight: 700, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'units' && (
              <table className="tenant-table" style={{ minWidth: 480, width: '100%' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '14px 20px' }}>UNIT NAME</th>
                    <th style={{ padding: '14px 20px' }}>TENANT</th>
                    <th style={{ padding: '14px 20px' }}>RENT</th>
                    <th style={{ padding: '14px 20px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.map(unit => (
                    <tr key={unit.uuid} className="tenant-table-row">
                      <td style={{ padding: '16px 20px', fontWeight: 700 }}>{unit.unitName}</td>
                      <td style={{ padding: '16px 20px' }}>{unit.tenant?.firstName ? `${unit.tenant.firstName} ${unit.tenant.lastName}` : 'Vacant'}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 600 }}>₦{unit.rentAmount.toLocaleString()}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span className={`badge badge--${unit.status.toLowerCase()}`} style={{ fontSize: 10 }}>{unit.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'rent' && (
              <div style={{ padding: '24px 16px' }}>
                <LandlordRentTracker units={units} paymentRequests={paymentRequests} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Print Container for Historical Report Generation */}
      <div 
        id="history-print-container" 
        style={{ 
          display: 'none', 
          width: '210mm', 
          background: 'white', 
          padding: '20mm',
          position: 'fixed',
          left: '-9999px',
          top: 0
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '15mm',
          borderBottom: '2px solid var(--forest)',
          paddingBottom: '5mm'
        }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--forest)' }}>UPWARD</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Property Management Excellence</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-muted)' }}>
            123 Real Estate Plaza, Lagos<br/>
            contact@goodtenants.io | +234 800 000 0000
          </div>
        </div>
        <div 
          style={{ fontSize: '12pt', lineHeight: 1.6, color: '#333' }} 
          dangerouslySetInnerHTML={{ __html: reportContent }} 
        />
        <div style={{ marginTop: '20mm', borderTop: '1px solid #eee', paddingTop: '5mm', fontSize: 10, color: '#999', textAlign: 'center' }}>
          This report was retrieved from Upward Property Management Archives.
        </div>
      </div>
    </div>
  )
}
