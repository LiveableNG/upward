import React from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useProperties } from '@/features/pm/hooks/useProperties'
import { useCredibilityRequests } from '@/features/pm/hooks/useCredibilityRequests'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { 
  CreditCard, 
  UserCircle, 
  Building2, 
  UserPlus
} from 'lucide-react'

export interface CarouselItem {
  id: string
  title: string
  description: string
  descriptionExtended?: string
  icon: React.ElementType
  link: string
  color: string
  actionLabel: string
  priority?: string
  secondaryActionLabel?: string
  secondaryActionLink?: string
}

const defaultItems: CarouselItem[] = [
  {
    id: 'add-property',
    title: 'Onboard Your Properties',
    description: 'Let\'s get your properties set up.',
    descriptionExtended: '',
    icon: Building2,
    link: '/import',
    color: 'warning',
    actionLabel: 'Add Property',
    priority: 'HIGH PRIORITY'
  },
  {
    id: 'payment-info',
    title: 'Add Payment Info',
    description: 'Connect your bank account',
    descriptionExtended: ' to start receiving rent payments.',
    icon: CreditCard,
    link: '/settings?tab=payment',
    color: 'warning',
    actionLabel: 'Setup Payouts',
    priority: 'HIGH PRIORITY'
  },
  {
    id: 'complete-profile',
    title: 'Complete Profile',
    description: 'Add your business details',
    descriptionExtended: ' including company address to build trust and professionalize your dashboard.',
    icon: UserCircle,
    link: '/settings?tab=profile',
    color: 'clay',
    actionLabel: 'Update Profile',
    priority: 'MEDIUM PRIORITY'
  }
]

export function useActivityTasks() {
  const { user, loading: loadingAuth } = useAuth()
  const { data: properties = [], isLoading: isLoadingProperties } = useProperties()
  const { data: credibilityRequests = [], isLoading: isLoadingCred } = useCredibilityRequests()
  
  const { data: joinRequests = [], isLoading: isLoadingJoin } = useQuery({
    queryKey: ['tenant-join-requests'],
    queryFn: async () => {
      const res = await api.get('/pm/tenants/join-requests')
      return res || []
    }
  })

  const { data: importJobs = [], isLoading: isLoadingJobs } = useQuery<any[]>({
    queryKey: ['pmImportJobs'],
    queryFn: () => api.get('/pm/bulk-imports'),
  })
  
  const isLoading = loadingAuth || isLoadingProperties || isLoadingCred || isLoadingJoin || isLoadingJobs
  
  let dynamicItems = [...defaultItems]
  
  const activeJob = importJobs.find(j => j.status !== 'COMPLETED' && j.status !== 'CANCELLED')
  if (activeJob) {
    const isSelfDraft = activeJob.fileUrl === 'self_import_draft' || activeJob.fileUrl === 'self_onboarding_draft'
    const isReady = activeJob.status === 'STAGED_FOR_REVIEW'
    
    const addPropertyIndex = dynamicItems.findIndex(item => item.id === 'add-property')
    if (addPropertyIndex !== -1) {
      if (isSelfDraft) {
        dynamicItems[addPropertyIndex] = {
          ...dynamicItems[addPropertyIndex],
          title: 'Resume Property Import',
          description: 'You have a saved draft waiting to be imported.',
          actionLabel: 'Resume Draft',
        }
      } else if (isReady) {
        dynamicItems[addPropertyIndex] = {
          ...dynamicItems[addPropertyIndex],
          title: 'Review Prepared Properties',
          description: 'Your prepared import is ready for review.',
          actionLabel: 'Review Data',
        }
      } else {
        dynamicItems[addPropertyIndex] = {
          ...dynamicItems[addPropertyIndex],
          title: 'Import Processing',
          description: 'Our team is preparing your properties file.',
          actionLabel: 'Check Status',
        }
      }
    }
  }

  if (joinRequests.length > 0) {
    dynamicItems.unshift({
      id: 'join-requests',
      title: 'New Tenant Requests',
      description: `You have ${joinRequests.length} pending tenant request${joinRequests.length > 1 ? 's' : ''}`,
      descriptionExtended: ' to join your properties.',
      icon: UserPlus,
      link: '/requests',
      color: 'warning',
      actionLabel: 'Handle Requests',
      priority: 'HIGH PRIORITY'
    })
  }

  if (credibilityRequests.length > 0) {
    dynamicItems.unshift({
      id: 'credibility-requests',
      title: 'Payment History Requests',
      description: `You have ${credibilityRequests.length} request${credibilityRequests.length > 1 ? 's' : ''}`,
      descriptionExtended: ' for past payment records from tenants.',
      icon: CreditCard,
      link: '/requests',
      color: 'warning',
      actionLabel: 'Review Records',
      priority: 'HIGH PRIORITY'
    })
  }

  const tasks = dynamicItems.filter(item => {
    if (item.id === 'payment-info') return !user?.bankCode
    if (item.id === 'complete-profile') return !user?.businessName || !user?.country || !user?.companyAddress
    if (item.id === 'add-property') return properties.length === 0
    return true
  })

  return { tasks, isLoading }
}
