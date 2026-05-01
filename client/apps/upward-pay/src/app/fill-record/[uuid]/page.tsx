import { Metadata } from 'next'
import { FillRecordClient } from '@/features/records/components/FillRecordClient'

export function generateStaticParams() {
  return [{ uuid: 'placeholder' }]
}

interface FillRecordPageProps {
  params: Promise<{ uuid: string }>
}

export async function generateMetadata({ params }: FillRecordPageProps): Promise<Metadata> {
  const { uuid } = await params
  return {
    title: `Fill Past Records | Upward`,
    description: 'Provide past tenancy records securely on Upward.',
  }
}

export default async function FillRecordPage({ params }: FillRecordPageProps) {
  const { uuid } = await params

  return (
    <div className="fill-record-view">
      <FillRecordClient uuid={uuid} />
    </div>
  )
}
