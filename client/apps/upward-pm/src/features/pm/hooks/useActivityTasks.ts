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
  },
  {
    id: 'add-property',
    title: 'Add First Property',
    description: 'List your first property',
    descriptionExtended: ' and start managing your tenants.',
    icon: Building2,
    link: '/properties?action=add-property',
    color: 'warning',
    actionLabel: 'Add Property',
    priority: 'HIGH PRIORITY',
    secondaryActionLabel: 'Bulk Import',
    secondaryActionLink: '/settings?tab=import'
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
  
  const isLoading = loadingAuth || isLoadingProperties || isLoadingCred || isLoadingJoin
  
  let dynamicItems = [...defaultItems]
  
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
