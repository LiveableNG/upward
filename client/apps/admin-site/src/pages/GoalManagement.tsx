import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  type GoalTab,
  type GoalManagementProps,
  type GoalCategory,
  type Goal,
  type Offering,
  type CommerceVendor,
  type DeleteTarget,
  useGoalManagement,
  GoalManagementHeader,
  GoalTabNav,
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

export default function GoalManagement({ token }: GoalManagementProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')?.toUpperCase() as GoalTab | undefined
  const activeTab: GoalTab =
    rawTab && ['OVERVIEW', 'GOALS', 'CATEGORIES', 'OFFERINGS', 'VENDORS'].includes(rawTab)
      ? rawTab
      : 'OVERVIEW'

  const handleTabChange = (tab: GoalTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (tab === 'OVERVIEW') {
        next.delete('tab')
      } else {
        next.set('tab', tab.toLowerCase())
      }
      return next
    })
  }

  // Hook connecting to Phase 1 backend
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

  // Modal States
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

  // Master refresh
  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([
      fetchOverview(),
      fetchCategories(),
      fetchGoals(goalsPage),
      fetchOfferings(offeringsPage),
      fetchVendors(),
    ])
    setIsRefreshing(false)
  }

  // Delete Confirm Action
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
  }

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <GoalManagementHeader
        onRefresh={handleRefresh}
        onNewGoal={() => {
          setEditingGoal(null)
          setGoalModalOpen(true)
        }}
        onNewOffering={() => {
          setEditingOffering(null)
          setOfferingModalOpen(true)
        }}
        onNewVendor={() => {
          setEditingVendor(null)
          setVendorModalOpen(true)
        }}
        isRefreshing={isRefreshing}
      />

      {/* Tab Navigation */}
      <GoalTabNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        totalGoals={goalsTotal}
        totalCategories={categories.length}
        totalOfferings={offeringsTotal}
        totalVendors={vendors.length}
      />

      {/* Tab Contents */}
      {activeTab === 'OVERVIEW' && (
        <OverviewTab
          overview={overview}
          isLoading={loadingOverview}
          onNavigateTab={handleTabChange}
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

      {/* Modals */}
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
            const currentLinked = (savedOffering.goalLinks || editingOffering?.goalLinks || []).map((gl) => gl.goalId)
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
