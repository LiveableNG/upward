'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building,
  ChevronRight,
  FileText,
  MessageSquareWarning,
  Receipt,
  UserRound,
} from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { useSelectedProperty } from '../context/MyHomePropertyContext'
import {
  useActiveVisitors,
  useComplaints,
  useDocuments,
  usePendingBills,
} from '../hooks/useMyHome'
import { TenancyCard } from './TenancyCard'

function SummaryRow({
  icon,
  title,
  preview,
  href,
}: {
  icon: React.ReactNode
  title: string
  preview?: string
  href?: string
}) {
  const content = (
    <>
      <span className="my-home__summary-icon">{icon}</span>
      <span className="my-home__summary-body">
        <span className="my-home__summary-title-row">
          <span className="my-home__summary-title">{title}</span>
        </span>
        {preview ? <span className="my-home__summary-preview">{preview}</span> : null}
      </span>
      {href ? <ChevronRight size={18} className="my-home__summary-chevron" /> : null}
    </>
  )

  if (href) {
    return (
      <Link href={href} className="my-home__summary">
        {content}
      </Link>
    )
  }

  return <div className="my-home__summary my-home__summary--static">{content}</div>
}

export function MyHomeScreen() {
  const router = useRouter()
  const { properties, selected, selectedUuid, setSelectedUuid } = useSelectedProperty()

  const complaints = useComplaints(selectedUuid)
  const visitors = useActiveVisitors(selectedUuid)
  const pendingBills = usePendingBills(selectedUuid)
  const documents = useDocuments(selectedUuid)

  const latestComplaint = complaints.data?.data[0]
  const latestVisitor = visitors.data?.data[0]
  const latestDocument = documents.data?.data[0]
  const billCount = pendingBills.data?.data?.length ?? 0
  const documentCount = documents.data?.meta?.total ?? documents.data?.data?.length ?? 0

  if (properties.length === 0) {
    return (
      <PayPageShell title="My Home" showBack onBack={() => router.push('/dashboard')}>
        <div className="my-home__empty-state">
          <div className="my-home__empty-icon">
            <Building size={24} />
          </div>
          <h3>No active tenancy</h3>
          <p>
            Add the property you currently rent to see your complaints, visitors and tenancy records
            here.
          </p>
          <button
            type="button"
            className="my-home__empty-btn"
            onClick={() => router.push('/dashboard/setup/rental')}
          >
            Add your home
          </button>
        </div>
      </PayPageShell>
    )
  }

  if (!selected || !selectedUuid) {
    return (
      <PayPageShell title="My Home" showBack onBack={() => router.push('/dashboard')}>
        <div className="my-home-list__loading">
          <span className="my-home-list__spinner" />
        </div>
      </PayPageShell>
    )
  }

  return (
    <PayPageShell title="My Home" showBack onBack={() => router.push('/dashboard')}>
      <TenancyCard
        property={selected}
        properties={properties}
        selectedUuid={selectedUuid}
        onSelectProperty={setSelectedUuid}
      />

      <div className="my-home__actions">
        <SummaryRow
          icon={<MessageSquareWarning size={18} />}
          title="Complaints"
          preview={
            latestComplaint ? `${latestComplaint.category} · ${latestComplaint.status}` : 'Tap to view all'
          }
          href="/dashboard/my-home/complaints"
        />

        <SummaryRow
          icon={<UserRound size={18} />}
          title="Visitors"
          preview={
            latestVisitor ? `${latestVisitor.visitor_name} · ${latestVisitor.status}` : 'Tap to view all'
          }
          href="/dashboard/my-home/visitors"
        />

        <SummaryRow
          icon={<Receipt size={18} />}
          title="Payments"
          preview={
            billCount > 0
              ? `${billCount} bill${billCount === 1 ? '' : 's'} due`
              : 'View history & pay bills'
          }
          href="/dashboard/my-home/payments"
        />

        <SummaryRow
          icon={<FileText size={18} />}
          title="Documents"
          preview={
            latestDocument
              ? latestDocument.is_custom
                ? latestDocument.document_subject || 'Tap to view all'
                : latestDocument.name
              : documentCount > 0
                ? `${documentCount} document${documentCount === 1 ? '' : 's'}`
                : 'Tap to view all'
          }
          href="/dashboard/my-home/documents"
        />
      </div>
    </PayPageShell>
  )
}
