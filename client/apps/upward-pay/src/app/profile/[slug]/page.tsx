import { KYCReportContent } from '@/features/dashboard/components/kyc/KYCReportContent'

interface PublicProfilePageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return [{ slug: 'placeholder' }]
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { slug } = await params

  return (
    <main className="public-profile-view">
      {/* 
        This is the public-facing view of a tenant's credibility portfolio.
        Anyone with the link can view this. No authentication required.
      */}
      <KYCReportContent isPublic={true} publicSlug={slug} />
    </main>
  )
}
