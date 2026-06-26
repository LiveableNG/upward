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
    <KYCReportContent isPublic publicSlug={slug} />
  )
}
