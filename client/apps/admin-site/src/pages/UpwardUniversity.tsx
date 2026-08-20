import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap,
  Building,
  Users,
  MapPin,
  Search,
  RefreshCcw,
  Eye,
  ArrowLeft,
  Phone,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { DataTable } from '../components/common/table/DataTable'
import type { ColumnDef } from '../components/common/table/DataTable'
import { Modal } from '../components/common/modal/Modal'

interface EarlyAccessRecord {
  id: string
  type: 'STUDENT' | 'LANDLORD'
  name: string
  whatsapp: string
  email?: string | null
  city: string
  ageBracket?: string | null
  experienceLevel?: string | null
  interest?: string | null
  propertyCount?: string | null
  landlordStatus?: string | null
  managementStyle?: string | null
  createdAt: string
  updatedAt: string
}

interface EarlyAccessStats {
  totalSubmissions: number
  studentCount: number
  landlordCount: number
  cityBreakdown: Array<{ city: string; count: number }>
}

interface UpwardUniversityProps {
  token: string
}

export default function UpwardUniversity({ token }: UpwardUniversityProps) {
  const [records, setRecords] = useState<EarlyAccessRecord[]>([])
  const [stats, setStats] = useState<EarlyAccessStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'STUDENT' | 'LANDLORD'>('ALL')
  const [search, setSearch] = useState('')

  // Detail Modal State
  const [selectedRecord, setSelectedRecord] = useState<EarlyAccessRecord | null>(null)

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const response = await apiService.get('/admin/early-access/stats', token)
      if (response && response.data) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch early access stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchRecords = async (pageNum = page) => {
    setLoading(true)
    try {
      let url = `/admin/early-access?page=${pageNum}&limit=50`
      if (typeFilter !== 'ALL') url += `&type=${typeFilter}`
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`

      const response = await apiService.get(url, token)
      if (response && response.data) {
        setRecords(response.data)
        setTotalPages(response.meta?.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch early access records:', error)
      showToast('Failed to load early access applications', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchRecords(page)
  }, [page, typeFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchRecords(1)
  }

  const handleRefresh = () => {
    fetchStats()
    fetchRecords(page)
    showToast('Early access records refreshed')
  }

  // Column definitions for DataTable
  const columns: ColumnDef<EarlyAccessRecord>[] = [
    {
      key: 'type',
      label: 'Application Type',
      render: (row) => {
        const isStudent = row.type === 'STUDENT'
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              background: isStudent ? '#fbf1ed' : '#f0f7f2',
              color: isStudent ? '#d97757' : '#166534',
              border: `1px solid ${isStudent ? 'rgba(217, 119, 87, 0.2)' : 'rgba(22, 101, 52, 0.2)'}`,
            }}
          >
            {isStudent ? <GraduationCap size={14} /> : <Building size={14} />}
            {isStudent ? 'Student Cohort' : 'Landlord Programme'}
          </span>
        )
      },
    },
    {
      key: 'applicant',
      label: 'Applicant',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</div>
          {row.email ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.email}</div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              No email provided
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'WhatsApp / Contact',
      render: (row) => {
        const cleanPhone = row.whatsapp.replace(/[^0-9+]/g, '')
        return (
          <a
            href={`https://wa.me/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#25D366',
              fontWeight: 500,
              fontSize: '13px',
              textDecoration: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Phone size={14} />
            {row.whatsapp}
          </a>
        )
      },
    },
    {
      key: 'city',
      label: 'City',
      render: (row) => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12.5px',
            color: 'var(--text-secondary)',
          }}
        >
          <MapPin size={13} color="var(--accent)" />
          {row.city}
        </span>
      ),
    },
    {
      key: 'details',
      label: 'Program Details',
      render: (row) => {
        if (row.type === 'STUDENT') {
          return (
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              <span>
                Age: <b>{row.ageBracket || 'N/A'}</b>
              </span>
              <span style={{ margin: '0 6px', color: 'var(--border)' }}>•</span>
              <span>
                Exp: <b>{row.experienceLevel || 'N/A'}</b>
              </span>
            </div>
          )
        }
        return (
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            <span>
              Properties: <b>{row.propertyCount || 'N/A'}</b>
            </span>
            <span style={{ margin: '0 6px', color: 'var(--border)' }}>•</span>
            <span>
              Status: <b>{row.landlordStatus || 'N/A'}</b>
            </span>
          </div>
        )
      },
    },
    {
      key: 'createdAt',
      label: 'Submitted Date',
      render: (row) => (
        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
          {new Date(row.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <button
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', gap: '6px', alignItems: 'center' }}
          onClick={(e) => {
            e.stopPropagation()
            setSelectedRecord(row)
          }}
        >
          <Eye size={13} />
          View
        </button>
      ),
    },
  ]

  return (
    <div className="page-container fade-in" style={{ paddingTop: '16px' }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to="/dashboard"
            className="btn btn-secondary"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Upward University Early Access
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Student Founding Cohort 2026 & Landlord Programme registrations
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="btn btn-secondary"
          style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      {/* ── Stats Cards Grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          className="card"
          style={{
            padding: '20px',
            borderRadius: '14px',
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
              TOTAL APPLICATIONS
            </span>
            <Users size={20} color="var(--accent)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>
            {loadingStats ? '...' : stats?.totalSubmissions || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Combined roster applications
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '20px',
            borderRadius: '14px',
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#d97757', fontWeight: 600 }}>
              STUDENT COHORT
            </span>
            <GraduationCap size={20} color="#d97757" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>
            {loadingStats ? '...' : stats?.studentCount || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {stats && stats.totalSubmissions > 0
              ? `${Math.round((stats.studentCount / stats.totalSubmissions) * 100)}% of total applications`
              : 'Founding Cohort 2026'}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '20px',
            borderRadius: '14px',
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>
              LANDLORD PROGRAMME
            </span>
            <Building size={20} color="#166534" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>
            {loadingStats ? '...' : stats?.landlordCount || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {stats && stats.totalSubmissions > 0
              ? `${Math.round((stats.landlordCount / stats.totalSubmissions) * 100)}% of total applications`
              : 'Micro-course registrations'}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '20px',
            borderRadius: '14px',
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
              TOP ACTIVE CITIES
            </span>
            <MapPin size={20} color="var(--accent)" />
          </div>
          <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {stats?.cityBreakdown && stats.cityBreakdown.length > 0 ? (
              stats.cityBreakdown.slice(0, 4).map((c) => (
                <span
                  key={c.city}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary, #f3f4f6)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {c.city}: <b>{c.count}</b>
                </span>
              ))
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No city data yet</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Type Tabs & Search Controls ── */}
      <div
        className="card"
        style={{
          padding: '16px',
          borderRadius: '14px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Type Filter Pills */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              setTypeFilter('ALL')
              setPage(1)
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: typeFilter === 'ALL' ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: typeFilter === 'ALL' ? 'var(--accent)' : 'transparent',
              color: typeFilter === 'ALL' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            All Submissions ({stats?.totalSubmissions || 0})
          </button>
          <button
            onClick={() => {
              setTypeFilter('STUDENT')
              setPage(1)
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: typeFilter === 'STUDENT' ? '1px solid #d97757' : '1px solid var(--border)',
              background: typeFilter === 'STUDENT' ? '#d97757' : 'transparent',
              color: typeFilter === 'STUDENT' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            Students ({stats?.studentCount || 0})
          </button>
          <button
            onClick={() => {
              setTypeFilter('LANDLORD')
              setPage(1)
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: typeFilter === 'LANDLORD' ? '1px solid #166534' : '1px solid var(--border)',
              background: typeFilter === 'LANDLORD' ? '#166534' : 'transparent',
              color: typeFilter === 'LANDLORD' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            Landlords ({stats?.landlordCount || 0})
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by name, whatsapp, email, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                paddingLeft: '36px',
                paddingRight: '12px',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '13px',
                width: '280px',
              }}
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ height: '38px' }}>
            Search
          </button>
        </form>
      </div>

      {/* ── Table Component ── */}
      <DataTable<EarlyAccessRecord>
        data={records}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* ── Detail Modal ── */}
      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title={selectedRecord?.name || 'Application Details'}
        description={
          selectedRecord ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px',
                fontSize: '12px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px',
                background: selectedRecord.type === 'STUDENT' ? '#fbf1ed' : '#f0f7f2',
                color: selectedRecord.type === 'STUDENT' ? '#d97757' : '#166534',
              }}
            >
              {selectedRecord.type === 'STUDENT' ? 'Student Early Access' : 'Landlord Programme'} •{' '}
              {new Date(selectedRecord.createdAt).toLocaleDateString()}
            </span>
          ) : undefined
        }
        icon={
          selectedRecord?.type === 'STUDENT' ? (
            <GraduationCap size={20} />
          ) : (
            <Building size={20} />
          )
        }
        maxWidth="560px"
        footerActions={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedRecord(null)}>
              Close
            </button>
          </div>
        }
      >
        {selectedRecord && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  WhatsApp Contact
                </div>
                <div style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)' }}>
                  {selectedRecord.whatsapp}
                </div>
              </div>
              <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Email Address
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    marginTop: '2px',
                    color: 'var(--text-primary)',
                    wordBreak: 'break-all',
                  }}
                >
                  {selectedRecord.email || 'None'}
                </div>
              </div>
              <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Target City
                </div>
                <div style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)' }}>
                  {selectedRecord.city}
                </div>
              </div>
              <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Submission ID
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    marginTop: '2px',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                  }}
                >
                  {selectedRecord.id}
                </div>
              </div>
            </div>

            {selectedRecord.type === 'STUDENT' ? (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#d97757' }}>
                  Student Cohort Answers
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Age Bracket:
                    </span>
                    <div style={{ fontWeight: 600 }}>{selectedRecord.ageBracket || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Experience:
                    </span>
                    <div style={{ fontWeight: 600 }}>
                      {selectedRecord.experienceLevel || 'N/A'}
                    </div>
                  </div>
                </div>
                {selectedRecord.interest && (
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Interest / Note:
                    </span>
                    <div
                      style={{
                        background: '#fafafa',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        marginTop: '4px',
                        fontSize: '13px',
                      }}
                    >
                      "{selectedRecord.interest}"
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#166534' }}>
                  Landlord Profile Answers
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Property Count:
                    </span>
                    <div style={{ fontWeight: 600 }}>{selectedRecord.propertyCount || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status:</span>
                    <div style={{ fontWeight: 600 }}>{selectedRecord.landlordStatus || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Management:
                    </span>
                    <div style={{ fontWeight: 600 }}>
                      {selectedRecord.managementStyle || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
