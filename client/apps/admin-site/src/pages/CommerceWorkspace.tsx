import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingBag, Search, RefreshCw, Plus } from 'lucide-react'
import { useCommerceAdmin } from '../features/commerce/hooks/useCommerceAdmin'
import { CommerceOrdersTable } from '../features/commerce/components/CommerceOrdersTable'
import { CommerceDisputesTable } from '../features/commerce/components/CommerceDisputesTable'
import { DeliveryZonesTable } from '../features/commerce/components/DeliveryZonesTable'
import {
  type GoalCategory,
  type Goal,
  type Offering,
  type CommerceVendor,
  type DeleteTarget,
  useGoalManagement,
  OverviewTab,
  GoalsTab,
  CategoriesTab,
  OfferingsTab,
  VendorsTab,
  CategoryModal,
  GoalModal,
  OfferingModal,
  PackageItemsModal,
  GoalOfferingsModal,
  VendorModal,
  DeleteGoalItemModal,
} from '../features/goals'

export type WorkspaceTab =
  | 'OVERVIEW'
  | 'GOALS'
  | 'CATEGORIES'
  | 'OFFERINGS'
  | 'VENDORS'
  | 'ORDERS'
  | 'DISPUTES'
  | 'ZONES'

interface CommerceWorkspaceProps {
  token?: string
  adminRole?: string
}

export default function CommerceWorkspace({ token }: CommerceWorkspaceProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, _setSearchParams] = useSearchParams()

  // Determine active tab from route path (e.g. /commerce/orders) or query param (?tab=orders)
  const pathSuffix = location.pathname.split('/commerce/')[1]?.toUpperCase()
  const queryTab = searchParams.get('tab')?.toUpperCase()
  const validTabs: WorkspaceTab[] = [
    'OVERVIEW',
    'GOALS',
    'CATEGORIES',
    'OFFERINGS',
    'VENDORS',
    'ORDERS',
    'DISPUTES',
    'ZONES',
  ]

  const activeTab: WorkspaceTab =
    pathSuffix && validTabs.includes(pathSuffix as WorkspaceTab)
      ? (pathSuffix as WorkspaceTab)
      : queryTab && validTabs.includes(queryTab as WorkspaceTab)
        ? (queryTab as WorkspaceTab)
        : 'OVERVIEW'

  // Commerce Operations hook (Orders, Disputes & Delivery Zones)
  const {
    orders,
    ordersTotal,
    loadingOrders,
    fetchOrders,
    updateSubOrderFulfilment,
    disputes,
    disputesTotal,
    loadingDisputes,
    fetchDisputes,
    resolveDispute,
    deliveryZones,
    loadingDeliveryZones,
    fetchDeliveryZones,
    createDeliveryZone,
    updateDeliveryZone,
    toggleDeliveryZone,
    deleteDeliveryZone,
  } = useCommerceAdmin(token)

  // Goal & Merchandising Catalog hook
  const {
    overview,
    loadingOverview,
    fetchOverview,

    categories,
    loadingCategories,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,

    goals,
    goalsTotal,
    goalsPage,
    goalsSearch,
    setGoalsSearch,
    goalsCategoryFilter,
    setGoalsCategoryFilter,
    goalsPublishedFilter,
    setGoalsPublishedFilter,
    loadingGoals,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    togglePublishGoal,
    fetchGoalCollections,
    createCollection,
    deleteCollection,
    linkOfferingToGoal,
    unlinkOfferingFromGoal,

    offerings,
    offeringsTotal,
    offeringsPage,
    offeringsSearch,
    setOfferingsSearch,
    offeringsTypeFilter,
    setOfferingsTypeFilter,
    offeringsVendorFilter,
    setOfferingsVendorFilter,
    offeringsPublishedFilter,
    setOfferingsPublishedFilter,
    loadingOfferings,
    fetchOfferings,
    createOffering,
    updateOffering,
    deleteOffering,
    togglePublishOffering,
    setPackageItems,

    vendors,
    vendorsSearch,
    setVendorsSearch,
    vendorsActiveFilter,
    setVendorsActiveFilter,
    loadingVendors,
    fetchVendors,
    createVendor,
    updateVendor,
    deleteVendor,
    toggleVendorActive,
  } = useGoalManagement(token)

  // Orders table local state - default to PAID orders so fulfilment staff see actionable orders
  const [orderSearch, setOrderSearch] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('PAID')
  const [fulfilmentStatusFilter, setFulfilmentStatusFilter] = useState('ALL')

  const filteredOrders = useMemo(() => {
    if (fulfilmentStatusFilter === 'ALL') return orders
    return orders.filter((order) => {
      const subOrders = order.subOrders || []
      if (fulfilmentStatusFilter === 'DISPATCHED') {
        return subOrders.some((s) =>
          ['DISPATCHED', 'OUT_FOR_DELIVERY', 'TECHNICIAN_EN_ROUTE'].includes(s.customerStatus),
        )
      }
      if (fulfilmentStatusFilter === 'DELIVERED') {
        return subOrders.some((s) => ['DELIVERED', 'SERVICE_COMPLETED'].includes(s.customerStatus))
      }
      return subOrders.some((s) => s.customerStatus === fulfilmentStatusFilter)
    })
  }, [orders, fulfilmentStatusFilter])

  // Modals for catalog management
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<GoalCategory | null>(null)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [offeringModalOpen, setOfferingModalOpen] = useState(false)
  const [editingOffering, setEditingOffering] = useState<Offering | null>(null)
  const [packageItemsModalOpen, setPackageItemsModalOpen] = useState(false)
  const [packageOffering, setPackageOffering] = useState<Offering | null>(null)
  const [goalOfferingsModalOpen, setGoalOfferingsModalOpen] = useState(false)
  const [goalForOfferings, setGoalForOfferings] = useState<Goal | null>(null)
  const [vendorModalOpen, setVendorModalOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<CommerceVendor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  // Fetch data on active tab changes
  useEffect(() => {
    if (activeTab === 'ORDERS') {
      fetchOrders({
        search: orderSearch || undefined,
        paymentStatus: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
      })
    } else if (activeTab === 'DISPUTES') {
      fetchDisputes()
    } else if (activeTab === 'ZONES') {
      fetchDeliveryZones()
    }
  }, [activeTab, fetchOrders, fetchDisputes, fetchDeliveryZones, orderSearch, paymentStatusFilter])

  const handleTabChange = (tab: WorkspaceTab) => {
    if (tab === 'OVERVIEW') {
      navigate('/commerce')
    } else {
      navigate(`/commerce/${tab.toLowerCase()}`)
    }
  }

  // Master refresh
  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefresh = async () => {
    setIsRefreshing(true)
    if (activeTab === 'ORDERS') {
      await fetchOrders({
        search: orderSearch || undefined,
        paymentStatus: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
      })
    } else if (activeTab === 'DISPUTES') {
      await fetchDisputes()
    } else if (activeTab === 'ZONES') {
      await fetchDeliveryZones()
    } else {
      await Promise.all([
        fetchOverview(),
        fetchCategories(),
        fetchGoals(goalsPage),
        fetchOfferings(offeringsPage),
        fetchVendors(),
      ])
    }
    setIsRefreshing(false)
  }

  // Delete Confirm Action for Catalog items
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    switch (deleteTarget.type) {
      case 'CATEGORY':
        await deleteCategory(deleteTarget.id)
        break
      case 'GOAL':
        await deleteGoal(deleteTarget.id)
        break
      case 'OFFERING':
        await deleteOffering(deleteTarget.id)
        break
      case 'VENDOR':
        await deleteVendor(deleteTarget.id)
        break
    }
    setDeleteTarget(null)
  }

  return (
    <div className="admin-page-container fade-in" style={{ padding: '24px 32px' }}>
      {/* Workspace Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--accent-faint)',
              border: '1px solid var(--accent-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingBag size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
              Commerce & Lifestyle Workspace
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Unified operations desk for goals catalog, multi-vendor merchandise, fulfilment
              logistics & customer disputes.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Quick Action Button depending on tab */}
          {activeTab === 'GOALS' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingGoal(null)
                setGoalModalOpen(true)
              }}
              style={{
                height: 36,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
              }}
            >
              <Plus size={15} />
              <span>New Goal</span>
            </button>
          )}
          {activeTab === 'CATEGORIES' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingCategory(null)
                setCategoryModalOpen(true)
              }}
              style={{
                height: 36,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
              }}
            >
              <Plus size={15} />
              <span>New Category</span>
            </button>
          )}
          {activeTab === 'OFFERINGS' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingOffering(null)
                setOfferingModalOpen(true)
              }}
              style={{
                height: 36,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
              }}
            >
              <Plus size={15} />
              <span>New Offering</span>
            </button>
          )}
          {activeTab === 'VENDORS' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingVendor(null)
                setVendorModalOpen(true)
              }}
              style={{
                height: 36,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
              }}
            >
              <Plus size={15} />
              <span>New Vendor</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            className="btn btn-secondary"
            style={{
              height: 36,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
            }}
            disabled={isRefreshing || loadingOrders || loadingDisputes}
          >
            <RefreshCw
              size={14}
              className={isRefreshing || loadingOrders || loadingDisputes ? 'loader' : ''}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'OVERVIEW' && (
        <OverviewTab
          overview={overview}
          isLoading={loadingOverview}
          onNavigateTab={(tab) => handleTabChange(tab as WorkspaceTab)}
          onNewGoal={() => {
            setEditingGoal(null)
            setGoalModalOpen(true)
          }}
          onNewCategory={() => {
            setEditingCategory(null)
            setCategoryModalOpen(true)
          }}
          onNewOffering={() => {
            setEditingOffering(null)
            setOfferingModalOpen(true)
          }}
          onNewVendor={() => {
            setEditingVendor(null)
            setVendorModalOpen(true)
          }}
        />
      )}

      {activeTab === 'GOALS' && (
        <GoalsTab
          goals={goals}
          categories={categories}
          totalGoals={goalsTotal}
          currentPage={goalsPage}
          onPageChange={(p) => fetchGoals(p)}
          search={goalsSearch}
          onSearchChange={(v) => {
            setGoalsSearch(v)
            fetchGoals(1)
          }}
          categoryFilter={goalsCategoryFilter}
          onCategoryFilterChange={(c) => {
            setGoalsCategoryFilter(c)
            fetchGoals(1)
          }}
          publishedFilter={goalsPublishedFilter}
          onPublishedFilterChange={(pub) => {
            setGoalsPublishedFilter(pub)
            fetchGoals(1)
          }}
          isLoading={loadingGoals}
          onNewGoal={() => {
            setEditingGoal(null)
            setGoalModalOpen(true)
          }}
          onEditGoal={(g) => {
            setEditingGoal(g)
            setGoalModalOpen(true)
          }}
          onManageCollections={(g) => {
            setGoalForOfferings(g)
            setGoalOfferingsModalOpen(true)
          }}
          onDeleteGoal={(g) => {
            setDeleteTarget({ type: 'GOAL', id: g.id, title: g.title })
          }}
          onTogglePublish={togglePublishGoal}
        />
      )}

      {activeTab === 'CATEGORIES' && (
        <CategoriesTab
          categories={categories}
          isLoading={loadingCategories}
          onNewCategory={() => {
            setEditingCategory(null)
            setCategoryModalOpen(true)
          }}
          onEditCategory={(c) => {
            setEditingCategory(c)
            setCategoryModalOpen(true)
          }}
          onDeleteCategory={(c) => {
            setDeleteTarget({ type: 'CATEGORY', id: c.id, title: c.name })
          }}
          onTogglePublish={(c) => updateCategory(c.id, { isPublished: !c.isPublished })}
        />
      )}

      {activeTab === 'OFFERINGS' && (
        <OfferingsTab
          offerings={offerings}
          vendors={vendors}
          totalOfferings={offeringsTotal}
          currentPage={offeringsPage}
          onPageChange={(p) => fetchOfferings(p)}
          search={offeringsSearch}
          onSearchChange={(v) => {
            setOfferingsSearch(v)
            fetchOfferings(1)
          }}
          typeFilter={offeringsTypeFilter}
          onTypeFilterChange={(t) => {
            setOfferingsTypeFilter(t)
            fetchOfferings(1)
          }}
          vendorFilter={offeringsVendorFilter}
          onVendorFilterChange={(vId) => {
            setOfferingsVendorFilter(vId)
            fetchOfferings(1)
          }}
          publishedFilter={offeringsPublishedFilter}
          onPublishedFilterChange={(pub) => {
            setOfferingsPublishedFilter(pub)
            fetchOfferings(1)
          }}
          isLoading={loadingOfferings}
          onNewOffering={() => {
            setEditingOffering(null)
            setOfferingModalOpen(true)
          }}
          onEditOffering={(off) => {
            setEditingOffering(off)
            setOfferingModalOpen(true)
          }}
          onManagePackageItems={(off) => {
            setPackageOffering(off)
            setPackageItemsModalOpen(true)
          }}
          onDeleteOffering={(off) => {
            setDeleteTarget({ type: 'OFFERING', id: off.id, title: off.title })
          }}
          onTogglePublish={togglePublishOffering}
        />
      )}

      {activeTab === 'VENDORS' && (
        <VendorsTab
          vendors={vendors}
          isLoading={loadingVendors}
          search={vendorsSearch}
          onSearchChange={(v) => {
            setVendorsSearch(v)
            fetchVendors()
          }}
          activeFilter={vendorsActiveFilter}
          onActiveFilterChange={(act) => {
            setVendorsActiveFilter(act)
            fetchVendors()
          }}
          onNewVendor={() => {
            setEditingVendor(null)
            setVendorModalOpen(true)
          }}
          onEditVendor={(v) => {
            setEditingVendor(v)
            setVendorModalOpen(true)
          }}
          onDeleteVendor={(v) => {
            setDeleteTarget({ type: 'VENDOR', id: v.id, title: v.name })
          }}
          onToggleActive={toggleVendorActive}
        />
      )}

      {activeTab === 'ORDERS' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} color="#888" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input
                type="text"
                placeholder="Search by order number, customer name, or phone..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 13,
                backgroundColor: '#fff',
              }}
            >
              <option value="PAID">Paid Orders (Actionable)</option>
              <option value="ALL">All Orders (Including Abandoned)</option>
              <option value="UNPAID">Unpaid / Abandoned Only</option>
            </select>

            <select
              value={fulfilmentStatusFilter}
              onChange={(e) => setFulfilmentStatusFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 13,
                backgroundColor: '#fff',
              }}
            >
              <option value="ALL">All Fulfilment Stages</option>
              <option value="ORDER_CONFIRMED">Awaiting Confirmation</option>
              <option value="PROCESSING">In Preparation</option>
              <option value="DISPATCHED">Dispatched & En Route</option>
              <option value="DELIVERED">Delivered</option>
              <option value="RECEIVED_CONFIRMED">Received & Confirmed</option>
              <option value="DISPUTED">Disputed</option>
            </select>
          </div>

          <CommerceOrdersTable
            orders={filteredOrders}
            total={fulfilmentStatusFilter === 'ALL' ? ordersTotal : filteredOrders.length}
            loading={loadingOrders}
            onUpdateSubOrder={async (subOrderUuid, payload) => {
              await updateSubOrderFulfilment(subOrderUuid, payload)
              fetchOrders({
                search: orderSearch || undefined,
                paymentStatus: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
              })
            }}
          />
        </>
      )}

      {activeTab === 'DISPUTES' && (
        <CommerceDisputesTable
          disputes={disputes}
          total={disputesTotal}
          loading={loadingDisputes}
          onResolveDispute={async (disputeUuid, payload) => {
            await resolveDispute(disputeUuid, payload)
            fetchDisputes()
          }}
        />
      )}

      {activeTab === 'ZONES' && (
        <DeliveryZonesTable
          zones={deliveryZones}
          isLoading={loadingDeliveryZones}
          onRefresh={fetchDeliveryZones}
          onCreateZone={createDeliveryZone}
          onUpdateZone={updateDeliveryZone}
          onToggleZone={toggleDeliveryZone}
          onDeleteZone={deleteDeliveryZone}
        />
      )}

      {/* Catalog Management Modals */}
      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        category={editingCategory}
        onSubmit={async (data) => {
          if (editingCategory) {
            await updateCategory(editingCategory.id, data)
          } else {
            await createCategory(data)
          }
        }}
      />

      <GoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        goal={editingGoal}
        categories={categories}
        onSubmit={async (data) => {
          if (editingGoal) {
            await updateGoal(editingGoal.id, data)
          } else {
            await createGoal(data)
          }
        }}
      />

      <OfferingModal
        isOpen={offeringModalOpen}
        onClose={() => setOfferingModalOpen(false)}
        offering={editingOffering}
        vendors={vendors}
        goals={goals}
        onSubmit={async (data, linkedGoalIds) => {
          let savedOffering: Offering | undefined
          if (editingOffering) {
            savedOffering = await updateOffering(editingOffering.id, data)
          } else {
            savedOffering = await createOffering(data)
          }

          if (savedOffering && linkedGoalIds !== undefined) {
            const currentLinked = (savedOffering.goalLinks || editingOffering?.goalLinks || []).map(
              (gl) => gl.goalId,
            )
            const toAdd = linkedGoalIds.filter((id) => !currentLinked.includes(id))
            const toRemove = currentLinked.filter((id) => !linkedGoalIds.includes(id))

            for (const goalId of toAdd) {
              await linkOfferingToGoal(goalId, { offeringId: savedOffering.id })
            }
            for (const goalId of toRemove) {
              await unlinkOfferingFromGoal(goalId, savedOffering.id)
            }
            fetchOfferings(offeringsPage)
            fetchGoals(goalsPage)
          }
        }}
      />

      <PackageItemsModal
        isOpen={packageItemsModalOpen}
        onClose={() => setPackageItemsModalOpen(false)}
        packageOffering={packageOffering}
        allOfferings={offerings}
        onSubmit={setPackageItems}
      />

      <GoalOfferingsModal
        isOpen={goalOfferingsModalOpen}
        onClose={() => setGoalOfferingsModalOpen(false)}
        goal={goalForOfferings}
        allOfferings={offerings}
        fetchGoalCollections={fetchGoalCollections}
        onCreateCollection={createCollection}
        onDeleteCollection={deleteCollection}
        onLinkOffering={linkOfferingToGoal}
        onUnlinkOffering={unlinkOfferingFromGoal}
      />

      <VendorModal
        isOpen={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
        vendor={editingVendor}
        onSubmit={async (data) => {
          if (editingVendor) {
            await updateVendor(editingVendor.id, data)
          } else {
            await createVendor(data)
          }
        }}
      />

      <DeleteGoalItemModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        target={deleteTarget}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
