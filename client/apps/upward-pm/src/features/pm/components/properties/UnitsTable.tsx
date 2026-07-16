'use client'

import React from 'react'
import Link from 'next/link'
import { Search, Plus, FileSpreadsheet, CreditCard as CreditCardIcon, Calendar, Loader2, RefreshCw } from 'lucide-react'
import { format, isBefore, startOfDay } from 'date-fns'
import { cn, formatTenantName } from '@/lib/utils'
import { Unit, Property } from '../../services/propertyService'
import { DataTable, Column } from '@/components/common/DataTable'
import { useRouter } from 'next/navigation'
import { useSyncToUpward } from '../../hooks/useProperties'
import { useToast } from '@/components/common/Toast'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { ControlBar } from '@/components/ui/ControlBar/ControlBar'
import { SearchInput } from '@/components/ui/ControlBar/SearchInput'
import { FilterDropdown } from '@/components/ui/ControlBar/FilterDropdown'
import { FilterGroup } from '@/components/ui/ControlBar/FilterGroup'
import { Building2, Filter } from 'lucide-react'

interface UnitsTableProps {
  units: Unit[];
  properties: Property[];
  paymentRequests: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedPropertyFilter: string;
  setSelectedPropertyFilter: (filter: string) => void;
  paymentFilter: 'all' | 'pending' | 'paid';
  setPaymentFilter: (filter: 'all' | 'pending' | 'paid') => void;
  dueFilter: 'all' | 'passed' | '30days' | '60days' | '90days';
  setDueFilter: (filter: 'all' | 'passed' | '30days' | '60days' | '90days') => void;
  statusFilter?: 'all' | 'vacant' | 'occupied';
  setStatusFilter?: (filter: 'all' | 'vacant' | 'occupied') => void;
  tenantFilter?: 'all' | 'pending' | 'onboarded';
  setTenantFilter?: (filter: 'all' | 'pending' | 'onboarded') => void;
  onAddUnit: () => void;
  onBulkImport: () => void;
  onRequestPayment: (unit: Unit) => void;
  hasProperties: boolean;
}

export function UnitsTable({
  units,
  properties,
  paymentRequests,
  searchQuery,
  setSearchQuery,
  selectedPropertyFilter,
  setSelectedPropertyFilter,
  paymentFilter,
  setPaymentFilter,
  dueFilter,
  setDueFilter,
  statusFilter = 'all',
  setStatusFilter,
  tenantFilter = 'all',
  setTenantFilter,
  onAddUnit,
  onBulkImport,
  onRequestPayment,
  hasProperties
}: UnitsTableProps) {
  const router = useRouter();

  const columns: Column<Unit>[] = [
    {
      header: 'UNIT & PROPERTY',
      render: (unit) => {
        const prop = properties.find(p => p.uuid === (unit as any).propertyUuid || p.id === unit.propertyId);
        const propName = prop?.name || 'Unknown Property';
        return (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div className="tenant-avatar-small" style={{ background: 'var(--forest)', color: 'white', fontSize: '12px' }}>
              {unit.unitName.slice(0, 2).toUpperCase()}
            </div>
            <div className="tenant-name-email">
              <span className="tenant-name" style={{ fontSize: '13px', fontWeight: 600 }}>{propName}</span>
              <span className="tenant-email">Unit {unit.unitName} {prop?.address ? `• ${prop.address}` : ''}</span>
            </div>
          </div>
        )
      }
    },
    {
      header: 'TENANT',
      render: (unit) => unit.tenant ? (
        <div className="tenant-name-email">
          <span className="tenant-name" style={{ fontSize: '13px' }}>{formatTenantName(unit.tenant)}</span>
        </div>
      ) : (
        <span className="text-muted" style={{ fontSize: '13px' }}>-</span>
      )
    },
    {
      header: 'RENT AMOUNT',
      render: (unit) => (
        <div className="tenant-name-email">
          <span className="tenant-name" style={{ fontSize: '13px', fontWeight: 600 }}>₦{unit.rentAmount?.toLocaleString()}</span>
          <span className="tenant-email">{unit.rentType}</span>
        </div>
      )
    },
    {
      header: 'DUE DATE',
      render: (unit) => unit.rentDueDate ? (
        <div className="tenant-name-email">
          <span 
            className="tenant-name" 
            style={{ 
              fontSize: '12px', 
              fontWeight: 600,
              color: isBefore(new Date(unit.rentDueDate), startOfDay(new Date())) ? '#ef4444' : 'inherit'
            }}
          >
            {format(new Date(unit.rentDueDate), 'MMM d, yyyy')}
          </span>
        </div>
      ) : (
        <span className="text-muted" style={{ fontSize: '12px' }}>Not Set</span>
      )
    },
    {
      header: 'STATUS',
      render: (unit) => {
        const unitRequests = paymentRequests?.filter(r => r.unitId === unit.id) || [];
        const pendingRequest = unitRequests
          .filter(r => r.status !== 'PAID')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <span className={`badge badge--${unit.status.toLowerCase()}`} style={{ fontSize: '11px', padding: '4px 8px' }}>
              {unit.status.replace('-', ' ')}
            </span>
            {pendingRequest && (
              <div style={{ 
                fontSize: '9px', 
                fontWeight: 800, 
                color: 'var(--forest)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 4,
                background: 'var(--forest-faint)',
                padding: '2px 8px',
                borderRadius: 6,
                border: '1px solid rgba(22, 101, 52, 0.1)',
                width: 'fit-content'
              }}>
                 <span style={{ 
                   width: 5, 
                   height: 5, 
                   borderRadius: '50%', 
                   background: 'var(--forest)',
                   display: 'inline-block'
                 }}></span>
                 PAYMENT {pendingRequest.status}
              </div>
            )}
          </div>
        )
      }
    },
    {
      header: 'ACTIONS',
      align: 'right',
      render: (unit) => (
        <UnitActions 
          unit={unit} 
          onRequestPayment={onRequestPayment} 
        />
      )
    }
  ];

  return (
    <div className="units-view-wrapper animate-fade-in">
      <PageHeader 
        title="Units Management" 
        subtitle="Manage your units, invite tenants, and track onboarding."
        actions={
          <>
            <button 
              className="btn btn--secondary" 
              onClick={onAddUnit}
              style={{ borderRadius: 12 }}
            >
              <Plus size={18} /> Add Unit
            </button>
            <button 
              className="btn btn--primary" 
              onClick={onBulkImport}
              style={{ borderRadius: 12 }}
            >
              <FileSpreadsheet size={18} /> Bulk Import
            </button>
          </>
        }
      />

      <ControlBar>
        <SearchInput 
          value={searchQuery} 
          onChange={setSearchQuery} 
          placeholder="Search units, tenants, properties..." 
        />
        
        <FilterGroup>
          <FilterDropdown 
            label="Property" 
            value={selectedPropertyFilter}
            icon={Building2}
            options={[
              { label: 'All Properties', value: 'All Properties' },
              ...properties.map(p => ({ label: p.name, value: p.name }))
            ]}
            onChange={setSelectedPropertyFilter}
          />

          <FilterDropdown 
            label="Payments" 
            value={paymentFilter}
            icon={CreditCardIcon}
            options={[
              { label: 'All Payments', value: 'all' },
              { label: 'Pending Requests', value: 'pending' },
              { label: 'Completed', value: 'paid' }
            ]}
            onChange={(val) => setPaymentFilter(val as any)}
          />

          <FilterDropdown 
            label="Due Date" 
            value={dueFilter}
            icon={Calendar}
            options={[
              { label: 'Any Due Date', value: 'all' },
              { label: 'Overdue', value: 'passed' },
              { label: 'Due in 30 days', value: '30days' },
              { label: 'Due in 60 days', value: '60days' },
              { label: 'Due in 90 days', value: '90days' }
            ]}
            onChange={(val) => setDueFilter(val as any)}
          />

          {setStatusFilter && (
            <FilterDropdown 
              label="Status" 
              value={statusFilter}
              icon={Filter}
              options={[
                { label: 'All Statuses', value: 'all' },
                { label: 'Occupied', value: 'occupied' },
                { label: 'Vacant', value: 'vacant' }
              ]}
              onChange={(val) => setStatusFilter(val as any)}
            />
          )}

          {setTenantFilter && (
            <FilterDropdown 
              label="Tenants" 
              value={tenantFilter}
              icon={Filter}
              options={[
                { label: 'All Tenants', value: 'all' },
                { label: 'Onboarded', value: 'onboarded' },
                { label: 'Pending Invites', value: 'pending' }
              ]}
              onChange={(val) => setTenantFilter(val as any)}
            />
          )}
          </FilterGroup>
      </ControlBar>

      <DataTable
        columns={columns}
        data={units}
        onRowClick={(unit) => router.push(`/properties/units/${unit.uuid}`)}
        emptyMessage="No units found matching your filters."
        keyExtractor={(unit) => unit.uuid}
        pageSize={10}
      />
    </div>
  )
}

// Sub-component for actions to handle mutations/state properly
function UnitActions({ unit, onRequestPayment }: { unit: Unit, onRequestPayment?: (unit: Unit) => void }) {
  const syncMutation = useSyncToUpward();
  const { error: toastError, success: toastSuccess } = useToast();
  
  const handleSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (syncMutation.isPending) return;

    try {
      await syncMutation.mutateAsync(unit.uuid);
      toastSuccess('Unit synced to Upward successfully');
    } catch (error: any) {
      toastError(error.message || 'Failed to sync unit');
    }
  };

  return (
    <div className="action-buttons" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
      {unit.status === 'OCCUPIED' && unit.tenant?.email && (
        unit.tenant.inviteStatus === 'PENDING' || unit.tenant.inviteStatus === 'PROCESSING' ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6, 
            color: 'var(--accent)', 
            background: 'var(--accent-faint)', 
            padding: '6px 12px', 
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700
          }}>
            <Loader2 size={12} className="animate-spin" />
            Processing...
          </div>
        ) : (
          <button 
            className={cn('btn btn--sm', unit.isSynced ? 'btn--secondary' : 'btn--primary')}
            onClick={(e) => {
              e.stopPropagation();
              if (unit.isSynced) {
                onRequestPayment?.(unit);
              } else {
                handleSync(e);
              }
            }}
            disabled={syncMutation.isPending}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            {syncMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" style={{ marginRight: 4 }} />
            ) : (
              unit.isSynced ? <CreditCardIcon size={12} style={{ marginRight: 4 }} /> : <RefreshCw size={12} style={{ marginRight: 4 }} />
            )}
            {unit.isSynced ? 'Request' : (syncMutation.isPending ? 'Syncing...' : 'Sync Now')}
          </button>
        )
      )}
      <Link 
        href={`/properties/units/${unit.uuid}`} 
        className="btn btn--secondary btn--sm" 
        style={{ fontSize: '12px', padding: '6px 12px' }}
        onClick={(e) => e.stopPropagation()}
      >
        View
      </Link>
    </div>
  );
}
