'use client'

import React, { useState, useMemo } from 'react'
import { 
  ChevronLeft, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  Circle, 
  FileText, 
  Download,
  Info,
  Clock,
  TrendingUp,
  MapPin,
  Plus
} from 'lucide-react'
import { Property, Unit } from '../../services/propertyService'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface GenerateLandlordReportViewProps {
  landlordName: string
  properties: Property[]
  units: Unit[]
  onBack: () => void
  onGenerate: (content: string) => void
}

export function GenerateLandlordReportView({ 
  landlordName, 
  properties, 
  units, 
  onBack,
  onGenerate
}: GenerateLandlordReportViewProps) {
  // Selection State
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedPropertyUuids, setSelectedPropertyUuids] = useState<string[]>(properties.map(p => p.uuid))
  
  const [sections, setSections] = useState({
    summary: true,
    rentHistory: true,
    stateOfProperty: true,
    transactions: false
  })

  // Derived Data for Preview
  const selectedProperties = useMemo(() => 
    properties.filter(p => selectedPropertyUuids.includes(p.uuid)),
  [properties, selectedPropertyUuids])

  const selectedUnits = useMemo(() => 
    units.filter(u => {
      const prop = properties.find(p => p.id === u.propertyId || p.uuid === (u as any).propertyUuid)
      return prop && selectedPropertyUuids.includes(prop.uuid)
    }),
  [units, properties, selectedPropertyUuids])

  const totalRent = selectedUnits.reduce((sum, u) => sum + u.rentAmount, 0)
  const occupiedUnits = selectedUnits.filter(u => u.status === 'OCCUPIED').length
  const vacantUnits = selectedUnits.length - occupiedUnits

  const toggleProperty = (uuid: string) => {
    setSelectedPropertyUuids(prev => 
      prev.includes(uuid) ? prev.filter(u => u !== uuid) : [...prev, uuid]
    )
  }

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="generate-report animate-fade-in" style={{ paddingBottom: 100 }}>
      <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
            <ChevronLeft size={18} /> Back
          </button>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--dark)' }}>Generate Landlord Report</h1>
        </div>
        <button 
          className="btn btn--primary" 
          style={{ borderRadius: 100, padding: '12px 32px' }}
          onClick={() => {
            const previewEl = document.getElementById('report-preview')
            onGenerate(previewEl?.innerHTML || '')
          }}
        >
          Proceed to Send
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 40, alignItems: 'start' }}>
        
        {/* Left Sidebar: Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Date Range Selector */}
          <div className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'var(--dark)' }}>Select Date Range</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'block' }}>START DATE</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'block' }}>END DATE</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}
                />
              </div>
            </div>
            <button 
              onClick={() => { setStartDate(format(new Date(), 'yyyy-MM-dd')); setEndDate(format(new Date(), 'yyyy-MM-dd')) }}
              style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginLeft: 'auto' }}
            >
              Reset Dates
            </button>
          </div>

          {/* Property Selector */}
          <div className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'var(--dark)' }}>Select Properties</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {properties.map(prop => (
                <div 
                  key={prop.uuid}
                  onClick={() => toggleProperty(prop.uuid)}
                  style={{ 
                    padding: 16, 
                    borderRadius: 16, 
                    border: '1px solid var(--border)', 
                    display: 'flex', 
                    gap: 12, 
                    cursor: 'pointer',
                    background: selectedPropertyUuids.includes(prop.uuid) ? 'var(--ivory-dim)' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ color: selectedPropertyUuids.includes(prop.uuid) ? 'var(--forest)' : 'var(--border)', marginTop: 2 }}>
                    {selectedPropertyUuids.includes(prop.uuid) ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)' }}>{prop.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Units: {prop.totalUnits}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={10} /> {prop.address}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Sections Selector */}
          <div className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'var(--dark)' }}>Report Sections</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { key: 'summary', label: 'Property & Tenant Summary', desc: 'Property addresses and tenant information' },
                { key: 'rentHistory', label: 'Rent History', desc: 'Payment history and outstanding balances' },
                { key: 'stateOfProperty', label: 'State of Property', desc: 'Current condition and state of the property' },
                { key: 'transactions', label: 'Transactions', desc: 'Financial transactions and statements' },
              ].map(section => (
                <div 
                  key={section.key}
                  onClick={() => toggleSection(section.key as any)}
                  style={{ display: 'flex', gap: 12, cursor: 'pointer' }}
                >
                  <div style={{ color: (sections as any)[section.key] ? 'var(--forest)' : 'var(--border)', marginTop: 2 }}>
                    {(sections as any)[section.key] ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--dark)', marginBottom: 2 }}>{section.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{section.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Report Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)', marginLeft: 16 }}>Report Preview</h2>
          
          <div id="report-preview" style={{ 
            background: 'white', 
            borderRadius: 32, 
            padding: '60px 48px', 
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border)',
            minHeight: '1000px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {/* Report Header */}
            <div style={{ marginBottom: 40 }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>{format(new Date(), 'MMMM d, yyyy')}</p>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginBottom: 12 }}>Dear {landlordName},</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                We are pleased to provide you with the latest information regarding the state of your properties for the period of 
                <span style={{ fontWeight: 700, color: 'var(--dark)' }}> {format(new Date(startDate), 'MMM d, yyyy')} </span> to 
                <span style={{ fontWeight: 700, color: 'var(--dark)' }}> {format(new Date(endDate), 'MMM d, yyyy')}</span>.
              </p>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 12 }}>
                First, we would like to note that the property and occupancy status currently stand at:
              </p>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 600 }}>
                <div style={{ color: 'var(--text-muted)' }}>Number of Properties: <span style={{ color: 'var(--dark)' }}>{selectedProperties.length}</span></div>
                <div style={{ color: 'var(--text-muted)' }}>Number of units: <span style={{ color: 'var(--dark)' }}>{selectedUnits.length}</span></div>
                <div style={{ color: 'var(--text-muted)' }}>Number of occupants: <span style={{ color: 'var(--dark)' }}>{occupiedUnits}</span></div>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 16 }}>
                Below is a detailed breakdown of your portfolio performance during this period.
              </p>
            </div>

            {/* Portfolio Summary Section */}
            <div style={{ marginBottom: 48 }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Portfolio Summary</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                {[
                  { label: 'Properties', value: selectedProperties.length },
                  { label: 'Units', value: selectedUnits.length },
                  { label: 'Tenants', value: occupiedUnits },
                  { label: 'Total Rent', value: `₦${totalRent.toLocaleString()}` },
                  { label: 'Occupied Units', value: occupiedUnits },
                  { label: 'Vacant Units', value: vacantUnits },
                ].map((stat, i) => (
                  <div key={i}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{stat.label}</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)' }}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Conditional Sections */}
            {sections.summary && (
              <div style={{ marginBottom: 48 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Property & Tenant Summary</h4>
                {selectedProperties.map(prop => (
                  <div key={prop.uuid} style={{ background: '#f8fafc', padding: 24, borderRadius: 16, marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--dark)', marginBottom: 4 }}>{prop.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{prop.address}</div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>PROPERTY DETAILS</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Address</span>
                            <span style={{ fontWeight: 600 }}>{prop.address}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Total Units</span>
                            <span style={{ fontWeight: 600 }}>{prop.totalUnits}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>MANAGEMENT DETAILS</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Manager</span>
                            <span style={{ fontWeight: 600 }}>Madam Boosh</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sections.rentHistory && (
              <div style={{ marginBottom: 48 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={14} /> Rent History
                  </div>
                </h4>
                <div style={{ background: '#f8fafc', borderRadius: 16, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Unit & Tenant</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Amount Paid</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Tenancy Period</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUnits.map(unit => (
                        <tr key={unit.uuid} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--dark)' }}>{unit.unitName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{unit.tenant?.firstName ? `${unit.tenant.firstName} ${unit.tenant.lastName}` : 'N/A'}</div>
                          </td>
                          <td style={{ padding: '16px', fontWeight: 600 }}>₦{unit.rentAmount.toLocaleString()}</td>
                          <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                            {unit.rentStartDate ? `${format(new Date(unit.rentStartDate), 'MMM yyyy')} - ${format(new Date(unit.rentDueDate || new Date()), 'MMM yyyy')}` : 'N/A'}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ 
                              padding: '4px 8px', 
                              borderRadius: 6, 
                              fontSize: 10, 
                              fontWeight: 700,
                              background: unit.status === 'OCCUPIED' ? '#dcfce7' : '#f1f5f9',
                              color: unit.status === 'OCCUPIED' ? '#15803d' : '#64748b'
                            }}>
                              {unit.status === 'OCCUPIED' ? 'Fully Paid' : 'Vacant'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {sections.stateOfProperty && (
              <div style={{ marginBottom: 48 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Info size={14} /> State of Property
                  </div>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedProperties.map(prop => (
                    <div key={prop.uuid} style={{ background: '#f8fafc', padding: 20, borderRadius: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, color: 'var(--dark)' }}>{prop.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last updated: {format(new Date(), 'M/d/yyyy')}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No critical items reported</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
