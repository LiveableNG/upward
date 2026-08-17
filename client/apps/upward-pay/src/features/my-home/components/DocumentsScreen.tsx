'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  Clock,
  Download,
  FileText,
  Mail,
  MailOpen,
} from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { Modal } from '@/components/common/Modal'
import { useToast } from '@/components/common/Toast'
import * as myHomeService from '../services/myHomeService'
import { useDocumentsInfinite } from '../hooks/useMyHome'
import { useSelectedProperty } from '../context/MyHomePropertyContext'
import type { HomeDocument } from '../types'

function documentTitle(doc: HomeDocument) {
  return doc.is_custom ? doc.document_subject || 'Document' : doc.name || 'Document'
}

function statusLabel(status: string) {
  if (status === 'viewed') return 'Viewed'
  if (status === 'downloaded') return 'Downloaded'
  return 'Not viewed'
}

function badgeModifier(status: string) {
  if (status === 'viewed') return 'completed'
  if (status === 'downloaded') return 'ongoing'
  return 'pending'
}

function DocumentStatusBadge({ status }: { status: string }) {
  return (
    <span className={`my-home-list__badge my-home-list__badge--${badgeModifier(status)}`}>
      <span className="my-home-list__badge-dot" />
      {statusLabel(status)}
    </span>
  )
}

function DocumentDetailModal({
  propertyUuid,
  document,
  onClose,
  onStatusChange,
}: {
  propertyUuid: string | null
  document: HomeDocument | null
  onClose: () => void
  onStatusChange: () => void
}) {
  const toast = useToast()
  const [isDownloading, setIsDownloading] = useState(false)
  const pdfUrl = document?.file?.document_link
  const isEmail = document?.document_as === 'email'

  const handleDownload = async () => {
    if (!propertyUuid || !document || !pdfUrl) return

    try {
      setIsDownloading(true)
      await myHomeService.markDocumentDownloaded(propertyUuid, document.document_id)
      onStatusChange()

      const response = await fetch(pdfUrl)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = downloadUrl
      link.download = `${documentTitle(document)}.pdf`
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch {
      toast.error('Could not download this document', 'Download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Modal isOpen={!!document} onClose={onClose} size="lg">
      {document ? (
        <div className="my-home-detail">
          <h3 className="my-home-detail__title">{documentTitle(document)}</h3>

          <div className="my-home-doc__meta">
            <span className="my-home-list__date">
              <Clock size={13} />
              {document.sent_at}
            </span>
            <DocumentStatusBadge status={document.status} />
          </div>

          <div className="my-home-doc__viewer">
            {isEmail ? (
              <div className="my-home-doc__email">
                {document.document_sender ? (
                  <p className="my-home-doc__email-from">
                    <strong>From:</strong> {document.document_sender}
                  </p>
                ) : null}
                {document.html_payload ? (
                  <div
                    className="my-home-doc__email-body"
                    dangerouslySetInnerHTML={{ __html: document.html_payload }}
                  />
                ) : (
                  <p className="my-home-doc__empty-body">No content available for this message.</p>
                )}
              </div>
            ) : pdfUrl ? (
              <iframe
                className="my-home-doc__iframe"
                src={`${pdfUrl}#toolbar=0&navpanes=0`}
                title={documentTitle(document)}
              />
            ) : (
              <p className="my-home-doc__empty-body">This document is not available for viewing.</p>
            )}
          </div>

          <div className="my-home-doc__actions">
            {!isEmail && pdfUrl ? (
              <button
                type="button"
                className="my-home-detail__copy-btn"
                onClick={() => void handleDownload()}
                disabled={isDownloading}
              >
                <Download size={15} />
                <span>{isDownloading ? 'Downloading…' : 'Download'}</span>
              </button>
            ) : null}
            <button type="button" className="my-home-detail__secondary-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

export function DocumentsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { selected, selectedUuid } = useSelectedProperty()
  const query = useDocumentsInfinite(selectedUuid)
  const [openDocument, setOpenDocument] = useState<HomeDocument | null>(null)

  const documents = query.data?.pages.flatMap((page) => page.data) ?? []
  const isEmpty = !query.isPending && documents.length === 0

  const invalidateDocuments = () => {
    void queryClient.invalidateQueries({ queryKey: ['my-home', 'documents', selectedUuid] })
  }

  const handleOpenDocument = async (document: HomeDocument) => {
    setOpenDocument(document)

    if (
      selectedUuid &&
      document.status !== 'viewed' &&
      document.status !== 'downloaded'
    ) {
      try {
        await myHomeService.markDocumentViewed(selectedUuid, document.document_id)
        invalidateDocuments()
        setOpenDocument((prev) =>
          prev?.document_id === document.document_id ? { ...prev, status: 'viewed' } : prev,
        )
      } catch {
        // List item still opens; status may refresh on next load
      }
    }
  }

  return (
    <>
      <PayPageShell
        title="Documents"
        subtitle={selected?.unitName || undefined}
        showBack
        onBack={() => router.push('/dashboard/my-home')}
        pinFooter
      >
        {query.isPending ? (
          <div className="my-home-list__loading">
            <span className="my-home-list__spinner" />
          </div>
        ) : isEmpty ? (
          <div className="my-home-list__empty">
            <div className="my-home-list__empty-icon">
              <FileText size={24} />
            </div>
            <h4 className="my-home-list__empty-title">No documents yet</h4>
            <p className="my-home-list__empty-desc">
              Letters and files from your property manager will appear here.
            </p>
          </div>
        ) : (
          <>
            {documents.map((document) => (
              <div
                key={document.document_id}
                className="my-home-list__card my-home-list__card--clickable"
                onClick={() => void handleOpenDocument(document)}
              >
                <div className="my-home-list__card-body">
                  <div className="my-home-list__card-head">
                    <div className="my-home-list__card-head-left">
                      <span className="my-home-doc__icon">
                        {document.document_as === 'email' ? (
                          document.status === 'viewed' || document.status === 'downloaded' ? (
                            <MailOpen size={18} />
                          ) : (
                            <Mail size={18} />
                          )
                        ) : (
                          <FileText size={18} />
                        )}
                      </span>
                      <DocumentStatusBadge status={document.status} />
                    </div>
                    <span className="my-home-list__date">
                      <Clock size={13} />
                      {document.sent_at}
                    </span>
                  </div>

                  <p className="my-home-list__category">{documentTitle(document)}</p>
                  {!document.is_custom && document.document_subject ? (
                    <p className="my-home-list__desc">{document.document_subject}</p>
                  ) : null}
                  {document.template?.document_type ? (
                    <p className="my-home-doc__type">{document.template.document_type}</p>
                  ) : null}
                </div>
                <div className="my-home-list__card-footer">
                  <span className="my-home-list__tap-hint">View document</span>
                </div>
              </div>
            ))}

            {query.hasNextPage ? (
              <button
                type="button"
                className="my-home-list__load-more"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            ) : (
              <div className="my-home-list__end">That&apos;s all for now</div>
            )}
          </>
        )}
      </PayPageShell>

      <DocumentDetailModal
        propertyUuid={selectedUuid}
        document={openDocument}
        onClose={() => setOpenDocument(null)}
        onStatusChange={invalidateDocuments}
      />
    </>
  )
}
