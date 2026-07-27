import React, { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { MapPin, Search, Plus, Upload, Pencil, Trash2, ChevronDown, Filter } from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import { DataTable } from '../components/common/table/DataTable'
import type { ColumnDef, ActionItem } from '../components/common/table/DataTable'
import { Modal } from '../components/common/modal/Modal'
import { useConfirm } from '../components/common/modal/ConfirmModal'
import { filterLocationOptions } from '../lib/request-home-locations'
import type { RequestHomeLocationOption } from '../lib/request-home-locations'

interface AreaPriceGuideRow {
  id: number
  uuid: string
  state: string
  area: string
  subArea: string | null
  bedrooms: number
  baths: number | null
  minPrice: number
  maxPrice: number
  sampleSize: number
  updatedAt: string
}

interface AreaPriceGuideProps {
  token: string
}

interface FormState {
  locationQuery: string
  state: string
  area: string
  subArea: string
  bedrooms: string
  baths: string
  minPrice: string
  maxPrice: string
  sampleSize: string
}

interface BulkRow {
  state: string
  area: string
  subArea?: string
  bedrooms: number
  baths?: number
  minPrice: number
  maxPrice: number
  sampleSize: number
}

interface BulkResult {
  created: number
  updated: number
  failed: { row: BulkRow; error: string }[]
}

const EMPTY_FORM: FormState = {
  locationQuery: '',
  state: '',
  area: '',
  subArea: '',
  bedrooms: '',
  baths: '',
  minPrice: '',
  maxPrice: '',
  sampleSize: '',
}

const PAGE_SIZE = 50
const REQUIRED_BULK_COLUMNS = ['state', 'area', 'bedrooms', 'minPrice', 'maxPrice', 'sampleSize']

const normalizeHeader = (h: string) =>
  h
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')

const AreaPriceGuide: React.FC<AreaPriceGuideProps> = ({ token }) => {
  const { confirm } = useConfirm()

  const [rows, setRows] = useState<AreaPriceGuideRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('ALL')
  const [states, setStates] = useState<string[]>([])

  const [showFormModal, setShowFormModal] = useState(false)
  const [editingRow, setEditingRow] = useState<AreaPriceGuideRow | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [locationSuggestions, setLocationSuggestions] = useState<RequestHomeLocationOption[]>([])
  const [saving, setSaving] = useState(false)

  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([])
  const [bulkFileName, setBulkFileName] = useState('')
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)

  const fetchStates = async () => {
    try {
      const res = await apiService.get('/admin/area-price-guide/states', token)
      setStates(res.data || [])
    } catch (err) {
      console.error('Failed to fetch states', err)
    }
  }

  const fetchRows = async (pageNum = page) => {
    setLoading(true)
    try {
      let url = `/admin/area-price-guide?page=${pageNum}&limit=${PAGE_SIZE}`
      if (stateFilter !== 'ALL') url += `&state=${encodeURIComponent(stateFilter)}`
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`

      const res = await apiService.get(url, token)
      setRows(res.data || [])
      setTotalPages(res.meta?.totalPages || 1)
      setTotal(res.meta?.total || 0)
    } catch (err) {
      console.error('Failed to fetch area price guide rows', err)
      showToast('Failed to load area price guide', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStates()
  }, [])

  useEffect(() => {
    fetchRows(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, stateFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchRows(1)
  }

  const openAddModal = () => {
    setEditingRow(null)
    setForm(EMPTY_FORM)
    setLocationSuggestions([])
    setShowFormModal(true)
  }

  const openEditModal = (row: AreaPriceGuideRow) => {
    setEditingRow(row)
    const label = [row.subArea, row.area, row.state].filter(Boolean).join(', ')
    setForm({
      locationQuery: label,
      state: row.state,
      area: row.area,
      subArea: row.subArea || '',
      bedrooms: String(row.bedrooms),
      baths: row.baths != null ? String(row.baths) : '',
      minPrice: String(row.minPrice),
      maxPrice: String(row.maxPrice),
      sampleSize: String(row.sampleSize),
    })
    setLocationSuggestions([])
    setShowFormModal(true)
  }

  const handleLocationQueryChange = (value: string) => {
    setForm((prev) => ({ ...prev, locationQuery: value }))
    if (value.trim().length < 2) {
      setLocationSuggestions([])
      return
    }
    setLocationSuggestions(filterLocationOptions(value, 10))
  }

  const handleSelectLocation = (option: RequestHomeLocationOption) => {
    setForm((prev) => ({
      ...prev,
      locationQuery: option.label,
      state: option.state,
      area: option.area,
      subArea: option.subArea || '',
    }))
    setLocationSuggestions([])
  }

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.state.trim() || !form.area.trim()) {
      showToast('Pick a location from the suggestions or fill in State and Area', true)
      return
    }

    const payload = {
      state: form.state.trim(),
      area: form.area.trim(),
      subArea: form.subArea.trim() || undefined,
      bedrooms: parseInt(form.bedrooms, 10),
      baths: form.baths.trim() ? parseInt(form.baths, 10) : undefined,
      minPrice: parseFloat(form.minPrice),
      maxPrice: parseFloat(form.maxPrice),
      sampleSize: parseInt(form.sampleSize, 10),
    }

    if (
      Number.isNaN(payload.bedrooms) ||
      Number.isNaN(payload.minPrice) ||
      Number.isNaN(payload.maxPrice) ||
      Number.isNaN(payload.sampleSize)
    ) {
      showToast('Bedrooms, min/max price, and sample size must be numbers', true)
      return
    }

    setSaving(true)
    try {
      if (editingRow) {
        await apiService.patch(`/admin/area-price-guide/${editingRow.uuid}`, payload, token)
        showToast('Row updated')
      } else {
        await apiService.post('/admin/area-price-guide', payload, token)
        showToast('Row added')
      }
      setShowFormModal(false)
      fetchRows(page)
      fetchStates()
    } catch (err: any) {
      showToast(err.message || 'Failed to save row', true)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: AreaPriceGuideRow) => {
    const label = [row.subArea, row.area, row.state].filter(Boolean).join(', ')
    const isConfirmed = await confirm({
      title: 'Delete price guide row',
      message: `Remove the price guide entry for ${label} (${row.bedrooms} bed)? This cannot be undone.`,
    })
    if (!isConfirmed) return

    try {
      await apiService.delete(`/admin/area-price-guide/${row.uuid}`, token)
      showToast('Row deleted')
      fetchRows(page)
    } catch (err: any) {
      showToast(err.message || 'Failed to delete row', true)
    }
  }

  const handleBulkFile = (file: File) => {
    setBulkFileName(file.name)
    setBulkResult(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result
        if (!data) throw new Error('Could not read file')

        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = sheetName ? workbook.Sheets[sheetName] : undefined
        if (!worksheet) throw new Error('No sheet found in file')

        const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

        const parsed: BulkRow[] = json
          .map((raw) => {
            const row: Record<string, any> = {}
            for (const key of Object.keys(raw)) {
              row[normalizeHeader(key)] = raw[key]
            }
            const bedrooms = parseInt(row.bedrooms, 10)
            const baths =
              row.baths !== '' && row.baths != null ? parseInt(row.baths, 10) : undefined
            const minPrice = parseFloat(row.minprice)
            const maxPrice = parseFloat(row.maxprice)
            const sampleSize = parseInt(row.samplesize, 10)

            return {
              state: String(row.state || '').trim(),
              area: String(row.area || '').trim(),
              subArea: String(row.subarea || '').trim() || undefined,
              bedrooms,
              baths: baths != null && Number.isNaN(baths) ? undefined : baths,
              minPrice,
              maxPrice,
              sampleSize,
            }
          })
          .filter(
            (row) =>
              row.state &&
              row.area &&
              !Number.isNaN(row.bedrooms) &&
              !Number.isNaN(row.minPrice) &&
              !Number.isNaN(row.maxPrice) &&
              !Number.isNaN(row.sampleSize),
          )

        setBulkRows(parsed)
        if (parsed.length === 0) {
          showToast(
            `No valid rows found. Expected columns: ${REQUIRED_BULK_COLUMNS.join(', ')}`,
            true,
          )
        }
      } catch (err) {
        console.error('Failed to parse file', err)
        showToast('Failed to parse file. Make sure it is a valid CSV/XLSX.', true)
        setBulkRows([])
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleBulkUpload = async () => {
    if (bulkRows.length === 0) return
    setBulkUploading(true)
    try {
      const res = await apiService.post(
        '/admin/area-price-guide/bulk-upsert',
        { rows: bulkRows },
        token,
      )
      setBulkResult(res)
      showToast(
        `Bulk upload complete: ${res.created} created, ${res.updated} updated${
          res.failed?.length ? `, ${res.failed.length} failed` : ''
        }`,
      )
      fetchRows(page)
      fetchStates()
    } catch (err: any) {
      showToast(err.message || 'Bulk upload failed', true)
    } finally {
      setBulkUploading(false)
    }
  }

  const closeBulkModal = () => {
    setShowBulkModal(false)
    setBulkRows([])
    setBulkFileName('')
    setBulkResult(null)
  }

  const columns: ColumnDef<AreaPriceGuideRow>[] = [
    {
      key: 'location',
      label: 'Location',
      render: (row) => (
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{row.area}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {row.subArea ? `${row.subArea}, ` : ''}
            {row.state}
          </div>
        </div>
      ),
    },
    {
      key: 'bedrooms',
      label: 'Bed / Bath',
      align: 'center',
      render: (row) => (
        <span style={{ fontSize: '13px' }}>
          {row.bedrooms} bed{row.baths != null ? ` / ${row.baths} bath` : ''}
        </span>
      ),
    },
    {
      key: 'minPrice',
      label: 'Min Price',
      align: 'right',
      render: (row) => <span style={{ fontSize: '13px' }}>₦{row.minPrice.toLocaleString()}</span>,
    },
    {
      key: 'maxPrice',
      label: 'Max Price',
      align: 'right',
      render: (row) => <span style={{ fontSize: '13px' }}>₦{row.maxPrice.toLocaleString()}</span>,
    },
    {
      key: 'sampleSize',
      label: 'Samples',
      align: 'center',
      render: (row) => <span style={{ fontSize: '13px' }}>{row.sampleSize}</span>,
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      render: (row) => (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {new Date(row.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
  ]

  const rowActions: ActionItem<AreaPriceGuideRow>[] = [
    { label: 'Edit', icon: <Pencil size={14} />, onClick: openEditModal },
    { label: 'Delete', icon: <Trash2 size={14} />, onClick: handleDelete, danger: true },
  ]

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div
        className="page-header flex-mobile-column"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="icon-container"
            style={{
              background: 'var(--accent-faint)',
              color: 'var(--accent)',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MapPin size={24} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Area Price Guide
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              {total} location {total === 1 ? 'entry' : 'entries'} powering the home-request budget
              guidance.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowBulkModal(true)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Upload size={16} /> Bulk Upload
          </button>
          <button
            onClick={openAddModal}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} /> Add Row
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <form
          onSubmit={handleSearchSubmit}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}
        >
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by area or sub-area (Press Enter)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '12px' }}
            />
          </div>

          <div style={{ position: 'relative', minWidth: '180px' }}>
            <Filter
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value)
                setPage(1)
              }}
              className="input"
              style={{ padding: '11px 32px 11px 36px', appearance: 'none', cursor: 'pointer' }}
            >
              <option value="ALL">All States</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </form>
      </div>

      {/* Table */}
      <DataTable
        data={rows}
        columns={columns}
        isLoading={loading}
        emptyTitle="No area price guide rows found."
        keyExtractor={(row) => row.uuid}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        rowActions={rowActions}
      />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingRow ? 'Edit Price Guide Row' : 'Add Price Guide Row'}
        description="Sets the rent range shown to prospects for this location and bedroom count."
        icon={<MapPin size={20} />}
        maxWidth="520px"
      >
        <form
          onSubmit={handleSubmitForm}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div style={{ position: 'relative' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                marginBottom: '6px',
              }}
            >
              Location
            </label>
            <input
              type="text"
              required
              placeholder="Start typing an area, e.g. Lekki..."
              value={form.locationQuery}
              onChange={(e) => handleLocationQueryChange(e.target.value)}
              className="input"
              style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
            />
            {locationSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  marginTop: '4px',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 10,
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {locationSuggestions.map((opt) => (
                  <div
                    key={opt.key}
                    onClick={() => handleSelectLocation(opt)}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      fontSize: '13px',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
            {form.state && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                State: <strong>{form.state}</strong> · Area: <strong>{form.area}</strong>
                {form.subArea && (
                  <>
                    {' '}
                    · Sub-area: <strong>{form.subArea}</strong>
                  </>
                )}
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                Bedrooms
              </label>
              <input
                type="number"
                min="0"
                required
                value={form.bedrooms}
                onChange={(e) => setForm((p) => ({ ...p, bedrooms: e.target.value }))}
                className="input"
                style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                Baths (optional)
              </label>
              <input
                type="number"
                min="0"
                value={form.baths}
                onChange={(e) => setForm((p) => ({ ...p, baths: e.target.value }))}
                className="input"
                style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                Min Price (₦/yr)
              </label>
              <input
                type="number"
                min="0"
                required
                value={form.minPrice}
                onChange={(e) => setForm((p) => ({ ...p, minPrice: e.target.value }))}
                className="input"
                style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                Max Price (₦/yr)
              </label>
              <input
                type="number"
                min="0"
                required
                value={form.maxPrice}
                onChange={(e) => setForm((p) => ({ ...p, maxPrice: e.target.value }))}
                className="input"
                style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                marginBottom: '6px',
              }}
            >
              Sample Size
            </label>
            <input
              type="number"
              min="0"
              required
              value={form.sampleSize}
              onChange={(e) => setForm((p) => ({ ...p, sampleSize: e.target.value }))}
              className="input"
              style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Saving...' : editingRow ? 'Save Changes' : 'Add Row'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        isOpen={showBulkModal}
        onClose={closeBulkModal}
        title="Bulk Upload Price Guide Rows"
        description="Upload a CSV or XLSX file. Columns: state, area, subArea (optional), bedrooms, baths (optional), minPrice, maxPrice, sampleSize."
        icon={<Upload size={20} />}
        maxWidth="520px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleBulkFile(file)
            }}
          />

          {bulkFileName && bulkRows.length > 0 && (
            <div
              style={{
                background: 'var(--surface-hover)',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '13px',
              }}
            >
              <strong>{bulkFileName}</strong>: {bulkRows.length} valid row
              {bulkRows.length === 1 ? '' : 's'} parsed and ready to upload.
            </div>
          )}

          {bulkResult && (
            <div
              style={{
                background: 'var(--success-faint)',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '13px',
              }}
            >
              Created {bulkResult.created}, updated {bulkResult.updated}
              {bulkResult.failed?.length ? `, ${bulkResult.failed.length} row(s) failed` : ''}.
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={closeBulkModal}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleBulkUpload}
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={bulkRows.length === 0 || bulkUploading}
            >
              {bulkUploading ? 'Uploading...' : `Upload ${bulkRows.length || ''} Rows`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AreaPriceGuide
