import type { Metadata } from 'next'
import '@/styles/university.css'
import { UniversityClient } from './UniversityClient'

export const metadata: Metadata = {
  title: 'Upward Academy — Build Your Future in Real Estate',
  description:
    'Become a Tech-driven Real Estate Business Executive. Build towards ₦10m+ a year in income with Property Management + Brokerage training built for the Nigerian market.',
  alternates: {
    canonical: '/academy',
  },
  icons: {
    icon: '/university-logos/upward_university_logo.png',
    shortcut: '/university-logos/upward_university_logo.png',
    apple: '/university-logos/upward_university_logo.png',
  },
  openGraph: {
    title: 'Upward Academy — Build Your Future in Real Estate',
    description:
      'Become a Tech-driven Real Estate Business Executive. Build towards ₦10m+ a year in income with Property Management + Brokerage training.',
    url: '/academy',
  },
}

export default function UniversityPage() {
  return <UniversityClient />
}
