'use client'

import React from 'react'
import { 
  Download, 
  Search, 
  Filter, 
  ArrowUpRight,
  ArrowDownLeft,
  MoreHorizontal,
  Calendar,
  Building2,
  CreditCard
} from 'lucide-react'
import '@/styles/payments.css'

const transactions = [
  { id: 'TXN-001', tenant: 'Chidi Okoro', unit: 'A101', amount: '₦450,000', date: 'Oct 24, 2024', status: 'completed', type: 'Rent' },
  { id: 'TXN-002', tenant: 'Emeka Nwosu', unit: 'B202', amount: '₦180,000', date: 'Oct 22, 2024', status: 'completed', type: 'Service Charge' },
  { id: 'TXN-003', tenant: 'Amina Yusuf', unit: 'A102', amount: '₦2,400,000', date: 'Oct 20, 2024', status: 'pending', type: 'Rent' },
  { id: 'TXN-004', tenant: 'Folake Ishola', unit: 'C301', amount: '₦450,000', date: 'Oct 18, 2024', status: 'completed', type: 'Rent' },
  { id: 'TXN-005', tenant: 'Boluwatife Adebayo', unit: 'B201', amount: '₦150,000', date: 'Oct 15, 2024', status: 'failed', type: 'Power' },
  { id: 'TXN-006', tenant: 'Chidi Okoro', unit: 'A101', amount: '₦50,000', date: 'Oct 10, 2024', status: 'completed', type: 'Security' },
]

export default function PaymentsPage() {
  return (
    <div className="payments-page animate-fade-in">
      <header className="properties-header">
        <div>
          <h1 className="dashboard__title">Payments & Transactions</h1>
          <p className="dashboard__subtitle">Track all incoming payments and manage billing flows.</p>
        </div>
        <div className="properties-header__actions">
          <button className="btn btn--secondary">
            <Download size={18} />
            Export Statement
          </button>
          <button className="btn btn--primary">
            <CreditCard size={18} />
            New Payment Request
          </button>
        </div>
      </header>

      <div className="filters-bar">
        <div className="search-input">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Search by Tenant, Unit or Transaction ID..." />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="filter-select" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={14} />
            This Month
          </button>
          <button className="filter-select" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={14} />
            Filters
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="pm-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Tenant & Unit</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn.id}>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{txn.id}</td>
                <td>
                  <div className="tenant-cell">
                    <div className="tenant-avatar">
                      {txn.tenant.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{txn.tenant}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Unit {txn.unit}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: 13 }}>{txn.type}</span>
                </td>
                <td>
                  <div className="amount-text">{txn.amount}</div>
                </td>
                <td>
                  <div style={{ fontSize: 13 }}>{txn.date}</div>
                </td>
                <td>
                  <span className={`status-chip status-chip--${txn.status}`}>
                    {txn.status}
                  </span>
                </td>
                <td>
                  <button style={{ color: 'var(--text-muted)' }}>
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginTop: 40 }}>
        <div className="stat-card" style={{ background: 'var(--clay-faint)', border: '1px solid var(--clay)' }}>
          <p className="stat-card__label" style={{ color: 'var(--clay)' }}>Total Collected (Oct)</p>
          <h3 className="stat-card__value" style={{ color: 'var(--clay)' }}>₦12,450,000</h3>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Outstanding Balance</p>
          <h3 className="stat-card__value">₦3,200,000</h3>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Pending Approvals</p>
          <h3 className="stat-card__value">8</h3>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Processing Fees</p>
          <h3 className="stat-card__value">₦85,400</h3>
        </div>
      </div>
    </div>
  )
}
