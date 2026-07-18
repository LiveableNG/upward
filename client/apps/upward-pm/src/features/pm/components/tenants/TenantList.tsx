'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Search, X, Home, Users, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { useTenants, useTenantActions } from '../../hooks/useTenants'
import { useProperties } from '../../hooks/useProperties'
import { DataTable, Column } from '@/components/common/DataTable'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tenant } from '../../services/tenantService'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { StatGrid } from '@/components/ui/StatCard/StatGrid'
import { ControlBar } from '@/components/ui/ControlBar/ControlBar'
import { SearchInput } from '@/components/ui/ControlBar/SearchInput'
import { FilterDropdown } from '@/components/ui/ControlBar/FilterDropdown'
import { Building2 } from 'lucide-react'
import { formatTenantName } from '@/lib/utils'
import { TenantNameDisplay } from '@/components/common/TenantNameDisplay'

import { UserPlus, ChevronDown } from 'lucide-react'
import { BulkInviteModal } from './modals/BulkInviteModal'

const TenantInviteAction = ({ tenant, inviteTenant }: { tenant: any, inviteTenant: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isPending = inviteTenant.isPending && inviteTenant.variables?.uuid === tenant.uuid;
  const isRemind = !!tenant.inviteSentAt;
  const label = isRemind ? 'Remind' : 'Invite';

  const hasFakeEmail = tenant.email?.endsWith('@upward.com');
  const hasRealEmail = !!tenant.email && !hasFakeEmail;
  const hasPhone = !!tenant.phone;
  const hasNoContact = !hasRealEmail && !hasPhone;

  const options = [];
  if (hasRealEmail) options.push({ label: 'Email', value: 'EMAIL' });
  if (hasPhone) {
    options.push({ label: 'SMS', value: 'SMS' });
    options.push({ label: 'WhatsApp', value: 'WHATSAPP' });
  }

  const isDisabled = isPending || hasNoContact || options.length === 0;

  const style = {
    fontSize: 12,
    padding: '6px 16px',
    background: (hasNoContact || options.length === 0) ? 'var(--ivory-dark)' : isRemind ? 'var(--ivory-dark)' : 'var(--forest)',
    color: (hasNoContact || options.length === 0) || isRemind ? 'var(--text-muted)' : 'white',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    borderRadius: '100px', // like btn--sm usually
    border: 'none',
    fontWeight: 600,
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 6
  };

  if (options.length === 1 && options[0].value === 'EMAIL') {
    return (
      <button
        className="btn btn--sm"
        onClick={(e) => {
          e.stopPropagation();
          inviteTenant.mutate({ uuid: tenant.uuid, deliveryChannel: 'EMAIL' });
        }}
        disabled={isDisabled}
        style={style as any}
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : label}
      </button>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button
        className="btn btn--sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        {isPending ? 'Processing...' : label} <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {isOpen && (
        <div
          className="animate-scale-in"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 50,
            minWidth: 'max-content',
            overflow: 'hidden',
            padding: '4px'
          }}
        >
          {options.map(o => (
            <button
              key={o.value}
              className="upward-filter-item"
              onClick={() => {
                setIsOpen(false);
                inviteTenant.mutate({ uuid: tenant.uuid, deliveryChannel: o.value });
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                whiteSpace: 'nowrap',
                borderRadius: '8px',
                padding: '10px 16px',
              }}
            >
              {label} via {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const TenantList = ({ initialTenants, onAddTenant }: { initialTenants?: any, onAddTenant?: () => void }) => {
  const router = useRouter()
  const { data: tenants = [], isLoading: loadingTenants } = useTenants(initialTenants)
  const { data: properties = [], isLoading: loadingProperties } = useProperties()

  const isLoading = loadingTenants || loadingProperties
  const { bulkInvite, inviteTenant } = useTenantActions()

  const [searchQuery, setSearchQuery] = useState('')
  const [propertyFilter, setPropertyFilter] = useState<string>('all')
  const searchParams = useSearchParams()
  const initialStatusFilter = searchParams.get('statusFilter') || 'all'
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_upward' | 'pending'>(initialStatusFilter as any)
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set())
  const [bulkDeliveryChannel, setBulkDeliveryChannel] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('EMAIL')
  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false)

  const filteredTenants = useMemo(() => {
    return tenants.filter((t: any) => {
      const fullName = formatTenantName(t).toLowerCase()
      const email = (t.email || '').toLowerCase()
      const query = searchQuery.toLowerCase()

      const matchesSearch = fullName.includes(query) || email.includes(query)

      const matchesProperty = propertyFilter === 'all' ||
        t.units?.some((u: any) => u.property?.uuid === propertyFilter || u.property?.name === propertyFilter)

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'on_upward' && (t.inviteStatus === 'ON_UPWARD' || t.inviteStatus === 'ACCEPTED')) ||
        (statusFilter === 'pending' && t.inviteStatus !== 'ON_UPWARD' && t.inviteStatus !== 'ACCEPTED')

      return matchesSearch && matchesProperty && matchesStatus
    })
  }, [tenants, searchQuery, propertyFilter, statusFilter])

  const pendingTenants = useMemo(() => {
    return filteredTenants.filter((t: any) => t.inviteStatus !== 'ON_UPWARD' && t.inviteStatus !== 'ACCEPTED')
  }, [filteredTenants])

  const handleSelectTenant = (uuid: string, selected: boolean) => {
    const newSelection = new Set(selectedTenants)
    if (selected) {
      newSelection.add(uuid)
    } else {
      newSelection.delete(uuid)
    }
    setSelectedTenants(newSelection)
  }

  const handleBulkInvite = () => {
    if (selectedTenants.size === 0) return
    bulkInvite.mutate({ tenantUuids: Array.from(selectedTenants), deliveryChannel: bulkDeliveryChannel }, {
      onSuccess: () => {
        setSelectedTenants(new Set())
      }
    })
  }

  const clearSelection = () => setSelectedTenants(new Set())

  const hasOnUpward = Array.from(selectedTenants).some(uuid => {
    const t = tenants.find((t: any) => t.uuid === uuid);
    return t && (t.inviteStatus === 'ON_UPWARD' || t.inviteStatus === 'ACCEPTED');
  });

  const handleBulkDocument = () => {
    // Collect the full tenant objects
    const selected = Array.from(selectedTenants).map(uuid => tenants.find((t: any) => t.uuid === uuid)).filter(Boolean);
    if (selected.length === 1) {
      // If only one, navigate to normal document management pre-filling recipient
      router.push(`/documents?new=true&recipientUuid=${selected[0].uuid}&recipientType=existing`);
    } else {
      // If multiple, navigate to bulk document management
      const uuids = selected.map(t => t.uuid).join(',');
      router.push(`/documents/bulk?tenants=${uuids}`);
    }
  };

  const allSelected = filteredTenants.length > 0 && selectedTenants.size === filteredTenants.length;
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedTenants(new Set());
    } else {
      setSelectedTenants(new Set(filteredTenants.map((t: any) => t.uuid)));
    }
  };

  const columns: Column<Tenant>[] = [
    {
      header: (
        <div style={{ padding: '0 4px' }} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--forest)' }}
          />
        </div>
      ),
      width: 40,
      render: (tenant) => {
        const isSelected = selectedTenants.has(tenant.uuid);
        return (
          <div style={{ padding: '0 4px' }} onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleSelectTenant(tenant.uuid, !isSelected)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--forest)' }}
            />
          </div>
        );
      }
    },
    {
      header: 'TENANT NAME',
      render: (tenant) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--dark)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0
          }}>
            {((tenant.commercialName || tenant.firstName || 'T')[0] || '').toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 14, marginBottom: 2 }}>
              <TenantNameDisplay tenant={tenant} fallback="No Tenant" />
            </div>
            {tenant.email?.endsWith('@upward.com') ? (
              <div style={{ fontSize: 12, color: 'var(--error)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> Not Configured
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tenant.email}</div>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'RESIDENCE',
      render: (tenant) => (
        tenant.units && tenant.units.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {tenant.units.map((unit) => (
              <div key={unit.uuid} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{unit.unitName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{unit.property.name}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>N/A</span>
        )
      )
    },
    {
      header: 'ACTIONS',
      align: 'right',
      render: (tenant) => {
        const isOnUpward = tenant.inviteStatus === 'ON_UPWARD' || tenant.inviteStatus === 'ACCEPTED'
        const isSelected = selectedTenants.has(tenant.uuid)
        const hasNoContact = !tenant.email && !tenant.phone
        const isButtonDisabled = inviteTenant.isPending || tenant.email?.endsWith('@upward.com') || hasNoContact
        const buttonOpacity = (tenant.email?.endsWith('@upward.com') || hasNoContact) ? 0.6 : 1
        const buttonCursor = (tenant.email?.endsWith('@upward.com') || hasNoContact) ? 'not-allowed' : 'pointer'

        return (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
            {isOnUpward ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--forest)',
                background: 'var(--forest-faint)',
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700
              }}>
                <CheckCircle2 size={14} />
                ON UPWARD
              </div>
            ) : tenant.inviteStatus === 'PENDING' || tenant.inviteStatus === 'PROCESSING' ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--accent)',
                background: 'var(--accent-faint)',
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700
              }}>
                <Loader2 size={14} className="animate-spin" />
                PROCESSING
              </div>
            ) : (
              <TenantInviteAction tenant={tenant} inviteTenant={inviteTenant} />
            )}
          </div>
        )
      }
    }
  ]

  const renderMobileTenantCard = (tenant: any) => {
    const isSelected = selectedTenants.has(tenant.uuid);
    const isOnUpward = tenant.inviteStatus === 'ON_UPWARD' || tenant.inviteStatus === 'ACCEPTED';
    
    return (
      <div className="tenant-mobile-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div 
            onClick={(e) => {
              e.stopPropagation();
              handleSelectTenant(tenant.uuid, !isSelected);
            }} 
            style={{ display: 'flex', alignItems: 'center', padding: '4px', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}} // Handled by click to prevent double event firing
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--forest)' }}
            />
          </div>
          
          <div onClick={(e) => e.stopPropagation()}>
            {isOnUpward ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--forest)',
                background: 'var(--forest-faint)',
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700
              }}>
                <CheckCircle2 size={14} />
                ON UPWARD
              </div>
            ) : tenant.inviteStatus === 'PENDING' || tenant.inviteStatus === 'PROCESSING' ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--accent)',
                background: 'var(--accent-faint)',
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700
              }}>
                <Loader2 size={14} className="animate-spin" />
                PROCESSING
              </div>
            ) : (
              <TenantInviteAction tenant={tenant} inviteTenant={inviteTenant} />
            )}
          </div>
        </div>

        {/* Content Row: Tenant Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--dark)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 700,
            flexShrink: 0
          }}>
            {((tenant.commercialName || tenant.firstName || 'T')[0] || '').toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 15, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <TenantNameDisplay tenant={tenant} fallback="No Tenant" />
            </div>
            {tenant.email?.endsWith('@upward.com') ? (
              <div style={{ fontSize: 12, color: 'var(--error)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> Not Configured
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tenant.email}</div>
            )}
          </div>
        </div>

        {/* Bottom Details Row: Residence info */}
        <div style={{ 
          background: 'var(--bg-soft, var(--ivory-dim))', 
          padding: '12px 16px', 
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>Residence</div>
          {tenant.units && tenant.units.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {tenant.units.map((unit: any) => (
                <div key={unit.uuid} style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>
                  {unit.unitName} <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>({unit.property.name})</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>N/A</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
    <div className="tenants-view animate-fade-in" style={{ padding: '24px 0' }}>
      <PageHeader
        title="Tenants Directory"
        subtitle="Manage your tenants across all properties."
        actions={
          <>
            {selectedTenants.size > 0 && (
              <button
                className="btn btn--outline"
                onClick={() => setShowBulkInviteModal(true)}
                style={{ borderRadius: 12 }}
              >
                <Users size={18} /> Invite Selected ({selectedTenants.size})
              </button>
            )}
            {onAddTenant && (
              <button
                className="btn btn--primary"
                onClick={onAddTenant}
              >
                <UserPlus size={18} /> Add Tenant
              </button>
            )}
          </>
        }
      />

      <StatGrid>
        <StatCard
          label="Total Tenants"
          value={tenants.length}
          icon={Users}
          variant="accent"
        />
        <StatCard
          label="Onboarding Pending"
          value={tenants.filter((t: any) => t.inviteStatus === 'PENDING').length}
          icon={Home}
        />
      </StatGrid>

      <ControlBar>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search Tenant"
        />

        <FilterDropdown
          label="Property"
          value={propertyFilter}
          icon={Building2}
          options={[
            { label: 'All Properties', value: 'all' },
            ...properties.map((p: any) => ({ label: p.name, value: p.uuid }))
          ]}
          onChange={setPropertyFilter}
        />

        <FilterDropdown
          label="Status"
          value={statusFilter}
          icon={Users}
          options={[
            { label: 'All Statuses', value: 'all' },
            { label: 'On Upward', value: 'on_upward' },
            { label: 'Pending Invite', value: 'pending' }
          ]}
          onChange={(val) => setStatusFilter(val as any)}
        />
      </ControlBar>

      {filteredTenants.length > 0 && (
        <div 
          className="mobile-only-select-all" 
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            marginBottom: '16px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            width: '100%'
          }} 
          onClick={(e) => {
            e.stopPropagation();
            toggleSelectAll();
          }}
        >
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => {}} // Handled by click to prevent double event firing
            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--forest)' }}
          />
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
            {allSelected ? 'Deselect All' : `Select All Tenants (${filteredTenants.length})`}
          </span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredTenants}
        onRowClick={(tenant) => router.push(`/tenants/${tenant.uuid}`)}
        emptyMessage="No tenants found matching your search."
        keyExtractor={(tenant) => tenant.uuid}
        rowClassName={(tenant) => selectedTenants.has(tenant.uuid) ? 'selected' : ''}
        pageSize={10}
        isLoading={isLoading}
        renderMobileCard={renderMobileTenantCard}
      />
    </div>
    
    <BulkInviteModal
      isOpen={showBulkInviteModal}
      onClose={() => setShowBulkInviteModal(false)}
      selectedTenantUuids={selectedTenants}
      tenants={tenants}
      onSuccess={() => setSelectedTenants(new Set())}
    />

    {selectedTenants.size > 0 && (
      <div
        className="bulk-actions-bar animate-slide-up"
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'auto',
          borderRadius: 100,
          padding: '12px 24px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 100
        }}
      >
        <div className="bulk-actions-info">
          <button className="btn-icon" onClick={clearSelection}>
            <X size={18} />
          </button>
          <span style={{ fontWeight: 700 }}>{selectedTenants.size} Selected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn--primary"
            onClick={handleBulkDocument}
            style={{ borderRadius: 100, padding: '10px 24px' }}
          >
            Send Document
          </button>
        </div>
      </div>
    )}
    </>
  )
}
