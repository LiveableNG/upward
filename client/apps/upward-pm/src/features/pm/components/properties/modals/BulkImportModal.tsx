import React from 'react'
import { X, FileSpreadsheet, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Property } from '../../../services/propertyService'

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  targetPropertyUuid: string;
  setTargetPropertyUuid: (uuid: string) => void;
  previewUnits: any[];
  setPreviewUnits: (units: any[]) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen, onClose, properties, targetPropertyUuid, setTargetPropertyUuid, previewUnits, setPreviewUnits, onFileUpload, onConfirm, isPending
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="modal__title">Bulk Import Units</h2>
            <p className="modal__desc">Upload your excel/csv sheet to add multiple units at once.</p>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="form-group" style={{ marginTop: 20 }}>
          <label className="form-label">Select Target Property</label>
          <select 
            className="form-input" 
            value={targetPropertyUuid} 
            onChange={e => setTargetPropertyUuid(e.target.value)}
          >
            <option value="">-- Choose Property --</option>
            {properties.map(p => <option key={p.uuid} value={p.uuid}>{p.name}</option>)}
          </select>
        </div>

        {previewUnits.length === 0 ? (
          <>
            <label className={cn("import-zone", !targetPropertyUuid && "import-zone--disabled")}>
              <div className="import-zone__icon">
                <FileSpreadsheet size={48} />
              </div>
              <p style={{ fontWeight: 600, fontSize: 14 }}>Click to upload</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>CSV (Max 10MB)</p>
              <input type="file" accept=".csv" style={{display: 'none'}} onChange={onFileUpload} disabled={!targetPropertyUuid} />
            </label>

            <div style={{ background: 'var(--ivory-dim)', padding: 16, borderRadius: 12, marginBottom: 24 }}>
              <p style={{ fontSize: 12, lineHeight: 1.5 }}>
                <strong>Tip:</strong> Make sure to use our template to ensure all columns (Unit Name, Tenant Name, Tenant Email, Rent Amount) are correctly mapped.
              </p>
            </div>
          </>
        ) : (
          <>
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 20, border: '1px solid var(--border)', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: 'var(--surface-hover)', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Unit Name</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>First Name</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Last Name</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Rent (₦)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {previewUnits.map((u, i) => (
                    <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <input className="form-input" style={{ padding: '4px 8px' }} value={u.unitName} onChange={e => {
                          const newArr = [...previewUnits]; newArr[i].unitName = e.target.value; setPreviewUnits(newArr);
                        }} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input className="form-input" style={{ padding: '4px 8px' }} value={u.tenantFirstName} onChange={e => {
                          const newArr = [...previewUnits]; newArr[i].tenantFirstName = e.target.value; setPreviewUnits(newArr);
                        }} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input className="form-input" style={{ padding: '4px 8px' }} value={u.tenantLastName} onChange={e => {
                          const newArr = [...previewUnits]; newArr[i].tenantLastName = e.target.value; setPreviewUnits(newArr);
                        }} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input type="number" className="form-input" style={{ padding: '4px 8px' }} value={u.rentAmount} onChange={e => {
                          const newArr = [...previewUnits]; newArr[i].rentAmount = parseFloat(e.target.value) || 0; setPreviewUnits(newArr);
                        }} />
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button onClick={() => setPreviewUnits(previewUnits.filter(pu => pu.id !== u.id))} style={{ color: 'var(--error)' }}><X size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn--secondary" onClick={() => setPreviewUnits([...previewUnits, { 
                id: Date.now(), 
                unitName: '', 
                tenantFirstName: '', 
                tenantLastName: '', 
                rentAmount: 0, 
                rentStartDate: '',
                rentDueDate: 1,
                rentType: 'Monthly',
                status: 'VACANT' 
              }])}>
                <Plus size={16} /> Add Row
              </button>
              <button className="btn btn--primary" style={{ flex: 1 }} onClick={onConfirm} disabled={isPending}>
                {isPending ? 'Importing...' : `Confirm Import (${previewUnits.length})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
