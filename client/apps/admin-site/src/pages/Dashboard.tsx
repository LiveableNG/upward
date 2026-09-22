import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCcw, Clock, LayoutDashboard, GraduationCap, Wallet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

import FilterToolbar, { type DateFilter } from '../features/dashboard/components/FilterToolbar'
import { UsersTable, type UnifiedUserRecord } from '../features/dashboard/components/UsersTable'
import { PmsTable } from '../features/dashboard/components/PmsTable'
import OverviewTab from '../features/dashboard/components/OverviewTab'
import PreviewDrawer, { type DrawerEntity } from '../features/dashboard/components/PreviewDrawer'
import { DeleteConfirmationModal } from '../features/dashboard/components/DeleteConfirmationModal'
import { LoginSessionsTab } from '../features/dashboard/components/LoginSessionsTab'
import SkeletonStyles, {
  MetricCardSkeleton,
  TableSkeleton,
} from '../features/dashboard/components/Skeletons'

import { DataDeletionSection } from '../features/dashboard/components/DataDeletionSection'
import type { EligibleAccount } from '../features/dashboard/components/PermanentDeleteUserModal'
import {
  TenancyExpiryFilter,
  type ExpiryFilterCounts,
} from '../features/dashboard/components/TenancyExpiryFilter'

// Feature Types
import type {
  WaitlistRecord,
  SignedUpRecord,
  InvitedRecord,
  PmRecord,
  MetricsSummary,
  ExpiryPreset,
  ExpiryMonthYearRange,
  RentValueFilter,
  RentFilterCounts,
} from '../features/dashboard/types'
import { flattenMetrics } from '../features/dashboard/types'

type ActiveTab = 'overview' | 'users' | 'pms' | 'sessions' | 'data-deletion'

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50]

function readLocalPref<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key)
    if (val !== null) return JSON.parse(val) as T
  } catch {
    /* ignore */
  }
  return fallback
}

function writeLocalPref(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

function getRentExpiryDate(u: UnifiedUserRecord): Date | null {
  const raw =
    u.rentExpiryDate ||
    u.rentEndDate ||
    u.properties?.[0]?.rentEndDate ||
    u.rawRecord?.rentEndDate ||
    u.rawRecord?.rentExpiryDate
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

function checkExpiryMatch(
  userDate: Date | null,
  preset: ExpiryPreset,
  customRange: ExpiryMonthYearRange | null
): boolean {
  if (preset === 'all' && !customRange) return true
  if (!userDate) return false

  const now = new Date()

  if (preset === 'next30') {
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    return userDate >= now && userDate <= end
  }
  if (preset === 'next60') {
    const end = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
    return userDate >= now && userDate <= end
  }
  if (preset === 'next90') {
    const end = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    return userDate >= now && userDate <= end
  }
  if (preset === 'thisYear') {
    const y = now.getFullYear()
    const start = new Date(y, 0, 1, 0, 0, 0, 0)
    const end = new Date(y, 11, 31, 23, 59, 59, 999)
    return userDate >= start && userDate <= end
  }
  if (preset === 'nextYear') {
    const y = now.getFullYear() + 1
    const start = new Date(y, 0, 1, 0, 0, 0, 0)
    const end = new Date(y, 11, 31, 23, 59, 59, 999)
    return userDate >= start && userDate <= end
  }
  if (preset === 'custom' && customRange) {
    const start = new Date(
      customRange.fromYear,
      customRange.fromMonth,
      1,
      0,
      0,
      0,
      0
    )
    const end = new Date(
      customRange.toYear,
      customRange.toMonth + 1,
      0,
      23,
      59,
      59,
      999
    )
    return userDate >= start && userDate <= end
  }
  return true
}

interface DashboardProps {
  token: string
  adminRole?: string
}

const Dashboard: React.FC<DashboardProps> = ({ token, adminRole }) => {
  const isSuperadmin = adminRole === 'SUPERADMIN' || adminRole === 'DEVELOPER'

  // ── Tab State (persisted) ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const saved = readLocalPref<ActiveTab | string>('dash_activeTab', 'overview')
    if (
      saved === 'waitlist' ||
      saved === 'signedUp' ||
      saved === 'invited' ||
      saved === 'revenue'
    ) {
      return 'users'
    }
    return saved as ActiveTab
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    readLocalPref<number>('dash_itemsPerPage', 10),
  )

  // ── Date Filters ───────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateFilter>('all')

  // ── Metrics Data State ─────────────────────────────────────────
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null)
  const flatMetrics = useMemo(() => {
    return metrics ? flattenMetrics(metrics) : null
  }, [metrics])
  const [waitlistList, setWaitlistList] = useState<WaitlistRecord[]>([])
  const [signedUpList, setSignedUpList] = useState<SignedUpRecord[]>([])
  const [invitedList, setInvitedList] = useState<InvitedRecord[]>([])
  const [pmList, setPmList] = useState<PmRecord[]>([])

  // ── Selection / Bulk Delete State ──────────────────────────────
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; ids: string[] }>({
    show: false,
    ids: [],
  })
  const [deleting, setDeleting] = useState(false)

  // ── Unified Users filters ──────────────────────────────────────
  const [usersSubtab, setUsersSubtab] = useState<'signedUp' | 'guest' | 'unsynced'>('signedUp')
  const [originFilter, setOriginFilter] = useState<
    'all' | 'waitlist' | 'selfRegistered' | 'invited'
  >('all')
  const [contactFilter, setContactFilter] = useState<
    'all' | 'emailOnly' | 'phoneOnly' | 'both' | 'neither'
  >('all')
  const [propertyFilter, setPropertyFilter] = useState<
    'all' | 'withProperty' | 'withoutProperty'
  >('all')
  const [tenancyDateFilter, setTenancyDateFilter] = useState<
    | 'all'
    | 'withBothDates'
    | 'withExpiryDate'
    | 'withoutExpiryDate'
    | 'withStartDate'
    | 'withoutStartDate'
    | 'noDates'
  >('all')
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>('all')
  const [expiryCustomRange, setExpiryCustomRange] =
    useState<ExpiryMonthYearRange | null>(null)
  const [pmFilter, setPmFilter] = useState<'all' | string>('all')
  const [rentValueFilter, setRentValueFilter] = useState<RentValueFilter>('all')

  // ── Preview Drawer State ───────────────────────────────────────
  const [drawerEntity, setDrawerEntity] = useState<DrawerEntity | null>(null)

  // ── Last Refreshed Timestamp ───────────────────────────────────
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    if (!lastRefreshed) return
    const update = () => {
      const secs = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000)
      if (secs < 60) setElapsed(`${secs}s ago`)
      else if (secs < 3600) setElapsed(`${Math.floor(secs / 60)}m ago`)
      else setElapsed(`${Math.floor(secs / 3600)}h ago`)
    }
    update()
    const id = setInterval(update, 10000)
    return () => clearInterval(id)
  }, [lastRefreshed])

  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  // ── Fetch Dashboard Data ───────────────────────────────────────
  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      let queryStart = ''
      let queryEnd = ''

      const now = new Date()
      if (dateRange === 'today') {
        queryStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      } else if (dateRange === 'week') {
        queryStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      } else if (dateRange === 'month') {
        queryStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      } else if (dateRange === 'custom') {
        queryStart = customStartDate ? new Date(customStartDate).toISOString() : ''
        queryEnd = customEndDate ? new Date(customEndDate).toISOString() : ''
      } else {
        queryStart = ''
        queryEnd = ''
      }

      const params = new URLSearchParams({
        ...(queryStart && { startDate: queryStart }),
        ...(queryEnd && { endDate: queryEnd }),
        ...(search && { search }),
      })

      const res = await apiService.get(`/admin/performance-metrics?${params.toString()}`, token)
      setMetrics(res.metrics)
      setWaitlistList(res.directories.waitlist)
      setSignedUpList(res.directories.signedUp)
      setInvitedList(res.directories.invited)
      setPmList(res.directories.pms)
    } catch (err) {
      console.error(err)
      showToast('Failed to fetch dashboard metrics', true)
    } finally {
      setLoading(false)
      setLastRefreshed(new Date())
    }
  }

  const [eligibleAccounts, setEligibleAccounts] = useState<EligibleAccount[]>([])
  const [eligibleLoading, setEligibleLoading] = useState(false)

  const fetchEligibleAccounts = async () => {
    try {
      setEligibleLoading(true)
      const res = await apiService.get('/admin/users/eligible-for-deletion', token)
      setEligibleAccounts(res)
    } catch (err) {
      console.error(err)
    } finally {
      setEligibleLoading(false)
    }
  }

  useEffect(() => {
    fetchEligibleAccounts()
  }, [])

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchDashboardData()
    }, 450)
    return () => clearTimeout(handler)
  }, [dateRange, search, customStartDate, customEndDate])

  // ── Persist preferences ────────────────────────────────────────
  useEffect(() => {
    writeLocalPref('dash_activeTab', activeTab)
  }, [activeTab])

  useEffect(() => {
    writeLocalPref('dash_itemsPerPage', itemsPerPage)
  }, [itemsPerPage])

  // Reset page when tab or items-per-page changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, itemsPerPage])

  // ── Bulk User delete handlers ──────────────────────────────────
  const handleBatchDelete = async (ids: string[]) => {
    setDeleting(true)
    try {
      await apiService.post('/admin/users/batch-delete', { ids }, token)
      showToast(`Successfully deleted ${ids.length} records`)
      setSelectedUserIds(new Set())
      setDeleteModal({ show: false, ids: [] })
      fetchDashboardData()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete selected items', true)
    } finally {
      setDeleting(false)
    }
  }

  const triggerBulkDelete = () => {
    if (selectedUserIds.size === 0) return
    setDeleteModal({ show: true, ids: Array.from(selectedUserIds) })
  }

  const toggleSelectUser = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const next = new Set(selectedUserIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedUserIds(next)
  }

  const toggleSelectAllUsers = () => {
    if (selectedUserIds.size === currentDirectoryList.length) {
      setSelectedUserIds(new Set())
    } else {
      setSelectedUserIds(new Set(currentDirectoryList.map((item: any) => item.uuid)))
    }
  }

  const openDrawerForUser = (item: UnifiedUserRecord | any) => {
    let userStatus = 'PENDING_TENANT'
    let userType = 'PENDING_TENANT'

    if (item && 'origin' in item) {
      // UnifiedUserRecord
      const isPaid = item.totalPaid > 0
      userStatus = isPaid ? 'TENANT' : 'PENDING_TENANT'
      userType = isPaid ? 'TENANT' : 'PENDING_TENANT'
    } else if (item) {
      // Legacy structure
      if ('hasPaid' in item) {
        const isPaid = item.hasPaid || item.totalPaid > 0
        userStatus = isPaid ? 'TENANT' : 'PENDING_TENANT'
        userType = isPaid ? 'TENANT' : 'PENDING_TENANT'
      } else if ('status' in item) {
        const isPaid =
          item.status === 'SIGNED_UP_PAID' || item.status === 'GUEST_PAID' || item.totalPaid > 0
        userStatus = isPaid ? 'TENANT' : 'PENDING_TENANT'
        userType = isPaid ? 'TENANT' : 'PENDING_TENANT'
      } else if ('converted' in item) {
        const isPaid = item.converted || item.totalPaid > 0
        userStatus = isPaid ? 'TENANT' : 'PENDING_TENANT'
        userType = isPaid ? 'TENANT' : 'PENDING_TENANT'
      }
    }

    const invitedAt = item.invitedAt !== undefined ? item.invitedAt : item.rawRecord?.invitedAt || null
    const joinedAt = item.joinedAt !== undefined ? item.joinedAt : item.rawRecord?.joinedAt || null
    const createdAt = item.createdAt || item.rawRecord?.createdAt

    setDrawerEntity({
      kind: 'user',
      uuid: item.uuid,
      name: item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim(),
      email: item.email,
      phone: item.phone,
      status: userStatus,
      type: userType,
      upwardScore: item.upwardScore || item.rawRecord?.upwardScore,
      invitedAt,
      joinedAt,
      createdAt,
      hearAboutUs: item.hearAboutUs || item.rawRecord?.hearAboutUs || null,
      totalPaid: item.totalPaid,
      propertyCount: item.propertiesCount || item.properties?.length || (item.rawRecord?.properties?.length || 0),
      properties: item.properties || item.rawRecord?.properties || [],
      rentStartDate: item.rentStartDate || item.rawRecord?.rentStartDate || null,
      rentEndDate: item.rentEndDate || item.rentExpiryDate || item.rawRecord?.rentEndDate || item.rawRecord?.rentExpiryDate || null,
      transactions: item.transactions || [],
      paymentRequests: item.paymentRequests || [],
    })
  }

  const openDrawerForPm = (pm: PmRecord) => {
    setDrawerEntity({
      kind: 'pm',
      uuid: pm.uuid,
      name: pm.businessName,
      email: pm.email,
      phone: pm.phone,
      status: pm.isVerified ? 'VERIFIED' : 'UNVERIFIED',
      type: pm.isVerified ? 'VERIFIED' : 'UNVERIFIED',
      joinedAt: pm.createdAt,
      totalPaid: pm.totalGenerated,
      propertyCount: pm.propertiesCount,
    })
  }

  const unifiedUsers = useMemo((): UnifiedUserRecord[] => {
    const list: UnifiedUserRecord[] = []

    waitlistList.forEach((w) => {
      const wProps = w.properties || []
      const wTotalRent = wProps.reduce((sum, p) => sum + (Number(p.rentAmount) || 0), 0)
      const wRent = wTotalRent > 0 ? wTotalRent : (wProps[0]?.rentAmount ? Number(wProps[0].rentAmount) : null)
      const hasProp = !!(w.hasUserProperty || wProps.length > 0)
      list.push({
        id: w.id,
        uuid: w.uuid,
        firstName: w.firstName,
        lastName: w.lastName,
        email: w.email,
        phone: w.phone,
        createdAt: w.createdAt,
        joinedAt: null, // Waitlist never has a password or a joined date
        origin: 'WAITLIST',
        hasPassword: false,
        isExWaitlist: false,
        totalPaid: 0,
        upwardScore: undefined,
        hasUserProperty: hasProp,
        propertiesCount: w.propertiesCount || wProps.length,
        properties: wProps,
        rentAmount: wRent,
        rentStartDate: w.rentStartDate || null,
        rentEndDate: w.rentEndDate || null,
        rentExpiryDate: w.rentEndDate || undefined,
        pms: w.pms,
        rawRecord: w,
      })
    })

    signedUpList.forEach((u) => {
      const uProps = u.properties || []
      const uTotalRent = uProps.reduce((sum, p) => sum + (Number(p.rentAmount) || 0), 0)
      const uRent = uTotalRent > 0 ? uTotalRent : (uProps[0]?.rentAmount ? Number(uProps[0].rentAmount) : null)
      const hasProp = !!(u.hasUserProperty || uProps.length > 0)
      list.push({
        id: u.id,
        uuid: u.uuid,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        createdAt: u.createdAt,
        joinedAt: u.joinedAt, // Mapped from backend
        origin: u.origin || 'SELF_REGISTERED',
        hasPassword: u.hasPassword ?? true,
        isExWaitlist: u.origin === 'WAITLIST',
        totalPaid: u.totalPaid,
        upwardScore: u.upwardScore || undefined,
        hasUserProperty: hasProp,
        propertiesCount: u.propertiesCount || uProps.length,
        properties: uProps,
        rentAmount: uRent,
        rentStartDate: u.rentStartDate || null,
        rentEndDate: u.rentEndDate || u.rentExpiryDate || null,
        rentExpiryDate: u.rentExpiryDate || u.rentEndDate || undefined,
        hearAboutUs: u.hearAboutUs,
        pms: u.pms,
        rawRecord: u,
      })
    })

    invitedList.forEach((i) => {
      const iProps = i.properties || []
      const iTotalRent = iProps.reduce((sum, p) => sum + (Number(p.rentAmount) || 0), 0)
      const iRent = iTotalRent > 0 ? iTotalRent : (iProps[0]?.rentAmount ? Number(iProps[0].rentAmount) : null)
      const hasProp = !!(i.hasUserProperty || iProps.length > 0)
      list.push({
        id: i.id,
        uuid: i.uuid,
        firstName: i.firstName,
        lastName: i.lastName,
        email: i.email,
        phone: i.phone,
        createdAt: i.createdAt,
        invitedAt: i.invitedAt || i.createdAt,
        joinedAt: i.joinedAt, // Mapped from backend
        origin: i.origin || 'INVITED_EMAIL',
        hasPassword: i.hasPassword ?? false,
        isExWaitlist: i.origin === 'WAITLIST',
        pms: i.pms,
        totalPaid: i.totalPaid,
        upwardScore: i.upwardScore || undefined,
        hasUserProperty: hasProp,
        propertiesCount: i.propertiesCount || iProps.length,
        properties: iProps,
        rentAmount: iRent,
        rentStartDate: i.rentStartDate || null,
        rentEndDate: i.rentEndDate || i.rentExpiryDate || null,
        rentExpiryDate: i.rentExpiryDate || i.rentEndDate || undefined,
        failureReason: i.failureReason,
        rawRecord: i,
      })
    })

    return list
  }, [waitlistList, signedUpList, invitedList])

  const getUserRentAmount = (u: UnifiedUserRecord): number => {
    if (u.rentAmount != null && u.rentAmount > 0) return u.rentAmount
    if (u.properties && u.properties.length > 0) {
      return u.properties.reduce((sum, p) => sum + (Number(p.rentAmount) || 0), 0)
    }
    return 0
  }


  const subtabUsers = useMemo(() => {
    return unifiedUsers.filter((u) => {
      if (usersSubtab === 'signedUp') return u.hasPassword
      if (usersSubtab === 'guest') return !u.hasPassword && u.rawRecord?.isSynced !== false
      if (usersSubtab === 'unsynced') return u.rawRecord?.isSynced === false
      return false
    })
  }, [unifiedUsers, usersSubtab])

  const usersFilteredByPm = useMemo(() => {
    if (pmFilter === 'all') return subtabUsers

    const selectedPm = pmList.find((pm) => pm.uuid === pmFilter)
    const pmUuidsToCheck = selectedPm?.mergedUuids || [pmFilter]

    return subtabUsers.filter((u) => {
      if (u.pms && u.pms.length > 0) {
        return u.pms.some((pm) => pmUuidsToCheck.includes(pm.uuid))
      }
      return false
    })
  }, [subtabUsers, pmFilter, pmList])

  const originCounts = useMemo(() => {
    let waitlist = 0
    let selfRegistered = 0
    let invited = 0

    usersFilteredByPm.forEach((u) => {
      if (u.origin === 'WAITLIST') waitlist++
      else if (u.origin === 'SELF_REGISTERED') selfRegistered++
      else if (u.origin === 'INVITED_EMAIL' || u.origin === 'INVITED_PHONE') invited++
    })

    return {
      all: usersFilteredByPm.length,
      waitlist,
      selfRegistered,
      invited,
    }
  }, [usersFilteredByPm])

  const contactCounts = useMemo(() => {
    let emailOnly = 0
    let phoneOnly = 0
    let both = 0
    let neither = 0

    // Filter by origin first so counts reflect the current origin filter
    const originFiltered = usersFilteredByPm.filter((u) => {
      if (originFilter === 'waitlist' && u.origin !== 'WAITLIST') return false
      if (originFilter === 'selfRegistered' && u.origin !== 'SELF_REGISTERED') return false
      if (
        originFilter === 'invited' &&
        u.origin !== 'INVITED_EMAIL' &&
        u.origin !== 'INVITED_PHONE'
      )
        return false
      return true
    })

    originFiltered.forEach((u) => {
      const emailStr = u.email || ''
      const hasRealEmail = emailStr.length > 0 && !emailStr.endsWith('@upward.com')
      const hasPhone = !!u.phone

      if (hasRealEmail && !hasPhone) emailOnly++
      else if (!hasRealEmail && hasPhone) phoneOnly++
      else if (hasRealEmail && hasPhone) both++
      else neither++
    })

    return { emailOnly, phoneOnly, both, neither }
  }, [usersFilteredByPm, originFilter])

  const propertyCounts = useMemo(() => {
    let withProperty = 0
    let withoutProperty = 0

    const baseFiltered = usersFilteredByPm.filter((u) => {
      if (originFilter === 'waitlist' && u.origin !== 'WAITLIST') return false
      if (originFilter === 'selfRegistered' && u.origin !== 'SELF_REGISTERED') return false
      if (
        originFilter === 'invited' &&
        u.origin !== 'INVITED_EMAIL' &&
        u.origin !== 'INVITED_PHONE'
      )
        return false

      if (contactFilter !== 'all') {
        const emailStr = u.email || ''
        const hasRealEmail = emailStr.length > 0 && !emailStr.endsWith('@upward.com')
        const hasPhone = !!u.phone

        if (contactFilter === 'emailOnly' && (!hasRealEmail || hasPhone)) return false
        if (contactFilter === 'phoneOnly' && (hasRealEmail || !hasPhone)) return false
        if (contactFilter === 'both' && (!hasRealEmail || !hasPhone)) return false
        if (contactFilter === 'neither' && (hasRealEmail || hasPhone)) return false
      }
      return true
    })

    baseFiltered.forEach((u) => {
      const hasProp = !!(u.hasUserProperty || (u.properties && u.properties.length > 0))
      if (hasProp) withProperty++
      else withoutProperty++
    })

    return {
      all: baseFiltered.length,
      withProperty,
      withoutProperty,
    }
  }, [usersFilteredByPm, originFilter, contactFilter])

  const availableExpiryYears = useMemo(() => {
    const set = new Set<number>()
    usersFilteredByPm.forEach((u) => {
      const d = getRentExpiryDate(u)
      if (d) set.add(d.getFullYear())
    })
    return Array.from(set).sort((a, b) => a - b)
  }, [usersFilteredByPm])

  const expiryFilterCounts = useMemo<ExpiryFilterCounts>(() => {
    let next30 = 0
    let next60 = 0
    let next90 = 0
    let thisYear = 0
    let nextYear = 0
    let custom = 0

    const baseFiltered = usersFilteredByPm.filter((u) => {
      if (originFilter === 'waitlist' && u.origin !== 'WAITLIST') return false
      if (originFilter === 'selfRegistered' && u.origin !== 'SELF_REGISTERED') return false
      if (
        originFilter === 'invited' &&
        u.origin !== 'INVITED_EMAIL' &&
        u.origin !== 'INVITED_PHONE'
      )
        return false

      if (contactFilter !== 'all') {
        const emailStr = u.email || ''
        const hasRealEmail = emailStr.length > 0 && !emailStr.endsWith('@upward.com')
        const hasPhone = !!u.phone

        if (contactFilter === 'emailOnly' && (!hasRealEmail || hasPhone)) return false
        if (contactFilter === 'phoneOnly' && (hasRealEmail || !hasPhone)) return false
        if (contactFilter === 'both' && (!hasRealEmail || !hasPhone)) return false
        if (contactFilter === 'neither' && (hasRealEmail || hasPhone)) return false
      }

      const hasProp = !!(u.hasUserProperty || (u.properties && u.properties.length > 0))
      if (propertyFilter === 'withProperty' && !hasProp) return false
      if (propertyFilter === 'withoutProperty' && hasProp) return false

      // Tenancy Date Hygiene
      const hasStart = !!(u.rentStartDate || u.properties?.[0]?.rentStartDate)
      const hasEnd = !!(u.rentExpiryDate || u.rentEndDate || u.properties?.[0]?.rentEndDate)

      if (tenancyDateFilter === 'withBothDates' && (!hasStart || !hasEnd)) return false
      if (tenancyDateFilter === 'withStartDate' && !hasStart) return false
      if (tenancyDateFilter === 'withoutStartDate' && hasStart) return false
      if (tenancyDateFilter === 'withExpiryDate' && !hasEnd) return false
      if (tenancyDateFilter === 'withoutExpiryDate' && hasEnd) return false
      if (tenancyDateFilter === 'noDates' && (hasStart || hasEnd)) return false

      return true
    })

    const now = new Date()
    const thisYearNum = now.getFullYear()
    const nextYearNum = thisYearNum + 1

    baseFiltered.forEach((u) => {
      const d = getRentExpiryDate(u)
      if (d) {
        if (d >= now && d <= new Date(now.getTime() + 30 * 86400000)) next30++
        if (d >= now && d <= new Date(now.getTime() + 60 * 86400000)) next60++
        if (d >= now && d <= new Date(now.getTime() + 90 * 86400000)) next90++
        if (d.getFullYear() === thisYearNum) thisYear++
        if (d.getFullYear() === nextYearNum) nextYear++
        if (expiryCustomRange) {
          const start = new Date(
            expiryCustomRange.fromYear,
            expiryCustomRange.fromMonth,
            1,
            0,
            0,
            0,
            0
          )
          const end = new Date(
            expiryCustomRange.toYear,
            expiryCustomRange.toMonth + 1,
            0,
            23,
            59,
            59,
            999
          )
          if (d >= start && d <= end) custom++
        }
      }
    })

    return {
      all: baseFiltered.length,
      next30,
      next60,
      next90,
      thisYear,
      nextYear,
      custom,
    }
  }, [
    usersFilteredByPm,
    originFilter,
    contactFilter,
    propertyFilter,
    tenancyDateFilter,
    expiryCustomRange,
  ])

  const previewExpiryRangeCount = (range: ExpiryMonthYearRange) => {
    const start = new Date(range.fromYear, range.fromMonth, 1, 0, 0, 0, 0)
    const end = new Date(range.toYear, range.toMonth + 1, 0, 23, 59, 59, 999)

    return usersFilteredByPm.filter((u) => {
      if (originFilter === 'waitlist' && u.origin !== 'WAITLIST') return false
      if (originFilter === 'selfRegistered' && u.origin !== 'SELF_REGISTERED') return false
      if (
        originFilter === 'invited' &&
        u.origin !== 'INVITED_EMAIL' &&
        u.origin !== 'INVITED_PHONE'
      )
        return false

      if (contactFilter !== 'all') {
        const emailStr = u.email || ''
        const hasRealEmail = emailStr.length > 0 && !emailStr.endsWith('@upward.com')
        const hasPhone = !!u.phone

        if (contactFilter === 'emailOnly' && (!hasRealEmail || hasPhone)) return false
        if (contactFilter === 'phoneOnly' && (hasRealEmail || !hasPhone)) return false
        if (contactFilter === 'both' && (!hasRealEmail || !hasPhone)) return false
        if (contactFilter === 'neither' && (hasRealEmail || hasPhone)) return false
      }

      const hasProp = !!(u.hasUserProperty || (u.properties && u.properties.length > 0))
      if (propertyFilter === 'withProperty' && !hasProp) return false
      if (propertyFilter === 'withoutProperty' && hasProp) return false

      const d = getRentExpiryDate(u)
      return d ? d >= start && d <= end : false
    }).length
  }

  const tenancyDateCounts = useMemo(() => {
    let withBothDates = 0
    let withStartDate = 0
    let withoutStartDate = 0
    let withExpiryDate = 0
    let withoutExpiryDate = 0
    let noDates = 0

    const baseFiltered = usersFilteredByPm.filter((u) => {
      if (originFilter === 'waitlist' && u.origin !== 'WAITLIST') return false
      if (originFilter === 'selfRegistered' && u.origin !== 'SELF_REGISTERED') return false
      if (
        originFilter === 'invited' &&
        u.origin !== 'INVITED_EMAIL' &&
        u.origin !== 'INVITED_PHONE'
      )
        return false

      if (contactFilter !== 'all') {
        const emailStr = u.email || ''
        const hasRealEmail = emailStr.length > 0 && !emailStr.endsWith('@upward.com')
        const hasPhone = !!u.phone

        if (contactFilter === 'emailOnly' && (!hasRealEmail || hasPhone)) return false
        if (contactFilter === 'phoneOnly' && (hasRealEmail || !hasPhone)) return false
        if (contactFilter === 'both' && (!hasRealEmail || !hasPhone)) return false
        if (contactFilter === 'neither' && (hasRealEmail || hasPhone)) return false
      }

      const hasProp = !!(u.hasUserProperty || (u.properties && u.properties.length > 0))
      if (propertyFilter === 'withProperty' && !hasProp) return false
      if (propertyFilter === 'withoutProperty' && hasProp) return false

      // Expiry Match
      const expiryDate = getRentExpiryDate(u)
      if (!checkExpiryMatch(expiryDate, expiryPreset, expiryCustomRange)) return false

      return true
    })

    baseFiltered.forEach((u) => {
      const hasStart = !!(u.rentStartDate || u.properties?.[0]?.rentStartDate)
      const hasEnd = !!(u.rentExpiryDate || u.rentEndDate || u.properties?.[0]?.rentEndDate)

      if (hasStart && hasEnd) withBothDates++
      if (hasStart) withStartDate++
      else withoutStartDate++
      if (hasEnd) withExpiryDate++
      else withoutExpiryDate++
      if (!hasStart && !hasEnd) noDates++
    })

    return {
      all: baseFiltered.length,
      withBothDates,
      withStartDate,
      withoutStartDate,
      withExpiryDate,
      withoutExpiryDate,
      noDates,
    }
  }, [
    usersFilteredByPm,
    originFilter,
    contactFilter,
    propertyFilter,
    expiryPreset,
    expiryCustomRange,
  ])

  const rentFilterCounts = useMemo<RentFilterCounts>(() => {
    let hasRent = 0
    let under1m = 0
    let m1To3m = 0
    let m3To5m = 0
    let above5m = 0
    let noRent = 0

    const baseFiltered = usersFilteredByPm.filter((u) => {
      if (originFilter === 'waitlist' && u.origin !== 'WAITLIST') return false
      if (originFilter === 'selfRegistered' && u.origin !== 'SELF_REGISTERED') return false
      if (
        originFilter === 'invited' &&
        u.origin !== 'INVITED_EMAIL' &&
        u.origin !== 'INVITED_PHONE'
      )
        return false

      if (contactFilter !== 'all') {
        const emailStr = u.email || ''
        const hasRealEmail = emailStr.length > 0 && !emailStr.endsWith('@upward.com')
        const hasPhone = !!u.phone

        if (contactFilter === 'emailOnly' && (!hasRealEmail || hasPhone)) return false
        if (contactFilter === 'phoneOnly' && (hasRealEmail || !hasPhone)) return false
        if (contactFilter === 'both' && (!hasRealEmail || !hasPhone)) return false
        if (contactFilter === 'neither' && (hasRealEmail || hasPhone)) return false
      }

      const hasProp = !!(u.hasUserProperty || (u.properties && u.properties.length > 0))
      if (propertyFilter === 'withProperty' && !hasProp) return false
      if (propertyFilter === 'withoutProperty' && hasProp) return false

      // Tenancy Date Hygiene
      const hasStart = !!(u.rentStartDate || u.properties?.[0]?.rentStartDate)
      const hasEnd = !!(u.rentExpiryDate || u.rentEndDate || u.properties?.[0]?.rentEndDate)

      if (tenancyDateFilter === 'withBothDates' && (!hasStart || !hasEnd)) return false
      if (tenancyDateFilter === 'withStartDate' && !hasStart) return false
      if (tenancyDateFilter === 'withoutStartDate' && hasStart) return false
      if (tenancyDateFilter === 'withExpiryDate' && !hasEnd) return false
      if (tenancyDateFilter === 'withoutExpiryDate' && hasEnd) return false
      if (tenancyDateFilter === 'noDates' && (hasStart || hasEnd)) return false

      // Expiry Match
      const expiryDate = getRentExpiryDate(u)
      if (!checkExpiryMatch(expiryDate, expiryPreset, expiryCustomRange)) return false

      return true
    })

    baseFiltered.forEach((u) => {
      const rent = getUserRentAmount(u)
      if (rent > 0) {
        hasRent++
        if (rent < 1_000_000) under1m++
        else if (rent < 3_000_000) m1To3m++
        else if (rent < 5_000_000) m3To5m++
        else above5m++
      } else {
        noRent++
      }
    })

    return {
      all: baseFiltered.length,
      hasRent,
      under1m,
      '1mTo3m': m1To3m,
      '3mTo5m': m3To5m,
      above5m,
      noRent,
    }
  }, [
    usersFilteredByPm,
    originFilter,
    contactFilter,
    propertyFilter,
    tenancyDateFilter,
    expiryPreset,
    expiryCustomRange,
  ])

  const filteredUsers = useMemo(() => {
    return usersFilteredByPm.filter((u) => {
      // 1. Origin Filter
      if (originFilter === 'waitlist' && u.origin !== 'WAITLIST') return false
      if (originFilter === 'selfRegistered' && u.origin !== 'SELF_REGISTERED') return false
      if (
        originFilter === 'invited' &&
        u.origin !== 'INVITED_EMAIL' &&
        u.origin !== 'INVITED_PHONE'
      )
        return false

      // 2. Contact Filter
      if (contactFilter !== 'all') {
        const emailStr = u.email || ''
        const hasRealEmail = emailStr.length > 0 && !emailStr.endsWith('@upward.com')
        const hasPhone = !!u.phone

        if (contactFilter === 'emailOnly' && (!hasRealEmail || hasPhone)) return false
        if (contactFilter === 'phoneOnly' && (hasRealEmail || !hasPhone)) return false
        if (contactFilter === 'both' && (!hasRealEmail || !hasPhone)) return false
        if (contactFilter === 'neither' && (hasRealEmail || hasPhone)) return false
      }

      // 3. Property Filter
      const hasProp = !!(u.hasUserProperty || (u.properties && u.properties.length > 0))
      if (propertyFilter === 'withProperty' && !hasProp) return false
      if (propertyFilter === 'withoutProperty' && hasProp) return false

      // 4. Tenancy Date Hygiene Filter
      const hasStart = !!(u.rentStartDate || u.properties?.[0]?.rentStartDate)
      const hasEnd = !!(u.rentExpiryDate || u.rentEndDate || u.properties?.[0]?.rentEndDate)

      if (tenancyDateFilter === 'withBothDates' && (!hasStart || !hasEnd)) return false
      if (tenancyDateFilter === 'withStartDate' && !hasStart) return false
      if (tenancyDateFilter === 'withoutStartDate' && hasStart) return false
      if (tenancyDateFilter === 'withExpiryDate' && !hasEnd) return false
      if (tenancyDateFilter === 'withoutExpiryDate' && hasEnd) return false
      if (tenancyDateFilter === 'noDates' && (hasStart || hasEnd)) return false

      // 5. Tenancy Expiry Window Filter
      const expiryDate = getRentExpiryDate(u)
      if (!checkExpiryMatch(expiryDate, expiryPreset, expiryCustomRange)) return false

      // 6. Rent Value Tier Filter
      if (rentValueFilter !== 'all') {
        const rent = getUserRentAmount(u)
        if (rentValueFilter === 'hasRent' && rent <= 0) return false
        if (rentValueFilter === 'noRent' && rent > 0) return false
        if (rentValueFilter === 'under1m' && (rent <= 0 || rent >= 1_000_000)) return false
        if (rentValueFilter === '1mTo3m' && (rent < 1_000_000 || rent >= 3_000_000)) return false
        if (rentValueFilter === '3mTo5m' && (rent < 3_000_000 || rent >= 5_000_000)) return false
        if (rentValueFilter === 'above5m' && rent < 5_000_000) return false
      }

      return true
    })
  }, [
    usersFilteredByPm,
    originFilter,
    contactFilter,
    propertyFilter,
    tenancyDateFilter,
    expiryPreset,
    expiryCustomRange,
    rentValueFilter,
  ])

  const filteredRentSummary = useMemo(() => {
    let totalRent = 0
    let propsWithRentCount = 0
    let usersWithRentCount = 0

    filteredUsers.forEach((u) => {
      let userRentSum = 0
      const props = u.properties || []
      props.forEach((p) => {
        const amt = Number(p.rentAmount) || 0
        if (amt > 0) {
          totalRent += amt
          userRentSum += amt
          propsWithRentCount++
        }
      })
      if (props.length === 0 && u.rentAmount && u.rentAmount > 0) {
        totalRent += u.rentAmount
        userRentSum += u.rentAmount
        propsWithRentCount++
      }
      if (userRentSum > 0) {
        usersWithRentCount++
      }
    })

    const avgRent = propsWithRentCount > 0 ? Math.round(totalRent / propsWithRentCount) : 0

    return {
      totalRent,
      propsWithRentCount,
      usersWithRentCount,
      avgRent,
    }
  }, [filteredUsers])

  // ── Directory list (active tab) ────────────────────────────────
  const currentDirectoryList = useMemo(() => {
    switch (activeTab) {
      case 'users':
        return filteredUsers
      case 'pms':
        return pmList
      default:
        return []
    }
  }, [activeTab, filteredUsers, pmList])

  // ── Client-side pagination ─────────────────────────────────────
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return currentDirectoryList.slice(start, start + itemsPerPage)
  }, [currentDirectoryList, currentPage, itemsPerPage])

  const totalPages = Math.ceil(currentDirectoryList.length / itemsPerPage)

  // ── Excel export ───────────────────────────────────────────────
  const handleExportExcel = () => {
    if (currentDirectoryList.length === 0) {
      showToast('No directory records to export', true)
      return
    }

    let worksheetData: any[] = []
    if (activeTab === 'users') {
      worksheetData = filteredUsers.map((u) => {
        const source = u.pms?.length ? 'PM' : 'Organic'
        const activity = u.totalPaid > 0 ? 'Payed' : 'None'
        const rentValue =
          u.rentAmount ||
          u.properties?.reduce((sum, p) => sum + (Number(p.rentAmount) || 0), 0) ||
          0

        return {
          Name: `${u.firstName} ${u.lastName}`.trim(),
          'Sign up date': new Date(u.createdAt).toLocaleDateString(),
          'Phone number': u.phone || 'N/A',
          Email: u.email,
          Source: source,
          Activity: activity,
          'Rent Amount (₦)': rentValue,
          'Properties Count': u.propertiesCount || u.properties?.length || 0,
        }
      })
    } else if (activeTab === 'pms') {
      worksheetData = pmList.map((p) => ({
        'Business Name': p.businessName,
        'Manager Name': `${p.firstName} ${p.lastName}`,
        'Email Address': p.email,
        'Phone Number': p.phone,
        Status: p.isVerified ? 'Verified' : 'Unverified',
        'Properties Count': p.propertiesCount,
        'Units Count': p.unitsCount,
        'Revenue Generated (₦)': p.totalGenerated,
        'Join Date': new Date(p.createdAt).toLocaleDateString(),
      }))
    }

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, `${activeTab.toUpperCase()}_Directory`)

    const maxProps = Object.keys(worksheetData[0] || {})
    worksheet['!cols'] = maxProps.map((key) => ({
      wch: Math.max(
        15,
        key.length,
        ...worksheetData.map((row) => String(row[key as keyof typeof row] || '').length),
      ),
    }))

    XLSX.writeFile(
      workbook,
      `Upward_Ecosystem_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`,
    )
    showToast(`Spreadsheet exported with ${worksheetData.length} records!`)
  }

  // ── Tab definitions ─────────────────────────────────────────────
  const TABS: { key: ActiveTab; label: (counts: Record<string, number>) => string }[] = [
    { key: 'overview', label: () => 'Overview' },
    { key: 'users', label: (c) => `Users (${c.users})` },
    { key: 'pms', label: (c) => `PMs & Platforms (${c.pms})` },
    { key: 'sessions', label: () => 'Login Sessions' },
    { key: 'data-deletion', label: (c) => `Data Deletion (${c.deletion})` },
  ]

  const tabCounts = {
    users: unifiedUsers.length,
    pms: pmList.length,
    deletion: eligibleAccounts.length,
  }

  const showDirectoryControls =
    activeTab !== 'overview' && activeTab !== 'sessions' && activeTab !== 'data-deletion'

  return (
    <div className="page-container fade-in" style={{ paddingTop: '16px' }}>
      <SkeletonStyles />

      {/* ── Top Header & Actions ── */}
      <div
        className="page-header flex-mobile-column"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="icon-container"
            style={{
              background: 'var(--accent-faint)',
              color: 'var(--accent)',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <LayoutDashboard size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 className="section-title" style={{ margin: 0 }}>
                Ecosystem Dashboard
              </h1>
              <Link
                to="/university-early-access"
                style={{
                  padding: '5px 14px',
                  borderRadius: '20px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#fbf1ed',
                  color: '#d97757',
                  border: '1px solid rgba(217, 119, 87, 0.3)',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <GraduationCap size={15} />
                Upward University
              </Link>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Multi-team performance metrics, tenant directories, and platform health insights.
            </p>
          </div>
        </div>
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div
              className="date-chips"
              style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
            >
              {[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: '7 Days' },
                { value: 'month', label: '30 Days' },
                { value: 'custom', label: 'Custom Range' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDateRange(opt.value as DateFilter)}
                  className={`date-chip ${dateRange === opt.value ? 'active' : ''}`}
                  style={{
                    height: '40px',
                    padding: '0 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: dateRange === opt.value ? 'var(--accent)' : 'var(--border)',
                    background: dateRange === opt.value ? 'var(--accent)' : 'var(--white)',
                    color: dateRange === opt.value ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '2px',
              }}
            >
              <button
                onClick={fetchDashboardData}
                className="btn btn-secondary"
                style={{
                  height: '40px',
                  width: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <RefreshCcw size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
              {elapsed && (
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Clock size={9} /> Updated {elapsed}
                </span>
              )}
            </div>
          </div>
          {dateRange === 'custom' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--white)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  height: '40px',
                }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--white)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  height: '40px',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Filter Toolbar (only for directory tabs) ── */}
      {showDirectoryControls && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}
        >
          <FilterToolbar
            search={search}
            onSearchChange={setSearch}
            onExport={handleExportExcel}
            onRefresh={fetchDashboardData}
            resultCount={currentDirectoryList.length}
            tabLabel={activeTab}
          />
          {activeTab === 'users' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '16px',
                background: 'var(--surface-hover)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
              }}
            >
              {/* Users Subtab Switcher */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderRadius: '10px',
                    background: 'var(--white)',
                    padding: '3px',
                    border: '1px solid var(--border)',
                    width: 'fit-content',
                  }}
                >
                  {(['signedUp', 'guest', 'unsynced'] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => {
                        setUsersSubtab(view)
                        setOriginFilter('all')
                        setContactFilter('all')
                        setRentValueFilter('all')
                      }}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: 'none',
                        transition: 'all 0.15s ease',
                        background: usersSubtab === view ? 'var(--white)' : 'transparent',
                        color: usersSubtab === view ? 'var(--text)' : 'var(--text-muted)',
                        boxShadow: usersSubtab === view ? 'var(--shadow-sm)' : 'none',
                      }}
                    >
                      {view === 'signedUp' ? 'Signed Up' : view === 'guest' ? 'Guest' : 'Unsynced'}
                    </button>
                  ))}
                </div>

                {/* PM Filter Dropdown */}
                <select
                  value={pmFilter}
                  onChange={(e) => setPmFilter(e.target.value)}
                  className="input"
                  style={{
                    height: '34px',
                    width: '220px',
                    fontSize: '12px',
                    padding: '0 8px',
                    fontWeight: 600,
                  }}
                >
                  <option value="all">All Managers & Platforms</option>
                  {pmList.map((pm) => (
                    <option key={pm.uuid} value={pm.uuid}>
                      {pm.businessName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Origin Filters with Counts */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '12px',
                }}
              >
                <button
                  onClick={() => setOriginFilter('all')}
                  className={`date-chip ${originFilter === 'all' ? 'active' : ''}`}
                >
                  All ({originCounts.all})
                </button>
                <button
                  onClick={() => setOriginFilter('waitlist')}
                  className={`date-chip ${originFilter === 'waitlist' ? 'active' : ''}`}
                >
                  Waitlist ({originCounts.waitlist})
                </button>
                {usersSubtab === 'signedUp' && (
                  <button
                    onClick={() => setOriginFilter('selfRegistered')}
                    className={`date-chip ${originFilter === 'selfRegistered' ? 'active' : ''}`}
                  >
                    Self Registered ({originCounts.selfRegistered})
                  </button>
                )}
                <button
                  onClick={() => setOriginFilter('invited')}
                  className={`date-chip ${originFilter === 'invited' ? 'active' : ''}`}
                >
                  Invited ({originCounts.invited})
                </button>
              </div>

              {/* Contact Filters with Counts */}
              {(usersSubtab === 'guest' || usersSubtab === 'signedUp') && (
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '12px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      paddingRight: '8px',
                      fontWeight: 600,
                    }}
                  >
                    Contact Info:
                  </span>
                  <button
                    onClick={() => setContactFilter('all')}
                    className={`date-chip ${contactFilter === 'all' ? 'active' : ''}`}
                  >
                    All (
                    {originCounts.waitlist + originCounts.invited + originCounts.selfRegistered})
                  </button>
                  <button
                    onClick={() => setContactFilter('emailOnly')}
                    className={`date-chip ${contactFilter === 'emailOnly' ? 'active' : ''}`}
                  >
                    Email Only ({contactCounts.emailOnly})
                  </button>
                  <button
                    onClick={() => setContactFilter('phoneOnly')}
                    className={`date-chip ${contactFilter === 'phoneOnly' ? 'active' : ''}`}
                  >
                    Phone Only ({contactCounts.phoneOnly})
                  </button>
                  <button
                    onClick={() => setContactFilter('both')}
                    className={`date-chip ${contactFilter === 'both' ? 'active' : ''}`}
                  >
                    Both ({contactCounts.both})
                  </button>
                  <button
                    onClick={() => setContactFilter('neither')}
                    className={`date-chip ${contactFilter === 'neither' ? 'active' : ''}`}
                  >
                    No Contact ({contactCounts.neither})
                  </button>
                </div>
              )}

              {/* Property Status Filter */}
              {(usersSubtab === 'guest' || usersSubtab === 'signedUp') && (
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '12px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      paddingRight: '8px',
                      fontWeight: 600,
                    }}
                  >
                    User Property:
                  </span>
                  <button
                    onClick={() => setPropertyFilter('all')}
                    className={`date-chip ${propertyFilter === 'all' ? 'active' : ''}`}
                  >
                    All ({propertyCounts.all})
                  </button>
                  <button
                    onClick={() => setPropertyFilter('withProperty')}
                    className={`date-chip ${propertyFilter === 'withProperty' ? 'active' : ''}`}
                  >
                    With Property ({propertyCounts.withProperty})
                  </button>
                  <button
                    onClick={() => setPropertyFilter('withoutProperty')}
                    className={`date-chip ${propertyFilter === 'withoutProperty' ? 'active' : ''}`}
                  >
                    Without Property ({propertyCounts.withoutProperty})
                  </button>
                </div>
              )}

              {/* Tenancy Rent Expiry Window Filter */}
              {(usersSubtab === 'guest' || usersSubtab === 'signedUp') && (
                <div
                  style={{
                    borderTop: '1px solid var(--border)',
                    paddingTop: '12px',
                  }}
                >
                  <TenancyExpiryFilter
                    preset={expiryPreset}
                    onPresetChange={setExpiryPreset}
                    customRange={expiryCustomRange}
                    onCustomRangeChange={setExpiryCustomRange}
                    counts={expiryFilterCounts}
                    availableYears={availableExpiryYears}
                    previewCount={previewExpiryRangeCount}
                  />
                </div>
              )}

              {/* Tenancy Dates Hygiene Status Filter */}
              {(usersSubtab === 'guest' || usersSubtab === 'signedUp') && (
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '12px',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      paddingRight: '8px',
                      fontWeight: 600,
                    }}
                  >
                    Data Status:
                  </span>
                  <button
                    onClick={() => setTenancyDateFilter('all')}
                    className={`date-chip ${tenancyDateFilter === 'all' ? 'active' : ''}`}
                  >
                    All Status ({tenancyDateCounts.all})
                  </button>
                  <button
                    onClick={() => setTenancyDateFilter('withBothDates')}
                    className={`date-chip ${tenancyDateFilter === 'withBothDates' ? 'active' : ''}`}
                  >
                    Both Start & Expiry ({tenancyDateCounts.withBothDates})
                  </button>
                  <button
                    onClick={() => setTenancyDateFilter('withExpiryDate')}
                    className={`date-chip ${tenancyDateFilter === 'withExpiryDate' ? 'active' : ''}`}
                  >
                    Has Expiry Date ({tenancyDateCounts.withExpiryDate})
                  </button>
                  <button
                    onClick={() => setTenancyDateFilter('withoutExpiryDate')}
                    className={`date-chip ${tenancyDateFilter === 'withoutExpiryDate' ? 'active' : ''}`}
                  >
                    Missing Expiry Date ({tenancyDateCounts.withoutExpiryDate})
                  </button>
                  <button
                    onClick={() => setTenancyDateFilter('withStartDate')}
                    className={`date-chip ${tenancyDateFilter === 'withStartDate' ? 'active' : ''}`}
                  >
                    Has Start Date ({tenancyDateCounts.withStartDate})
                  </button>
                  <button
                    onClick={() => setTenancyDateFilter('withoutStartDate')}
                    className={`date-chip ${tenancyDateFilter === 'withoutStartDate' ? 'active' : ''}`}
                  >
                    Missing Start Date ({tenancyDateCounts.withoutStartDate})
                  </button>
                  <button
                    onClick={() => setTenancyDateFilter('noDates')}
                    className={`date-chip ${tenancyDateFilter === 'noDates' ? 'active' : ''}`}
                  >
                    No Dates ({tenancyDateCounts.noDates})
                  </button>
                </div>
              )}

              {/* Tenancy Rent Value Tier Filter */}
              {(usersSubtab === 'guest' || usersSubtab === 'signedUp') && (
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '12px',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      paddingRight: '8px',
                      fontWeight: 600,
                    }}
                  >
                    Rent Value:
                  </span>
                  <button
                    onClick={() => setRentValueFilter('all')}
                    className={`date-chip ${rentValueFilter === 'all' ? 'active' : ''}`}
                  >
                    All Rent ({rentFilterCounts.all})
                  </button>
                  <button
                    onClick={() => setRentValueFilter('hasRent')}
                    className={`date-chip ${rentValueFilter === 'hasRent' ? 'active' : ''}`}
                  >
                    Has Rent ({rentFilterCounts.hasRent})
                  </button>
                  <button
                    onClick={() => setRentValueFilter('under1m')}
                    className={`date-chip ${rentValueFilter === 'under1m' ? 'active' : ''}`}
                  >
                    &lt; ₦1M ({rentFilterCounts.under1m})
                  </button>
                  <button
                    onClick={() => setRentValueFilter('1mTo3m')}
                    className={`date-chip ${rentValueFilter === '1mTo3m' ? 'active' : ''}`}
                  >
                    ₦1M – ₦3M ({rentFilterCounts['1mTo3m']})
                  </button>
                  <button
                    onClick={() => setRentValueFilter('3mTo5m')}
                    className={`date-chip ${rentValueFilter === '3mTo5m' ? 'active' : ''}`}
                  >
                    ₦3M – ₦5M ({rentFilterCounts['3mTo5m']})
                  </button>
                  <button
                    onClick={() => setRentValueFilter('above5m')}
                    className={`date-chip ${rentValueFilter === 'above5m' ? 'active' : ''}`}
                  >
                    &gt; ₦5M ({rentFilterCounts.above5m})
                  </button>
                  <button
                    onClick={() => setRentValueFilter('noRent')}
                    className={`date-chip ${rentValueFilter === 'noRent' ? 'active' : ''}`}
                  >
                    No Rent ({rentFilterCounts.noRent})
                  </button>
                </div>
              )}

              {/* Total Filtered Rent Value Aggregate Banner */}
              {(usersSubtab === 'guest' || usersSubtab === 'signedUp') && (
                <div
                  style={{
                    borderTop: '1px solid var(--border)',
                    paddingTop: '14px',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'rgba(217, 119, 87, 0.12)',
                        color: 'var(--clay)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Wallet size={20} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Total Rent in View
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>
                          ₦{filteredRentSummary.totalRent.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          across <strong>{filteredRentSummary.propsWithRentCount}</strong>{' '}
                          {filteredRentSummary.propsWithRentCount === 1 ? 'property' : 'properties'}
                          {filteredRentSummary.usersWithRentCount > 0 &&
                            ` (${filteredRentSummary.usersWithRentCount} tenants)`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {filteredRentSummary.propsWithRentCount > 0 && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>Average Rent:</span>
                      <strong style={{ color: 'var(--text)', fontWeight: 700 }}>
                        ₦{filteredRentSummary.avgRent.toLocaleString()}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Segmented Display Tabs ── */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '20px',
          marginTop: '8px',
          overflowX: 'auto',
        }}
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '13px',
              color: activeTab === key ? 'var(--text)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'var(--transition)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {label(tabCounts)}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' &&
        (loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '16px',
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <MetricCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : (
          <OverviewTab
            metrics={flatMetrics}
            signedUpList={signedUpList}
            invitedList={invitedList}
            onPreview={openDrawerForUser}
            token={token}
          />
        ))}

      {/* ── Sessions Tab ── */}
      {activeTab === 'sessions' && <LoginSessionsTab token={token} />}

      {/* ── Directory Table Views ── */}
      {showDirectoryControls && (
        <>
          {loading ? (
            <div className="table-wrapper">
              <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <TableSkeleton rows={itemsPerPage} cols={5} />
                </table>
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <div className="table-container">
                {activeTab === 'users' && (
                  <UsersTable
                    isSuperadmin={isSuperadmin}
                    paginatedItems={paginatedItems as UnifiedUserRecord[]}
                    fullListItems={currentDirectoryList as UnifiedUserRecord[]}
                    selectedUserIds={selectedUserIds}
                    toggleSelectAllUsers={toggleSelectAllUsers}
                    toggleSelectUser={toggleSelectUser}
                    showFailureReason={usersSubtab === 'unsynced'}
                    isGuestOrUnsynced={usersSubtab === 'guest' || usersSubtab === 'unsynced'}
                    onPreview={openDrawerForUser}
                    onDeleteSelected={triggerBulkDelete}
                    token={token}
                  />
                )}

                {activeTab === 'pms' && (
                  <PmsTable
                    paginatedItems={paginatedItems as PmRecord[]}
                    onPreview={(pm) => openDrawerForPm(pm)}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Pagination Controls ── */}
          {!loading && totalPages >= 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '20px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {currentDirectoryList.length > 0
                    ? `Showing ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, currentDirectoryList.length)} of ${currentDirectoryList.length}`
                    : 'No entries'}
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="input"
                  style={{
                    height: '34px',
                    width: 'auto',
                    padding: '0 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </select>
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="btn btn-secondary"
                    style={{ height: '36px', padding: '0 12px' }}
                  >
                    Previous
                  </button>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      padding: '0 8px',
                    }}
                  >
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="btn btn-secondary"
                    style={{ height: '36px', padding: '0 12px' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'data-deletion' && (
        <DataDeletionSection
          eligibleAccounts={eligibleAccounts}
          loading={eligibleLoading}
          token={token}
          onRefresh={fetchEligibleAccounts}
        />
      )}

      {/* ── Preview Drawer ── */}
      <PreviewDrawer entity={drawerEntity} onClose={() => setDrawerEntity(null)} />

      {/* ── Delete Confirmation Modal ── */}
      <DeleteConfirmationModal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false, ids: [] })}
        ids={deleteModal.ids}
        onConfirm={handleBatchDelete}
        deleting={deleting}
      />

      {/* ── Shared Styles ── */}
      <style>{`
        .table-row-hover:hover {
          background-color: var(--surface-hover) !important;
        }
        .date-chips {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .date-chip {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid var(--border);
          background: var(--white);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .date-chip:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-faint);
        }
        .date-chip.active {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }
        .modal-content {
          background: var(--white);
          border-radius: 16px;
          width: 100%;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default Dashboard
