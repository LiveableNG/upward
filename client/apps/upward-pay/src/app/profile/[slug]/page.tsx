import ProfileClient from './ProfileClient'

export async function generateStaticParams() {
  // For 'output: export', we must provide at least one valid slug path
  // to satisfy Next.js folder generation requirements.
  return [{ slug: 'tenant' }]
}

export default function PublicProfilePage() {
  return <ProfileClient />
}
