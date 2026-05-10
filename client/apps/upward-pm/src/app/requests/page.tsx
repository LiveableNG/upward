'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChevronRight, 
  Clock, 
  User, 
  MapPin, 
  FileText,
  AlertCircle,
  ArrowLeft
} from 'lucide-react'
import { useCredibilityRequests } from '@/features/pm/hooks/useCredibilityRequests'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function RequestsPage() {
  const router = useRouter()
  const { data: requests = [], isLoading } = useCredibilityRequests()

  return (
    <div className="requests-page animate-fade-in py-8 max-w-5xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-forest transition-colors mb-2"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-dark">Record Requests</h1>
          <p className="text-text-muted">Manage requests from tenants for their past payment records.</p>
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-surface rounded-2xl animate-pulse border border-border" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-ivory-dim rounded-full flex items-center justify-center mb-4">
            <FileText size={32} className="text-forest/40" />
          </div>
          <h2 className="text-xl font-bold mb-2">No Pending Requests</h2>
          <p className="text-text-muted max-w-md">
            When tenants request their past tenancy and payment records, they will appear here for you to fulfill.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <div 
              key={req.uuid}
              onClick={() => router.push(`/requests/${req.uuid}`)}
              className="group bg-surface rounded-2xl border border-border p-6 flex items-center justify-between hover:border-forest hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-forest/10 rounded-xl flex items-center justify-center text-forest group-hover:bg-forest group-hover:text-white transition-colors">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-dark">{req.tenantName}</h3>
                  <div className="flex items-center gap-4 text-sm text-text-muted mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {req.propertyAddress}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      Requested {format(new Date(req.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-warning/10 text-warning text-xs font-bold rounded-full uppercase tracking-wider">
                  Pending
                </span>
                <ChevronRight size={20} className="text-border group-hover:text-forest transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 bg-ivory-dim rounded-2xl p-8 border border-border">
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-forest/10 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle size={20} className="text-forest" />
          </div>
          <div>
            <h4 className="font-bold mb-1">How fulfillment works</h4>
            <p className="text-sm text-text-muted leading-relaxed">
              Fulfilling a request helps your tenants build their **Upward Score**. You can either upload a CSV of their payment history or enter the records manually. Once submitted, the tenant's profile will be updated automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
