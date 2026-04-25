'use client'

import React from 'react'
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  ArrowUpRight,
  PlusCircle,
  FileText,
  UserPlus
} from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import '@/styles/dashboard.css'

const stats = [
  { label: 'Total Units', value: '124', icon: Building2, trend: '+4 this month', type: 'forest' },
  { label: 'Active Tenants', value: '118', icon: Users, trend: '95% occupancy', type: 'success' },
  { label: 'Pending Payments', value: '₦4,250,000', icon: CreditCard, trend: 'Due in 5 days', type: 'warning' },
  { label: 'Total Revenue', value: '₦28.4M', icon: TrendingUp, trend: '+12% vs last year', type: 'info' },
]

const recentActivity = [
  { 
    id: 1, 
    type: 'payment', 
    text: 'Payment of <strong>₦450,000</strong> received from <strong>Chidi Okoro</strong> (Unit A4)', 
    time: '2 hours ago',
    icon: CreditCard
  },
  { 
    id: 2, 
    type: 'invite', 
    text: 'Invite accepted by <strong>Amina Yusuf</strong> (Unit B12)', 
    time: '5 hours ago',
    icon: UserPlus
  },
  { 
    id: 3, 
    type: 'unit', 
    text: 'New property <strong>Lekki Heights</strong> added with 24 units', 
    time: 'Yesterday',
    icon: PlusCircle
  },
  { 
    id: 4, 
    type: 'request', 
    text: 'Maintenance request from <strong>Unit C3</strong> (Ikeja Gardens)', 
    time: '2 days ago',
    icon: FileText
  },
]

export default function Dashboard() {
  const { success } = useToast()

  const handleQuickAction = (action: string) => {
    success(`${action} initiated successfully!`)
  }

  return (
    <div className="dashboard animate-fade-in">
      <header className="dashboard__header">
        <h1 className="dashboard__title">Welcome back, Manager</h1>
        <p className="dashboard__subtitle">Here's what's happening with your properties today.</p>
      </header>

      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className={`stat-card stat-card--${stat.type}`}>
              <div className="stat-card__icon">
                <Icon size={24} />
              </div>
              <p className="stat-card__label">{stat.label}</p>
              <h3 className="stat-card__value">{stat.value}</h3>
              <p className="stat-card__trend">
                <ArrowUpRight size={12} />
                <span>{stat.trend}</span>
              </p>
            </div>
          )
        })}
      </div>

      <div className="dashboard__content">
        <section className="section-card">
          <div className="section-header">
            <h2 className="section-title">Property Overview</h2>
            <button className="section-link">View All Properties</button>
          </div>
          
          <div className="property-summary">
            {/* Mock Property List for Nigeria Context */}
            <div className="property-item-mini">
              <div className="property-item-mini__info">
                <h4>Lekki Heights Phase 1</h4>
                <p>Lekki, Lagos • 24 Units</p>
              </div>
              <div className="property-item-mini__status property-item-mini__status--full">
                100% Occupied
              </div>
            </div>
            
            <div className="property-item-mini">
              <div className="property-item-mini__info">
                <h4>Ikeja Gardens Estate</h4>
                <p>GRA Ikeja, Lagos • 12 Units</p>
              </div>
              <div className="property-item-mini__status property-item-mini__status--partial">
                10/12 Occupied
              </div>
            </div>

            <div className="property-item-mini">
              <div className="property-item-mini__info">
                <h4>Victoria Island Apartments</h4>
                <p>VI, Lagos • 40 Units</p>
              </div>
              <div className="property-item-mini__status property-item-mini__status--full">
                100% Occupied
              </div>
            </div>
          </div>


        </section>

        <section className="section-card">
          <div className="section-header">
            <h2 className="section-title">Recent Activity</h2>
            <button className="section-link">Clear</button>
          </div>
          
          <div className="activity-list">
            {recentActivity.map((activity) => {
              const Icon = activity.icon
              return (
                <div key={activity.id} className="activity-item">
                  <div className="activity-item__icon">
                    <Icon size={16} className="text-forest" />
                  </div>
                  <div className="activity-item__content">
                    <p className="activity-item__text" dangerouslySetInnerHTML={{ __html: activity.text }} />
                    <p className="activity-item__time">
                      <Clock size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      {activity.time}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
