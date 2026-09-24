import type { Metadata } from 'next'
import '@/styles/university.css'
import { UniversityLandlordClient } from './UniversityLandlordClient'

export const metadata: Metadata = {
  title: 'Upward Landlord Programme — Protect Your Income & Property',
  description:
    'Assure your income. Protect your asset. Cement your legacy. A 2-week WhatsApp-first programme for current and aspiring Nigerian landlords.',
  alternates: {
    canonical: '/academy/landlord',
  },
  icons: {
    icon: '/university-logos/upward_university_logo.jpeg',
    shortcut: '/university-logos/upward_university_logo.jpeg',
    apple: '/university-logos/upward_university_logo.jpeg',
  },
  openGraph: {
    title: 'Upward Landlord Programme — Protect Your Income & Property',
    description:
      'Assure your income. Protect your asset. Cement your legacy. A 2-week WhatsApp-first programme for current and aspiring Nigerian landlords.',
    url: '/academy/landlord',
  },
}

export default function UniversityLandlordPage() {
  return <UniversityLandlordClient />
}
