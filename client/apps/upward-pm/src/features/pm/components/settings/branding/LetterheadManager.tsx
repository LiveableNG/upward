'use client'

import React, { useState } from 'react'
import { FileText, Plus, Loader2, MoreHorizontal, Eye, Pencil, Star, Trash2, Download, Image } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'
import { LetterheadWizard } from './LetterheadWizard'
import { LetterheadEditor } from './LetterheadEditor'
import { useLetterheads, usePdfProcessor } from './branding.hooks'
import { downloadBlob } from '@/lib/download-helper'
import type { SavedPmLetterhead, MarginBox } from '../branding.types'

type OverflowMenu = { id: number; open: boolean }

export function LetterheadManager() {
  const {
    letterheads,
    isLoading,
    saveMutation,
    setDefaultMutation,
    deleteMutation,
    updateMutation,
  } = useLetterheads()

  const pdfProcessor = usePdfProcessor()

  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingLetterhead, setEditingLetterhead] = useState<SavedPmLetterhead | null>(null)
  const [previewLetterhead, setPreviewLetterhead] = useState<SavedPmLetterhead | null>(null)
  const [overflowMenu, setOverflowMenu] = useState<OverflowMenu | null>(null)

  const handleWizardSave = (payload: any) => {
    saveMutation.mutate(payload, {
      onSuccess: () => {
        setWizardOpen(false)
        pdfProcessor.resetDraft()
      },
    })
  }

  const handleEditorSave = (id: number, payload: any) => {
    updateMutation.mutate({ id, payload }, {
      onSuccess: () => setEditingLetterhead(null),
    })
  }

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setEditingLetterhead(null)
        setOverflowMenu(null)
      },
    })
  }

  const handleDownloadJson = (
    lh: SavedPmLetterhead,
    firstPageMargins: MarginBox,
    continuationPageMargins: MarginBox,
    reuseFirstPage: boolean,
    singlePageOverflowMode: 'reuse' | 'blank',
  ) => {
    const isReuse = lh.pageCount === 1 ? singlePageOverflowMode === 'reuse' : reuseFirstPage
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: 1,
            templateId: lh.id,
            pageCount: lh.pageCount,
            templateConfig: {
              first_page: firstPageMargins,
              continuation_page: isReuse ? firstPageMargins : continuationPageMargins,
              reuse_first_page_for_continuation: isReuse,
            },
            exportedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    )
    downloadBlob(blob, `letterhead-${lh.id}-config.json`).catch(console.error)
  }

  const toggleOverflow = (id: number) => {
    setOverflowMenu((prev) => (prev?.id === id && prev.open ? null : { id, open: true }))
  }

  return (
    <div className="branding-manager">
      {/* Header */}
      <div className="branding-manager__header">
        <div>
          <h2 className="branding-manager__title">Letterhead Templates</h2>
          <p className="branding-manager__subtitle">
            PDF background templates applied to generated documents.
          </p>
        </div>
        <button className="btn btn--primary branding-manager__add-btn" onClick={() => setWizardOpen(true)}>
          <Plus size={16} /> Add Template
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="branding-manager__loader">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--forest)' }} />
        </div>
      ) : letterheads.length === 0 ? (
        <div className="branding-manager__empty">
          <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h4>No Templates Yet</h4>
          <p>Upload a PDF template to style your generated documents.</p>
          <button className="btn btn--primary" onClick={() => setWizardOpen(true)}>
            <Plus size={14} /> Add Your First Template
          </button>
        </div>
      ) : (
        <div className="branding-manager__grid">
          {letterheads.map((lh) => (
            <div
              key={lh.id}
              className={`branding-card ${lh.isDefault ? 'branding-card--default' : ''}`}
            >
              {/* Thumbnail */}
              <div className="branding-card__thumb">
                {lh.previewFirstPageUrl ? (
                  <img src={lh.previewFirstPageUrl} alt={`Template #${lh.id} preview`} />
                ) : (
                  <FileText size={32} style={{ color: 'var(--text-muted)' }} />
                )}
                {lh.isDefault && (
                  <span className="branding-card__default-badge">Default</span>
                )}
              </div>

              {/* Info */}
              <div className="branding-card__info">
                <h4 className="branding-card__name">Template #{lh.id}</h4>
                <div className="branding-card__meta">
                  <span>{lh.pageCount} {lh.pageCount === 1 ? 'page' : 'pages'}</span>
                  <span>·</span>
                  <span>
                    {new Date(lh.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="branding-card__actions">
                <button
                  className="branding-card__action-btn"
                  title="Preview"
                  onClick={() => setPreviewLetterhead(lh)}
                >
                  <Eye size={14} />
                </button>
                <button
                  className="branding-card__action-btn"
                  title="Edit"
                  onClick={() => setEditingLetterhead(lh)}
                >
                  <Pencil size={14} />
                </button>
                {/* Overflow menu */}
                <div className="branding-card__overflow-wrapper">
                  <button
                    className="branding-card__action-btn"
                    title="More options"
                    onClick={() => toggleOverflow(lh.id)}
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  {overflowMenu?.id === lh.id && overflowMenu.open && (
                    <>
                      <div
                        className="branding-card__overflow-backdrop"
                        onClick={() => setOverflowMenu(null)}
                      />
                      <div className="branding-card__overflow-menu">
                        {!lh.isDefault && (
                          <button
                            className="branding-card__overflow-item"
                            onClick={() => {
                              setDefaultMutation.mutate(lh.id)
                              setOverflowMenu(null)
                            }}
                          >
                            <Star size={13} /> Set as Default
                          </button>
                        )}
                        <button
                          className="branding-card__overflow-item"
                          onClick={() => {
                            const fp = lh.templateConfig?.first_page ?? { top: 170, bottom: 110, left: 50, right: 50 }
                            const cp = lh.templateConfig?.continuation_page ?? { top: 100, bottom: 80, left: 50, right: 50 }
                            const reuse = lh.templateConfig?.reuse_first_page_for_continuation !== false
                            handleDownloadJson(lh, fp, cp, reuse, reuse ? 'reuse' : 'blank')
                            setOverflowMenu(null)
                          }}
                        >
                          <Download size={13} /> Export JSON
                        </button>
                        <div className="branding-card__overflow-divider" />
                        <button
                          className="branding-card__overflow-item branding-card__overflow-item--danger"
                          onClick={() => {
                            setOverflowMenu(null)
                            handleDelete(lh.id)
                          }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      <Modal
        isOpen={!!previewLetterhead}
        onClose={() => setPreviewLetterhead(null)}
        title={`Template #${previewLetterhead?.id ?? ''} Preview`}
        subtitle={`${previewLetterhead?.pageCount ?? ''} page letterhead`}
        icon={Image}
        maxWidth={740}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <button className="btn btn--secondary" onClick={() => setPreviewLetterhead(null)}>Close</button>
          </div>
        }
      >
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {previewLetterhead?.previewFirstPageUrl && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>Page 1</p>
              <img
                src={previewLetterhead.previewFirstPageUrl}
                alt="Page 1"
                style={{ maxWidth: 300, borderRadius: 12, border: '1px solid var(--border)', display: 'block' }}
              />
            </div>
          )}
          {previewLetterhead?.previewContinuationPageUrl && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>Continuation Pages</p>
              <img
                src={previewLetterhead.previewContinuationPageUrl}
                alt="Continuation"
                style={{ maxWidth: 300, borderRadius: 12, border: '1px solid var(--border)', display: 'block' }}
              />
            </div>
          )}
          {!previewLetterhead?.previewFirstPageUrl && !previewLetterhead?.previewContinuationPageUrl && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No preview images available for this template.</p>
          )}
        </div>
      </Modal>

      {/* Wizard */}
      {wizardOpen && (
        <LetterheadWizard
          onClose={() => { setWizardOpen(false); pdfProcessor.resetDraft() }}
          onSave={handleWizardSave}
          savePending={saveMutation.isPending}
          draftFile={pdfProcessor.draftFile}
          pdfPageCount={pdfProcessor.pdfPageCount}
          previewPngUrls={pdfProcessor.previewPngUrls}
          previewPagePts={pdfProcessor.previewPagePts}
          previewLoading={pdfProcessor.previewLoading}
          uploading={pdfProcessor.uploading}
          handleFileUpload={pdfProcessor.handleFileUpload}
          uploadLetterheadFiles={pdfProcessor.uploadLetterheadFiles}
          setUploading={pdfProcessor.setUploading}
        />
      )}

      {/* Tabbed editor */}
      {editingLetterhead && (
        <LetterheadEditor
          letterhead={editingLetterhead}
          onClose={() => setEditingLetterhead(null)}
          onSave={handleEditorSave}
          onDelete={handleDelete}
          onSetDefault={(id) => setDefaultMutation.mutate(id)}
          savePending={updateMutation.isPending}
          deletePending={deleteMutation.isPending}
          onDownloadJson={handleDownloadJson}
        />
      )}
    </div>
  )
}
