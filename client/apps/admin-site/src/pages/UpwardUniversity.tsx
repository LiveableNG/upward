import { useState, useEffect } from 'react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import {
  UniversityHeader,
  UniversityAbTestBanner,
  UniversityTabNav,
  UniversityStatCards,
  ApplicationsTab,
  EarlyAccessTab,
  TrafficSourcesTab,
  ReferralsTab,
  HireRequestsTab,
  EarlyAccessDetailModal,
  ApplicationDetailModal,
  CreateTrafficSourceModal,
  TrafficVisitsLogModal,
  ReferralDetailModal,
  ReferralEditModal,
  ConfirmDeleteModal,
  HireRequestDetailModal,
  getApplicationColumns,
  getEarlyAccessColumns,
  getTrafficColumns,
  getReferralColumns,
  getHireRequestColumns,
  useUniversityApplications,
  useEarlyAccess,
  useTrafficSources,
  useUniversityReferrals,
  useUniversityHireRequests,
} from '../features/university'
import type {
  UniversityTab,
  DeleteTarget,
  UpwardUniversityProps,
  UniversityHireRequestRecord,
} from '../features/university'

// Re-export public interfaces for backwards compatibility
export type {
  TrafficSourceRecord,
  AbVariantMetrics,
  TrafficStats,
  TrafficVisitRecord,
  UniversityReferralRecord,
  UniversityReferralStats,
  UniversityHireRequestRecord,
  UniversityHireRequestStats,
} from '../features/university'

export default function UpwardUniversity({ token, adminRole }: UpwardUniversityProps) {
  const isDeveloper = adminRole === 'DEVELOPER'
  const [activeTab, setActiveTab] = useState<UniversityTab>('APPLICATIONS')

  // Feature hooks
  const applicationsHook = useUniversityApplications(token)
  const earlyAccessHook = useEarlyAccess(token)
  const trafficHook = useTrafficSources(token)
  const referralsHook = useUniversityReferrals(token)
  const hireRequestsHook = useUniversityHireRequests(token)

  // Record Deletion state
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.type === 'APPLICATION') {
        const res = await apiService.delete(`/admin/university/applications/${deleteTarget.id}`, token)
        if (res && res.success) {
          showToast('Application deleted successfully')
          if (applicationsHook.selectedApp && applicationsHook.selectedApp.id === deleteTarget.id) {
            applicationsHook.setSelectedApp(null)
          }
          applicationsHook.fetchApplications(applicationsHook.appPage)
          applicationsHook.fetchAppStats()
        }
      } else if (deleteTarget.type === 'EARLY_ACCESS') {
        const res = await apiService.delete(`/admin/early-access/${deleteTarget.id}`, token)
        if (res && res.success) {
          showToast('Early access record deleted successfully')
          if (earlyAccessHook.selectedRecord && earlyAccessHook.selectedRecord.id === deleteTarget.id) {
            earlyAccessHook.setSelectedRecord(null)
          }
          earlyAccessHook.fetchRecords(earlyAccessHook.page)
          earlyAccessHook.fetchStats()
        }
      } else if (deleteTarget.type === 'TRAFFIC_SOURCE') {
        const res = await apiService.delete(`/admin/university/traffic/sources/${deleteTarget.id}`, token)
        if (res && res.success) {
          showToast('Tracking source deleted successfully')
          trafficHook.fetchTrafficSources(trafficHook.trafficPage)
          trafficHook.fetchTrafficStats()
        }
      } else if (deleteTarget.type === 'REFERRAL') {
        const res = await apiService.delete(`/admin/university/referrals/${deleteTarget.id}`, token)
        if (res && res.success) {
          showToast('Referral record deleted successfully')
          if (referralsHook.selectedReferral && referralsHook.selectedReferral.id === deleteTarget.id) {
            referralsHook.setSelectedReferral(null)
          }
          if (referralsHook.editingReferral && referralsHook.editingReferral.id === deleteTarget.id) {
            referralsHook.setEditingReferral(null)
          }
          referralsHook.fetchReferrals(referralsHook.referralPage)
          referralsHook.fetchReferralStats()
        }
      } else if (deleteTarget.type === 'HIRE_REQUEST') {
        const res = await apiService.delete(`/admin/university/hire-requests/${deleteTarget.id}`, token)
        if (res && res.success) {
          showToast('Hiring request deleted successfully')
          if (hireRequestsHook.selectedHireRequest && hireRequestsHook.selectedHireRequest.id === deleteTarget.id) {
            hireRequestsHook.setSelectedHireRequest(null)
          }
          hireRequestsHook.fetchHireRequests(hireRequestsHook.hirePage)
          hireRequestsHook.fetchHireStats()
        }
      }
    } catch (err) {
      console.error('Failed to delete record:', err)
      showToast('Failed to delete record', true)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  // Load stats once on mount
  useEffect(() => {
    applicationsHook.fetchAppStats()
    earlyAccessHook.fetchStats()
    trafficHook.fetchTrafficStats()
    referralsHook.fetchReferralStats()
    hireRequestsHook.fetchHireStats()
  }, [])

  // Sync data whenever active tab or its filters/pages change
  useEffect(() => {
    if (activeTab === 'APPLICATIONS') {
      applicationsHook.fetchApplications(applicationsHook.appPage)
    } else if (activeTab === 'EARLY_ACCESS') {
      earlyAccessHook.fetchRecords(earlyAccessHook.page)
    } else if (activeTab === 'HIRE_REQUESTS') {
      hireRequestsHook.fetchHireRequests(hireRequestsHook.hirePage)
    } else if (activeTab === 'TRAFFIC') {
      trafficHook.fetchTrafficSources(trafficHook.trafficPage)
    } else if (activeTab === 'REFERRALS') {
      referralsHook.fetchReferrals(referralsHook.referralPage)
    }
  }, [
    activeTab,
    applicationsHook.appPage,
    earlyAccessHook.page,
    hireRequestsHook.hirePage,
    trafficHook.trafficPage,
    referralsHook.referralPage,
    earlyAccessHook.typeFilter,
    hireRequestsHook.hireStatusFilter,
    hireRequestsHook.hireIndustryFilter,
    hireRequestsHook.hirePlacementFilter,
    trafficHook.trafficChannelFilter,
    referralsHook.referralStatusFilter,
    referralsHook.referralRewardStatusFilter,
  ])

  const handleRefresh = () => {
    applicationsHook.fetchAppStats()
    earlyAccessHook.fetchStats()
    trafficHook.fetchTrafficStats()
    referralsHook.fetchReferralStats()
    hireRequestsHook.fetchHireStats()
    if (activeTab === 'APPLICATIONS') {
      applicationsHook.fetchApplications(applicationsHook.appPage)
    } else if (activeTab === 'EARLY_ACCESS') {
      earlyAccessHook.fetchRecords(earlyAccessHook.page)
    } else if (activeTab === 'HIRE_REQUESTS') {
      hireRequestsHook.fetchHireRequests(hireRequestsHook.hirePage)
    } else if (activeTab === 'TRAFFIC') {
      trafficHook.fetchTrafficSources(trafficHook.trafficPage)
    } else if (activeTab === 'REFERRALS') {
      referralsHook.fetchReferrals(referralsHook.referralPage)
    }
    showToast('Records refreshed')
  }

  // Column definitions
  const appColumns = getApplicationColumns({
    onSelect: applicationsHook.setSelectedApp,
    onDelete: (row) => setDeleteTarget({ id: row.id, name: row.name, type: 'APPLICATION' }),
    isDeveloper,
  })

  const earlyAccessColumns = getEarlyAccessColumns({
    onSelect: earlyAccessHook.setSelectedRecord,
    onDelete: (row) => setDeleteTarget({ id: row.id, name: row.name, type: 'EARLY_ACCESS' }),
    isDeveloper,
  })

  const trafficColumns = getTrafficColumns({
    onVisitsLog: trafficHook.fetchVisitsForSource,
    onToggleActive: trafficHook.handleToggleSourceActive,
    onCopyLink: trafficHook.handleCopyLink,
    copiedId: trafficHook.copiedId,
    onDelete: (row) => setDeleteTarget({ id: row.id, name: row.name, type: 'TRAFFIC_SOURCE' }),
    isDeveloper,
  })

  const referralColumns = getReferralColumns({
    onSelect: referralsHook.setSelectedReferral,
    onEditPayout: referralsHook.openEditReferralModal,
    onDelete: (row) =>
      setDeleteTarget({
        id: row.id,
        name: `Referral from ${row.referrerName} (${row.referredName || row.referredPhone || row.referredEmail})`,
        type: 'REFERRAL',
      }),
    isDeveloper,
  })

  const hireColumns = getHireRequestColumns({
    onSelect: hireRequestsHook.setSelectedHireRequest,
    onDelete: (row) =>
      setDeleteTarget({
        id: row.id,
        name: `Hire Request from ${row.companyName} (${row.contactName})`,
        type: 'HIRE_REQUEST',
      }),
    isDeveloper,
  })

  return (
    <div className="page-container fade-in" style={{ paddingTop: '16px' }}>
      {/* Header */}
      <UniversityHeader onRefresh={handleRefresh} />

      {/* Real-Time A/B Testing Card */}
      <UniversityAbTestBanner abTestStats={trafficHook.trafficStats?.abTestStats} />

      {/* Main Section Tabs */}
      <UniversityTabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        totalApplications={applicationsHook.appStats?.totalApplications || 0}
        totalEarlyAccess={earlyAccessHook.stats?.totalSubmissions || 0}
        totalTrafficSources={trafficHook.trafficStats?.totalSources || 0}
        totalReferrals={referralsHook.referralStats?.totalReferrals || 0}
        totalHireRequests={hireRequestsHook.hireStats?.totalRequests || 0}
      />

      {/* Stats Cards Grid */}
      <UniversityStatCards
        activeTab={activeTab}
        appStats={applicationsHook.appStats}
        applications={applicationsHook.applications}
        loadingApps={applicationsHook.loadingApps}
        stats={earlyAccessHook.stats}
        loadingStats={earlyAccessHook.loadingStats}
        trafficStats={trafficHook.trafficStats}
        loadingTrafficStats={trafficHook.loadingTrafficStats}
        referralStats={referralsHook.referralStats}
        referrals={referralsHook.referrals}
        loadingReferralStats={referralsHook.loadingReferralStats}
        hireStats={hireRequestsHook.hireStats}
        hireRequests={hireRequestsHook.hireRequests}
        loadingHireStats={hireRequestsHook.loadingHireStats}
      />

      {/* Active Tab Table Content */}
      {activeTab === 'APPLICATIONS' ? (
        <ApplicationsTab
          applications={applicationsHook.applications}
          columns={appColumns}
          loading={applicationsHook.loadingApps}
          page={applicationsHook.appPage}
          totalPages={applicationsHook.appTotalPages}
          totalApplications={applicationsHook.appStats?.totalApplications || 0}
          search={applicationsHook.appSearch}
          onSearchChange={applicationsHook.setAppSearch}
          onSearchSubmit={(e) => {
            e.preventDefault()
            applicationsHook.setAppPage(1)
            applicationsHook.fetchApplications(1)
          }}
          onPageChange={applicationsHook.setAppPage}
        />
      ) : activeTab === 'EARLY_ACCESS' ? (
        <EarlyAccessTab
          records={earlyAccessHook.records}
          columns={earlyAccessColumns}
          loading={earlyAccessHook.loading}
          page={earlyAccessHook.page}
          totalPages={earlyAccessHook.totalPages}
          typeFilter={earlyAccessHook.typeFilter}
          onTypeFilterChange={(type) => {
            earlyAccessHook.setTypeFilter(type)
            earlyAccessHook.setPage(1)
          }}
          search={earlyAccessHook.search}
          onSearchChange={earlyAccessHook.setSearch}
          onSearchSubmit={(e) => {
            e.preventDefault()
            earlyAccessHook.setPage(1)
            earlyAccessHook.fetchRecords(1)
          }}
          onPageChange={earlyAccessHook.setPage}
        />
      ) : activeTab === 'HIRE_REQUESTS' ? (
        <HireRequestsTab
          hireRequests={hireRequestsHook.hireRequests}
          columns={hireColumns}
          loading={hireRequestsHook.loadingHireRequests}
          page={hireRequestsHook.hirePage}
          totalPages={hireRequestsHook.hireTotalPages}
          statusFilter={hireRequestsHook.hireStatusFilter}
          onStatusFilterChange={(status) => {
            hireRequestsHook.setHireStatusFilter(status)
            hireRequestsHook.setHirePage(1)
          }}
          placementFilter={hireRequestsHook.hirePlacementFilter}
          onPlacementFilterChange={(placement) => {
            hireRequestsHook.setHirePlacementFilter(placement)
            hireRequestsHook.setHirePage(1)
          }}
          search={hireRequestsHook.hireSearch}
          onSearchChange={hireRequestsHook.setHireSearch}
          onSearchSubmit={(e) => {
            e.preventDefault()
            hireRequestsHook.setHirePage(1)
            hireRequestsHook.fetchHireRequests(1)
          }}
          onPageChange={hireRequestsHook.setHirePage}
        />
      ) : activeTab === 'TRAFFIC' ? (
        <TrafficSourcesTab
          sources={trafficHook.trafficSources}
          columns={trafficColumns}
          loading={trafficHook.loadingTraffic}
          page={trafficHook.trafficPage}
          totalPages={trafficHook.trafficTotalPages}
          channelFilter={trafficHook.trafficChannelFilter}
          onChannelFilterChange={(channel) => {
            trafficHook.setTrafficChannelFilter(channel)
            trafficHook.setTrafficPage(1)
          }}
          search={trafficHook.trafficSearch}
          onSearchChange={trafficHook.setTrafficSearch}
          onSearchSubmit={(e) => {
            e.preventDefault()
            trafficHook.setTrafficPage(1)
            trafficHook.fetchTrafficSources(1)
          }}
          onPageChange={trafficHook.setTrafficPage}
          onOpenCreateModal={() => trafficHook.setIsCreateModalOpen(true)}
        />
      ) : (
        <ReferralsTab
          referrals={referralsHook.referrals}
          columns={referralColumns}
          loading={referralsHook.loadingReferrals}
          page={referralsHook.referralPage}
          totalPages={referralsHook.referralTotalPages}
          statusFilter={referralsHook.referralStatusFilter}
          onStatusFilterChange={(status) => {
            referralsHook.setReferralStatusFilter(status)
            referralsHook.setReferralPage(1)
          }}
          rewardStatusFilter={referralsHook.referralRewardStatusFilter}
          onRewardStatusFilterChange={(rewardStatus) => {
            referralsHook.setReferralRewardStatusFilter(rewardStatus)
            referralsHook.setReferralPage(1)
          }}
          search={referralsHook.referralSearch}
          onSearchChange={referralsHook.setReferralSearch}
          onSearchSubmit={(e) => {
            e.preventDefault()
            referralsHook.setReferralPage(1)
            referralsHook.fetchReferrals(1)
          }}
          onPageChange={referralsHook.setReferralPage}
        />
      )}

      {/* Modals */}
      <EarlyAccessDetailModal
        isOpen={Boolean(earlyAccessHook.selectedRecord)}
        record={earlyAccessHook.selectedRecord}
        onClose={() => earlyAccessHook.setSelectedRecord(null)}
        onDelete={(record) =>
          setDeleteTarget({ id: record.id, name: record.name, type: 'EARLY_ACCESS' })
        }
        isDeveloper={isDeveloper}
      />

      <ApplicationDetailModal
        isOpen={Boolean(applicationsHook.selectedApp)}
        application={applicationsHook.selectedApp}
        onClose={() => applicationsHook.setSelectedApp(null)}
        onUpdateStatus={applicationsHook.handleUpdateAppStatus}
        onDelete={(app) =>
          setDeleteTarget({ id: app.id, name: app.name, type: 'APPLICATION' })
        }
        isDeveloper={isDeveloper}
      />

      <HireRequestDetailModal
        isOpen={Boolean(hireRequestsHook.selectedHireRequest)}
        hireRequest={hireRequestsHook.selectedHireRequest}
        onClose={() => hireRequestsHook.setSelectedHireRequest(null)}
        onUpdateStatus={hireRequestsHook.handleUpdateHireStatus}
        onDelete={(req: UniversityHireRequestRecord) =>
          setDeleteTarget({
            id: req.id,
            name: `Hire Request from ${req.companyName}`,
            type: 'HIRE_REQUEST',
          })
        }
        isDeveloper={isDeveloper}
      />

      <CreateTrafficSourceModal
        isOpen={trafficHook.isCreateModalOpen}
        onClose={() => trafficHook.setIsCreateModalOpen(false)}
        onSubmit={trafficHook.handleCreateSource}
        creating={trafficHook.creatingSource}
      />

      <TrafficVisitsLogModal
        isOpen={trafficHook.isVisitsModalOpen}
        source={trafficHook.selectedSourceForVisits}
        visits={trafficHook.visitsList}
        loading={trafficHook.loadingVisits}
        onClose={() => trafficHook.setIsVisitsModalOpen(false)}
      />

      <ReferralDetailModal
        isOpen={Boolean(referralsHook.selectedReferral)}
        referral={referralsHook.selectedReferral}
        onClose={() => referralsHook.setSelectedReferral(null)}
        onOpenEdit={referralsHook.openEditReferralModal}
      />

      <ReferralEditModal
        isOpen={Boolean(referralsHook.editingReferral)}
        referral={referralsHook.editingReferral}
        formData={referralsHook.editReferralForm}
        setFormData={referralsHook.setEditReferralForm}
        onSubmit={referralsHook.handleUpdateReferralSubmit}
        updating={referralsHook.updatingReferral}
        onClose={() => referralsHook.setEditingReferral(null)}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        target={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
