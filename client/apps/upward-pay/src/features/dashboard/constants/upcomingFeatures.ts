import { Gift, Smartphone, Sparkles, TrendingUp, Wand2, type LucideIcon } from 'lucide-react'

export type UpcomingFeatureTone = 'primary' | 'violet' | 'blue' | 'green'

export type UpcomingFeature = {
  id: string
  title: string
  description: string
  preview: string
  icon: LucideIcon
  tone: UpcomingFeatureTone
}

export const UPCOMING_FEATURES: UpcomingFeature[] = [
  {
    id: 'ai-planner',
    title: 'AI Housing Planner',
    description: 'Smart financial planning for your next rent and housing goals.',
    preview: 'Smart financial planning',
    icon: Wand2,
    tone: 'primary',
  },
  {
    id: 'future-savings',
    title: 'Future Savings',
    description: 'Automated rent savings with credibility score boosts.',
    preview: 'Save for rent (+100 Score)',
    icon: TrendingUp,
    tone: 'violet',
  },
  {
    id: 'property-search',
    title: 'Advanced Property Search',
    description: 'Browse verified listings and manage your lease details seamlessly.',
    preview: 'Browse verified listings',
    icon: Smartphone,
    tone: 'blue',
  },
  {
    id: 'tenant-rewards',
    title: 'Tenant Rewards',
    description: 'Earn points and unlock discounts for being a great tenant.',
    preview: 'Earn points & discounts',
    icon: Gift,
    tone: 'green',
  },
]

export const UPCOMING_PAGE_INTRO = {
  title: 'Upcoming',
  subtitle: "New tools we're building to elevate your rental journey.",
  heroTitle: "What's coming next",
  heroText: "We're working on features to help you plan rent, build credibility, and find better homes.",
}
