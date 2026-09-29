import { useState, useCallback } from 'react'
import { apiService } from '../../../services/api.service'
import { showToast } from '@upward/client-core'
import type {
  UniversityReferralRecord,
  UniversityReferralStats,
  EditReferralFormData,
} from '../types'

export const useUniversityReferrals = (token: string) => {
  const [referrals, setReferrals] = useState<UniversityReferralRecord[]>([])
  const [referralStats, setReferralStats] = useState<UniversityReferralStats | null>(null)
  const [loadingReferrals, setLoadingReferrals] = useState(true)
  const [loadingReferralStats, setLoadingReferralStats] = useState(true)
  const [referralPage, setReferralPage] = useState(1)
  const [referralTotalPages, setReferralTotalPages] = useState(1)
  const [referralSearch, setReferralSearch] = useState('')
  const [referralStatusFilter, setReferralStatusFilter] = useState('ALL')
  const [referralRewardStatusFilter, setReferralRewardStatusFilter] = useState('ALL')
  const [selectedReferral, setSelectedReferral] = useState<UniversityReferralRecord | null>(null)
  const [editingReferral, setEditingReferral] = useState<UniversityReferralRecord | null>(null)
  const [updatingReferral, setUpdatingReferral] = useState(false)
  const [editReferralForm, setEditReferralForm] = useState<EditReferralFormData>({
    status: 'PENDING',
    rewardStatus: 'PENDING',
    programFeePaid: '',
    rewardAmount: '',
    rewardPercentage: 10,
    paymentRef: '',
    notes: '',
  })

  const fetchReferralStats = useCallback(async () => {
    setLoadingReferralStats(true)
    try {
      const response = await apiService.get('/admin/university/referrals/stats', token)
      if (response && response.data) {
        setReferralStats(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch referral stats:', error)
    } finally {
      setLoadingReferralStats(false)
    }
  }, [token])

  const fetchReferrals = useCallback(
    async (
      pageNum = referralPage,
      status = referralStatusFilter,
      rewardStatus = referralRewardStatusFilter,
      search = referralSearch
    ) => {
      setLoadingReferrals(true)
      try {
        let url = `/admin/university/referrals?page=${pageNum}&limit=50`
        if (status !== 'ALL') url += `&status=${status}`
        if (rewardStatus !== 'ALL') url += `&rewardStatus=${rewardStatus}`
        if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`

        const response = await apiService.get(url, token)
        if (response && response.data) {
          setReferrals(response.data)
          setReferralTotalPages(response.meta?.totalPages || 1)
        }
      } catch (error) {
        console.error('Failed to fetch university referrals:', error)
        showToast('Failed to load referral records', true)
      } finally {
        setLoadingReferrals(false)
      }
    },
    [token, referralPage, referralStatusFilter, referralRewardStatusFilter, referralSearch]
  )

  const openEditReferralModal = useCallback((record: UniversityReferralRecord) => {
    setEditingReferral(record)
    setEditReferralForm({
      status: record.status || 'PENDING',
      rewardStatus: record.rewardStatus || 'PENDING',
      programFeePaid: record.programFeePaid ?? '',
      rewardAmount: record.rewardAmount ?? '',
      rewardPercentage: record.rewardPercentage || 10,
      paymentRef: record.paymentRef || '',
      notes: record.notes || '',
    })
  }, [])

  const handleUpdateReferralSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!editingReferral) return
      setUpdatingReferral(true)
      try {
        const feeNum =
          editReferralForm.programFeePaid !== ''
            ? Number(editReferralForm.programFeePaid)
            : undefined
        const rewardNum =
          editReferralForm.rewardAmount !== ''
            ? Number(editReferralForm.rewardAmount)
            : undefined

        const response = await apiService.patch(
          `/admin/university/referrals/${editingReferral.id}`,
          {
            status: editReferralForm.status,
            rewardStatus: editReferralForm.rewardStatus,
            programFeePaid: feeNum,
            rewardAmount: rewardNum,
            rewardPercentage: editReferralForm.rewardPercentage,
            paymentRef: editReferralForm.paymentRef.trim() || undefined,
            notes: editReferralForm.notes.trim() || undefined,
          },
          token
        )

        if (response && response.success) {
          showToast('Referral record updated successfully!')
          setEditingReferral(null)
          if (selectedReferral && selectedReferral.id === editingReferral.id) {
            setSelectedReferral(response.data)
          }
          fetchReferrals(referralPage)
          fetchReferralStats()
        } else {
          showToast(response?.message || 'Failed to update referral', true)
        }
      } catch (err: any) {
        console.error('Failed to update referral:', err)
        showToast(err?.message || 'Failed to update referral', true)
      } finally {
        setUpdatingReferral(false)
      }
    },
    [
      token,
      editingReferral,
      selectedReferral,
      editReferralForm,
      referralPage,
      fetchReferrals,
      fetchReferralStats,
    ]
  )

  return {
    referrals,
    setReferrals,
    referralStats,
    loadingReferrals,
    loadingReferralStats,
    referralPage,
    setReferralPage,
    referralTotalPages,
    referralSearch,
    setReferralSearch,
    referralStatusFilter,
    setReferralStatusFilter,
    referralRewardStatusFilter,
    setReferralRewardStatusFilter,
    selectedReferral,
    setSelectedReferral,
    editingReferral,
    setEditingReferral,
    updatingReferral,
    editReferralForm,
    setEditReferralForm,
    fetchReferralStats,
    fetchReferrals,
    openEditReferralModal,
    handleUpdateReferralSubmit,
  }
}
