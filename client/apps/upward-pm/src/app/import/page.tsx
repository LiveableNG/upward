'use client'

import React, { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Upload, FileSpreadsheet, FileText, Check, Info } from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { useProperties, useBulkFullImport } from '@/features/pm/hooks/useProperties'
import { api } from '@/lib/api'
import { FULL_COLUMNS } from '@/features/pm/components/settings/data-import/types'
import { useDataImport } from '@/features/pm/components/settings/data-import/useDataImport'
import { ImportOverlay } from '@/features/pm/components/settings/data-import/ImportOverlay'
import { RelayConfirmationModal } from '@/features/pm/components/settings/data-import/RelayConfirmationModal'

// The seven things a sheet must carry. Labels come from FULL_COLUMNS so they
// cannot drift from the mapping screen. Unit and property names are generated
// when the sheet does not have them.
const COMPULSORY_KEYS = [
  'propertyAddress',
  'tenantFirstName',
  'tenantPhone',
  'unitRentAmount',
  'unitRentAmountPaid',
  'unitRentStartDate',
  'unitRentType',
] as const

const SAMPLE_ROWS = [
  ['18 Freedom Way, Lekki', 'Daniel Okafor', '08015470104', '4200000', '4200000', '15/01/2025', 'Annually'],
  ['18 Freedom Way, Lekki', 'Sarah Williams', '08056677889', '650000', '650000', '01/02/2025', 'Monthly'],
  ['7 Prince Ade Odedina St, VI', 'Chinedu Okeke', '08097337649', '15000000', '7500000', '15/07/2025', 'Annually'],
  ['22 Adeola Odeku St, VI', 'TechNova Ltd', '08078899001', '24000000', '24000000', '01/03/2025', 'Lease'],
  ['40 Gwarimpa Estate, Abuja', 'Aisha Mohammed', '08076729376', '18000000', '18000000', '10/07/2025', 'Annually'],
]

export default function ImportPage() {
  const router = useRouter()
  const { success, error } = useToast()
  const { data: properties = [] } = useProperties()
  const bulkFullImportMutation = useBulkFullImport()

  const mode = 'full' as const
  const columns = useMemo(() => FULL_COLUMNS, [])
  const importState = useDataImport(columns, mode, properties, '')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [pendingRelayFile, setPendingRelayFile] = useState<File | null>(null)
  const [showRelayModal, setShowRelayModal] = useState(false)
  const [isRelaying, setIsRelaying] = useState(false)

  const compulsory = COMPULSORY_KEYS
    .map(key => columns.find(c => c.key === key))
    .filter((c): c is NonNullable<typeof c> => !!c)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    const isSheet = ['csv', 'xlsx', 'xls', 'xlsm', 'xlsb', 'xltx', 'xltm'].includes(ext || '')

    if (isSheet) {
      importState.handleFileUpload(e, fileInputRef)
    } else {
      setPendingRelayFile(file)
      setShowRelayModal(true)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (docInputRef.current) docInputRef.current.value = ''
    }
  }

  const passFile = (file: File) => {
    const transfer = new DataTransfer()
    transfer.items.add(file)
    if (fileInputRef.current) fileInputRef.current.files = transfer.files
    handleFileSelect({ target: { files: transfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) passFile(file)
  }

  const handleConfirmRelay = async () => {
    if (!pendingRelayFile) return
    setIsRelaying(true)
    const ext = pendingRelayFile.name.split('.').pop()?.toLowerCase() || 'doc'
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const base64Data = (ev.target?.result as string).split(',')[1]
        const { fileKey } = await api.post('/pm/bulk-imports/relay-upload', {
          fileName: pendingRelayFile.name,
          contentType: pendingRelayFile.type || 'application/octet-stream',
          base64Data,
        })
        await api.post('/pm/bulk-imports/relay', {
          targetPropertyUuid: '',
          mode,
          originalFileName: pendingRelayFile.name,
          fileUrl: fileKey,
          fileType: ext,
        })
        setShowRelayModal(false)
        setPendingRelayFile(null)
        success('Sent to our team. We will let you know when it is ready, usually within 48 hours.')
        router.push('/dashboard')
      } catch {
        error('We could not send that just now. Please try again.')
      } finally {
        setIsRelaying(false)
      }
    }
    reader.onerror = () => { error('Could not read that file.'); setIsRelaying(false) }
    reader.readAsDataURL(pendingRelayFile)
  }

  const handleApproveImport = (rows: Record<string, unknown>[]) => {
    if (!rows || rows.length === 0) return error('Nothing to import')
    const clean = rows.map(row => {
      const out: Record<string, unknown> = {}
      columns.forEach(col => {
        const val = row[col.key]
        if (val !== undefined && val !== '') {
          out[col.key] = col.type === 'number' ? (parseFloat(String(val)) || 0) : val
        }
      })
      return out
    })
    bulkFullImportMutation.mutate({ rows: clean }, {
      onSuccess: (res: { unitsCreated?: number }) => {
        success(`Imported ${res.unitsCreated || clean.length} units`)
        importState.closeOverlay()
        router.push('/properties')
      },
      onError: (err: Error) => error(err?.message || 'Could not complete the import'),
    })
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>Bring your properties in</span>
        <button
          onClick={() => router.push('/dashboard')}
          aria-label="Close"
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
        >
          <X size={18} />
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 20px 48px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--dark)', margin: '0 0 8px' }}>
            Upload your spreadsheet
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 28px', lineHeight: 1.6 }}>
            Bring the sheet you already use. You will match your columns to ours on the next screen, so the column
            names do not matter.
          </p>

          <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', margin: '0 0 4px' }}>
              Your sheet needs these {compulsory.length} things
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Everything else is optional and can be added later.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {compulsory.map(c => (
                <span key={c.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--dark)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '7px 12px' }}>
                  <Check size={14} style={{ color: 'var(--forest)' }} />
                  {c.label}
                </span>
              ))}
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>A sheet like this works</p>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    {compulsory.map(c => (
                      <th key={c.key} style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--dark)' }}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_ROWS.map((row, i) => (
                    <tr key={i} style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ padding: '10px 12px', color: j === 0 ? 'var(--text-muted)' : 'var(--dark)' }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 16, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 13px' }}>
              <Info size={15} style={{ color: 'var(--clay)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                Put everything on <strong style={{ color: 'var(--dark)' }}>one sheet</strong>, with one row for each
                flat or unit. We read the first sheet in your file. Flat and property names are filled in for you if
                your sheet does not have them.
              </p>
            </div>
          </section>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '44px 24px',
              borderRadius: 16,
              border: `2px dashed ${isDragging ? 'var(--clay)' : 'var(--border-strong)'}`,
              background: isDragging ? 'var(--clay-faint)' : 'var(--surface)',
              transition: 'background 0.15s, border-color 0.15s',
              marginBottom: 16,
            }}
          >
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid var(--border)' }}>
              <FileSpreadsheet size={28} style={{ color: 'var(--clay)' }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', margin: '0 0 6px' }}>
              {isDragging ? 'Drop it here' : 'Choose your spreadsheet'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 18px' }}>Excel (.xlsx, .xls) or CSV</p>
            <label className="btn btn--primary" style={{ padding: '12px 30px', height: 46, borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Upload size={17} /> Choose file
              <input type="file" accept=".csv,.xlsx,.xls,.xlsm,.xlsb" style={{ display: 'none' }} onChange={handleFileSelect} ref={fileInputRef} />
            </label>
            <p className="desktop-only" style={{ fontSize: 12, color: 'var(--text-muted)', margin: '12px 0 0' }}>
              or drop the file into this box
            </p>
          </div>

          <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
              <FileText size={20} style={{ color: 'var(--clay)', flexShrink: 0, marginTop: 2 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', margin: '0 0 3px' }}>
                  No spreadsheet?
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>
                  Send a document, PDF or photo of your records and our team will set it up for you, usually within
                  48 hours.
                </p>
              </div>
            </div>
            <label className="btn btn--secondary" style={{ height: 42, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
              <Upload size={15} /> Send a document
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" style={{ display: 'none' }} onChange={handleFileSelect} ref={docInputRef} />
            </label>
          </section>

        </div>
      </div>

      <RelayConfirmationModal
        isOpen={showRelayModal}
        file={pendingRelayFile}
        onClose={() => { setShowRelayModal(false); setPendingRelayFile(null) }}
        onConfirm={handleConfirmRelay}
        isSubmitting={isRelaying}
      />

      {importState.isOverlayOpen && (
        <ImportOverlay
          {...importState}
          mode={mode}
          columns={columns}
          isPending={bulkFullImportMutation.isPending}
          handleConfirmImport={(rows) => handleApproveImport((rows || importState.previewRows) as Record<string, unknown>[])}
        />
      )}
    </main>
  )
}
