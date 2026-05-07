'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useCredibilityRequests } from '@/features/pm/hooks/useCredibilityRequests'
import { PageHeader } from '@/components/common/PageHeader'
import { ClipboardList, AlertCircle, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function RequestsPage() {
  const router = useRouter()
  const { data: requests = [], isLoading } = useCredibilityRequests()

  return (
    <>
      <PageHeader 
        title="Tenancy Requests" 
        subtitle="Manage past payment record requests from your former tenants."
        showBack
      />

      <div className="import-container mt-6">
        <div className="import-header">
          <div className="import-header__title-group">
            <ClipboardList className="text-forest" size={24} />
            <h2 className="import-header__title">Pending Requests</h2>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-text-muted animate-pulse">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={48} className="text-accent mb-4" />
            <h3 className="text-xl font-bold mb-2">No pending requests</h3>
            <p className="text-text-muted">When tenants request their past records, they will appear here.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tenant Name</th>
                  <th>Property</th>
                  <th>Requested Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.uuid} className="cursor-pointer hover:bg-bg transition-colors" onClick={() => router.push(`/requests/${req.uuid}`)}>
                    <td className="font-medium">{req.tenantName}</td>
                    <td>{req.propertyAddress}</td>
                    <td>{format(new Date(req.createdAt), 'MMM d, yyyy')}</td>
                    <td>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-semibold",
                        req.status === 'PENDING' ? "bg-warning/20 text-warning" : "bg-accent/20 text-accent"
                      )}>
                        {req.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="text-forest flex items-center gap-1 hover:underline font-semibold text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/requests/${req.uuid}`);
                        }}
                      >
                        Review <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
