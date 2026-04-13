'use client'

import { use } from 'react'
import { KYCReportContent } from '@/features/dashboard/components/kyc/KYCReportContent'

interface PublicProfilePageProps {
  params: Promise<{ slug: string }>
}

export default function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { slug } = use(params)

  return (
    <main className="public-profile-view">
      {/* 
        This is the public-facing view of a tenant's credibility portfolio.
        Anyone with the link can view this. No authentication required.
      */}
      <KYCReportContent isPublic={true} publicSlug={slug} />
      
      <style jsx global>{`
        /* Standardize some public view basics */
        body {
          background: var(--bg);
        }
      `}</style>
    </main>
  )
}
