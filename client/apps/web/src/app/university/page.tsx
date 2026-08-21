import type { Metadata } from 'next'
import '@/styles/university.css'
import { UniversityClient } from './UniversityClient'

export const metadata: Metadata = {
  title: 'Upward University — Build Your Future in Real Estate',
  description:
    'Become a Real Estate Business Executive. Build towards ₦10m+ a year in income with Property Management + Brokerage training built for the Nigerian market.',
  alternates: {
    canonical: '/university',
  },
  icons: {
    icon: '/university-logos/upward_university_logo.jpeg',
    shortcut: '/university-logos/upward_university_logo.jpeg',
    apple: '/university-logos/upward_university_logo.jpeg',
  },
  openGraph: {
    title: 'Upward University — Build Your Future in Real Estate',
    description:
      'Become a Real Estate Business Executive. Build towards ₦10m+ a year in income with Property Management + Brokerage training.',
    url: '/university',
  },
}

export default function UniversityPage() {
  return <UniversityClient />
}
