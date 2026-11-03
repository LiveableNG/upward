import { useState, useCallback, useEffect } from 'react'
import { apiService } from '../../../services/api.service'
import { showToast } from '@upward/client-core'
import type {
  GoalCategory,
  Goal,
  GoalCollection,
  Offering,
  CommerceVendor,
  GoalsOverview,
  OfferingType,
} from '../types'

export function useGoalManagement(token?: string) {
  // 1. Overview
  const [overview, setOverview] = useState<GoalsOverview | null>(null)
  const [loadingOverview, setLoadingOverview] = useState(false)

  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true)
    try {
      const res = await apiService.get('/admin/goals/overview', token)
      if (res && res.data) {
        setOverview(res.data)
      }
    } catch (err: unknown) {
      console.error('Failed to fetch goals overview:', err)
    } finally {
      setLoadingOverview(false)
    }
  }, [token])

  // 2. Categories
  const [categories, setCategories] = useState<GoalCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true)
    try {
      const res = await apiService.get('/admin/goals/categories', token)
      if (res && res.data) {
        setCategories(res.data)
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to load categories'
      console.error('Failed to fetch categories:', err)
      showToast(msg, true)
    } finally {
      setLoadingCategories(false)
    }
  }, [token])

  // 3. Goals
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalsTotal, setGoalsTotal] = useState(0)
  const [goalsPage, setGoalsPage] = useState(1)
  const [goalsSearch, setGoalsSearch] = useState('')
  const [goalsCategoryFilter, setGoalsCategoryFilter] = useState<number | undefined>(undefined)
  const [goalsPublishedFilter, setGoalsPublishedFilter] = useState<boolean | undefined>(undefined)
  const [loadingGoals, setLoadingGoals] = useState(false)
  const GOALS_PAGE_SIZE = 20

  const fetchGoals = useCallback(
    async (page: number = goalsPage) => {
      setLoadingGoals(true)
      try {
        const queryParams = new URLSearchParams()
        queryParams.set('skip', String((page - 1) * GOALS_PAGE_SIZE))
        queryParams.set('take', String(GOALS_PAGE_SIZE))
        if (goalsSearch.trim()) queryParams.set('search', goalsSearch.trim())
        if (goalsCategoryFilter !== undefined) queryParams.set('categoryId', String(goalsCategoryFilter))
        if (goalsPublishedFilter !== undefined) queryParams.set('isPublished', String(goalsPublishedFilter))

        const res = await apiService.get(`/admin/goals/list?${queryParams.toString()}`, token)
        if (res && res.data) {
          setGoals(res.data)
          setGoalsTotal(res.meta?.total || 0)
          setGoalsPage(page)
        }
      } catch (err: unknown) {
        const msg = (err as Error)?.message || 'Failed to load goals'
        console.error('Failed to fetch goals:', err)
        showToast(msg, true)
      } finally {
        setLoadingGoals(false)
      }
    },
    [token, goalsPage, goalsSearch, goalsCategoryFilter, goalsPublishedFilter],
  )

  // 4. Offerings
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [offeringsTotal, setOfferingsTotal] = useState(0)
  const [offeringsPage, setOfferingsPage] = useState(1)
  const [offeringsSearch, setOfferingsSearch] = useState('')
  const [offeringsTypeFilter, setOfferingsTypeFilter] = useState<OfferingType | undefined>(undefined)
  const [offeringsVendorFilter, setOfferingsVendorFilter] = useState<number | undefined>(undefined)
  const [offeringsPublishedFilter, setOfferingsPublishedFilter] = useState<boolean | undefined>(undefined)
  const [loadingOfferings, setLoadingOfferings] = useState(false)
  const OFFERINGS_PAGE_SIZE = 20

  const fetchOfferings = useCallback(
    async (page: number = offeringsPage) => {
      setLoadingOfferings(true)
      try {
        const queryParams = new URLSearchParams()
        queryParams.set('skip', String((page - 1) * OFFERINGS_PAGE_SIZE))
        queryParams.set('take', String(OFFERINGS_PAGE_SIZE))
        if (offeringsSearch.trim()) queryParams.set('search', offeringsSearch.trim())
        if (offeringsTypeFilter) queryParams.set('type', offeringsTypeFilter)
        if (offeringsVendorFilter !== undefined) queryParams.set('vendorId', String(offeringsVendorFilter))
        if (offeringsPublishedFilter !== undefined) queryParams.set('isPublished', String(offeringsPublishedFilter))

        const res = await apiService.get(`/admin/goals/offerings?${queryParams.toString()}`, token)
        if (res && res.data) {
          setOfferings(res.data)
          setOfferingsTotal(res.meta?.total || 0)
          setOfferingsPage(page)
        }
      } catch (err: unknown) {
        const msg = (err as Error)?.message || 'Failed to load offerings'
        console.error('Failed to fetch offerings:', err)
        showToast(msg, true)
      } finally {
        setLoadingOfferings(false)
      }
    },
    [token, offeringsPage, offeringsSearch, offeringsTypeFilter, offeringsVendorFilter, offeringsPublishedFilter],
  )

  // 5. Vendors
  const [vendors, setVendors] = useState<CommerceVendor[]>([])
  const [vendorsSearch, setVendorsSearch] = useState('')
  const [vendorsActiveFilter, setVendorsActiveFilter] = useState<boolean | undefined>(undefined)
  const [loadingVendors, setLoadingVendors] = useState(false)

  const fetchVendors = useCallback(async () => {
    setLoadingVendors(true)
    try {
      const queryParams = new URLSearchParams()
      if (vendorsSearch.trim()) queryParams.set('search', vendorsSearch.trim())
      if (vendorsActiveFilter !== undefined) queryParams.set('isActive', String(vendorsActiveFilter))

      const res = await apiService.get(`/admin/goals/vendors?${queryParams.toString()}`, token)
      if (res && res.data) {
        setVendors(res.data)
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to load commerce vendors'
      console.error('Failed to fetch vendors:', err)
      showToast(msg, true)
    } finally {
      setLoadingVendors(false)
    }
  }, [token, vendorsSearch, vendorsActiveFilter])

  // CRUD Mutations
  // Category CRUD
  const createCategory = async (data: Record<string, unknown>) => {
    try {
      const res = await apiService.post('/admin/goals/categories', data, token)
      showToast('Category created successfully')
      fetchCategories()
      fetchOverview()
      return res.data
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to create category'
      showToast(msg, true)
      throw err
    }
  }

  const updateCategory = async (id: number, data: Record<string, unknown>) => {
    try {
      const res = await apiService.patch(`/admin/goals/categories/${id}`, data, token)
      showToast('Category updated')
      fetchCategories()
      return res.data
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to update category'
      showToast(msg, true)
      throw err
    }
  }

  const deleteCategory = async (id: number) => {
    try {
      await apiService.delete(`/admin/goals/categories/${id}`, token)
      showToast('Category deleted')
      fetchCategories()
      fetchOverview()
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to delete category'
      showToast(msg, true)
      throw err
    }
  }

  // Goal CRUD
  const createGoal = async (data: Record<string, unknown>) => {
    try {
      const res = await apiService.post('/admin/goals/create', data, token)
      showToast('Goal created successfully')
      fetchGoals(1)
      fetchOverview()
      return res.data
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to create goal'
      showToast(msg, true)
      throw err
    }
  }

  const updateGoal = async (id: number, data: Record<string, unknown>) => {
    try {
      const res = await apiService.patch(`/admin/goals/update/${id}`, data, token)
      showToast('Goal updated successfully')
      fetchGoals(goalsPage)
      return res.data
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to update goal'
      showToast(msg, true)
      throw err
    }
  }

  const deleteGoal = async (id: number) => {
    try {
      await apiService.delete(`/admin/goals/delete/${id}`, token)
      showToast('Goal deleted successfully')
      fetchGoals(1)
      fetchOverview()
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to delete goal'
      showToast(msg, true)
      throw err
    }
  }

  const togglePublishGoal = async (goal: Goal) => {
    await updateGoal(goal.id, { isPublished: !goal.isPublished })
  }

  // Goal Collection & Offering Linking
  const fetchGoalCollections = useCallback(
    async (goalId: number): Promise<GoalCollection[]> => {
      try {
        const res = await apiService.get(`/admin/goals/${goalId}/collections`, token)
        return res?.data || []
      } catch (err: unknown) {
        const msg = (err as Error)?.message || 'Failed to fetch collections'
        showToast(msg, true)
        return []
      }
    },
    [token],
  )

  const createCollection = async (data: Record<string, unknown>) => {
    try {
      const res = await apiService.post('/admin/goals/collections', data, token)
      showToast('Collection created')
      return res.data
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to create collection'
      showToast(msg, true)
      throw err
    }
  }

  const updateCollection = async (id: number, data: Record<string, unknown>) => {
    try {
      const res = await apiService.patch(`/admin/goals/collections/${id}`, data, token)
      showToast('Collection updated')
      return res.data
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to update collection'
      showToast(msg, true)
      throw err
    }
  }

  const deleteCollection = async (id: number) => {
    try {
      await apiService.delete(`/admin/goals/collections/${id}`, token)
      showToast('Collection deleted')
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to delete collection'
      showToast(msg, true)
      throw err
    }
  }

  const linkOfferingToGoal = async (
    goalId: number,
    dto: { offeringId: number; collectionId?: number; isFeatured?: boolean },
  ) => {
    try {
      const res = await apiService.post(`/admin/goals/${goalId}/offerings/link`, dto, token)
      showToast('Offering linked to goal')
      return res.data
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to link offering'
      showToast(msg, true)
      throw err
    }
  }

  const unlinkOfferingFromGoal = async (goalId: number, offeringId: number, collectionId?: number) => {
    try {
      const query = collectionId ? `?collectionId=${collectionId}` : ''
      await apiService.delete(`/admin/goals/${goalId}/offerings/${offeringId}${query}`, token)
      showToast('Offering unlinked from goal')
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to unlink offering'
      showToast(msg, true)
      throw err
    }
  }

  // Offering CRUD
  const createOffering = async (data: Record<string, unknown>) => {
    try {
      const res = await apiService.post('/admin/goals/offerings', data, token)
      showToast('Offering created successfully')
      fetchOfferings(1)
      fetchOverview()
      return res.data
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to create offering'
      showToast(msg, true)
      throw err
    }
  }

  const updateOffering = async (id: number, data: Record<string, unknown>) => {
    try {
      const res = await apiService.patch(`/admin/goals/offerings/${id}`, data, token)
      showToast('Offering updated successfully')
      fetchOfferings(offeringsPage)
      return res.data
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to update offering'
      showToast(msg, true)
      throw err
    }
  }

  const deleteOffering = async (id: number) => {
    try {
      await apiService.delete(`/admin/goals/offerings/${id}`, token)
      showToast('Offering deleted successfully')
      fetchOfferings(1)
      fetchOverview()
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to delete offering'
      showToast(msg, true)
      throw err
    }
  }

  const togglePublishOffering = async (offering: Offering) => {
    await updateOffering(offering.id, { isPublished: !offering.isPublished })
  }

  const setPackageItems = async (
    packageId: number,
    items: Array<{ componentId: number; quantity: number; isOptional?: boolean; overridePrice?: number }>,
  ) => {
    try {
      const res = await apiService.put(`/admin/goals/offerings/${packageId}/package-items`, { items }, token)
      showToast('Package items updated')
      fetchOfferings(offeringsPage)
      return res.data
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to update package items'
      showToast(msg, true)
      throw err
    }
  }

  // Vendor CRUD
  const createVendor = async (data: Record<string, unknown>) => {
    try {
      const res = await apiService.post('/admin/goals/vendors', data, token)
      showToast('Commerce vendor created')
      fetchVendors()
      fetchOverview()
      return res.data
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to create vendor'
      showToast(msg, true)
      throw err
    }
  }

  const updateVendor = async (id: number, data: Record<string, unknown>) => {
    try {
      const res = await apiService.patch(`/admin/goals/vendors/${id}`, data, token)
      showToast('Vendor updated')
      fetchVendors()
      return res.data
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to update vendor'
      showToast(msg, true)
      throw err
    }
  }

  const deleteVendor = async (id: number) => {
    try {
      await apiService.delete(`/admin/goals/vendors/${id}`, token)
      showToast('Vendor deleted')
      fetchVendors()
      fetchOverview()
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to delete vendor'
      showToast(msg, true)
      throw err
    }
  }

  const toggleVendorActive = async (vendor: CommerceVendor) => {
    await updateVendor(vendor.id, { isActive: !vendor.isActive })
  }

  // Initial loading
  useEffect(() => {
    if (token) {
      fetchOverview()
      fetchCategories()
      fetchGoals(1)
      fetchOfferings(1)
      fetchVendors()
    }
  }, [token, fetchOverview, fetchCategories, fetchGoals, fetchOfferings, fetchVendors])

  return {
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
    updateCollection,
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
  }
}
