'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { getRsiEnrolments } from '../storage'
import type { EmploymentType, RsiEnrolmentRecord } from '../types'

interface ApiInsuranceEnrolment {
  uuid: string
  userPropertyUuid?: string | null
  fullName: string
  dateOfBirth: string
  gender: string
  phone?: string | null
  address: string
  occupation: string
  employmentType: string
  rentStartDate: string
  annualRent: number
  sumAssured: number
  premiumRatePct: number
  premiumAmount: number
  landlordName: string
  propertyAddress?: string | null
  status: string
  paymentReference?: string | null
  termsVersion?: string | null
  purchasedAt?: string | null
  createdAt: string
}

function mapApiRecord(item: ApiInsuranceEnrolment): RsiEnrolmentRecord {
  return {
    uuid: item.uuid,
    submittedAt: item.purchasedAt || item.createdAt,
    termsVersion: item.termsVersion || '2026-07-15',
    status: item.status === 'ACTIVE' ? 'active' : 'pending_activation',
    premiumPaid: item.premiumAmount,
    premiumRatePct: item.premiumRatePct,
    paymentReference: item.paymentReference || undefined,
    form: {
      propertyUuid: item.userPropertyUuid || '',
      fullName: item.fullName,
      dateOfBirth: item.dateOfBirth,
      gender: item.gender,
      phone: item.phone || '',
      address: item.address,
      occupation: item.occupation,
      employmentType: (item.employmentType || '') as EmploymentType | '',
      rentStartDate: item.rentStartDate,
      annualRent: String(item.annualRent),
      landlordName: item.landlordName,
      propertyAddress: item.propertyAddress || '',
    },
  }
}

export function useRsiEnrolment() {
  const [enrolments, setEnrolments] = useState<RsiEnrolmentRecord[]>(() =>
    typeof window !== 'undefined' ? getRsiEnrolments() : [],
  )
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ data?: ApiInsuranceEnrolment[] }>('/payments/insurance/enrolments')
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      if (list.length > 0) {
        const mapped = list.map(mapApiRecord)
        setEnrolments(mapped)
      } else {
        setEnrolments(getRsiEnrolments())
      }
    } catch {
      setEnrolments(getRsiEnrolments())
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    let active = true
    api
      .get<{ data?: ApiInsuranceEnrolment[] }>('/payments/insurance/enrolments')
      .then((res) => {
        if (!active) return
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        if (list.length > 0) {
          setEnrolments(list.map(mapApiRecord))
        } else {
          setEnrolments(getRsiEnrolments())
        }
      })
      .catch(() => {
        if (!active) return
        setEnrolments(getRsiEnrolments())
      })
      .finally(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  return {
    enrolments,
    isEnrolled: enrolments.length > 0,
    loaded,
    refresh,
    setEnrolments,
  }
}
