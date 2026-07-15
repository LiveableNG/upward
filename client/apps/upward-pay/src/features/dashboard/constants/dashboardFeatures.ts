import {
  FileText,
  Gift,
  History,
  Home,
  PiggyBank,
  Receipt,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  UserCheck,
  Wand2,
  type LucideIcon,
} from 'lucide-react'

export type DashboardFeatureTone = 'primary' | 'violet' | 'blue' | 'green' | 'amber'

export type DashboardFeatureItem = {
  id: string
  title: string
  description: string
  href?: string
  icon: LucideIcon
  tone: DashboardFeatureTone
  comingSoon?: boolean
}

export type DashboardFeatureSection = {
  id: string
  label: string
  items: DashboardFeatureItem[]
}

export const DASHBOARD_FEATURE_SECTIONS: DashboardFeatureSection[] = [
  {
    id: 'tenancy',
    label: 'For your tenancy',
    items: [
      {
        id: 'rent-support-insurance',
        title: 'Rent Support Insurance',
        description: 'Enrol for life and income protection linked to your rental',
        href: '/dashboard/rent-support-insurance',
        icon: Shield,
        tone: 'blue',
      },
      {
        id: 'benefits',
        title: 'Upward Benefits',
        description: 'Annual protection for your Upward account',
        href: '/dashboard/benefits',
        icon: ShieldCheck,
        tone: 'green',
      },
      {
        id: 'documents',
        title: 'Documents',
        description: 'View and manage your tenancy documents',
        href: '/dashboard/documents',
        icon: FileText,
        tone: 'primary',
      },
      {
        id: 'receipts',
        title: 'Receipts',
        description: 'Browse your payment receipts',
        href: '/dashboard/receipts',
        icon: Receipt,
        tone: 'primary',
      },
    ],
  },
  {
    id: 'profile',
    label: 'Build your profile',
    items: [
      {
        id: 'score',
        title: 'Upward Score',
        description: 'See what drives your rent payment score',
        href: '/dashboard/score-breakdown',
        icon: TrendingUp,
        tone: 'violet',
      },
      {
        id: 'verify-identity',
        title: 'Verify Identity',
        description: 'Complete identity verification for secure payments',
        href: '/dashboard/verify-identity',
        icon: UserCheck,
        tone: 'amber',
      },
      {
        id: 'request-records',
        title: 'Request Rent Records',
        description: 'Request your verified rent payment history',
        href: '/dashboard/request-records',
        icon: History,
        tone: 'primary',
      },
    ],
  },
  {
    id: 'plan',
    label: 'Plan ahead',
    items: [
      {
        id: 'save-for-home',
        title: 'Save for Home',
        description: 'Set goals toward your next home',
        href: '/dashboard/save-for-home',
        icon: Home,
        tone: 'green',
      },
      {
        id: 'save-for-rent',
        title: 'Save for Rent',
        description: 'Automated rent savings — coming soon',
        icon: PiggyBank,
        tone: 'violet',
        comingSoon: true,
      },
    ],
  },
  {
    id: 'coming-soon',
    label: 'Coming soon',
    items: [
      {
        id: 'ai-planner',
        title: 'AI Housing Planner',
        description: 'Smart financial planning for your next rent and housing goals',
        href: '/dashboard/coming-soon',
        icon: Wand2,
        tone: 'primary',
        comingSoon: true,
      },
      {
        id: 'property-search',
        title: 'Advanced Property Search',
        description: 'Browse verified listings and manage lease details',
        href: '/dashboard/coming-soon',
        icon: Smartphone,
        tone: 'blue',
        comingSoon: true,
      },
      {
        id: 'tenant-rewards',
        title: 'Tenant Rewards',
        description: 'Earn points and unlock discounts for being a great tenant',
        href: '/dashboard/coming-soon',
        icon: Gift,
        tone: 'green',
        comingSoon: true,
      },
      {
        id: 'roadmap',
        title: 'See full roadmap',
        description: 'View everything we are building next',
        href: '/dashboard/coming-soon',
        icon: Sparkles,
        tone: 'violet',
        comingSoon: true,
      },
    ],
  },
]
