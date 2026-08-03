'use client'

import React from 'react'
import { Loader2, Upload, Trash2, PenTool, Type } from 'lucide-react'
import type { SignatureConfig } from './branding.types'

type Props = {
  signatures: SignatureConfig[]
  signaturesLoading: boolean
  sigName: string
  setSigName: (next: string) => void
  sigType: 'pad' | 'upload' | 'digital'
  setSigType: (next: 'pad' | 'upload' | 'digital') => void
  typedText: string
  setTypedText: (next: string) => void
  selectedFont: string
  setSelectedFont: (next: string) => void
  uploadedSigPreview: string | null
  sigSaving: boolean
  savePending: boolean
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  startDrawing: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void
  draw: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void
  stopDrawing: () => void
  clearCanvas: () => void
  handleSignatureFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSaveSignature: (e: React.FormEvent) => Promise<void>
  onSetDefault: (id: number) => void
  onDelete: (id: number) => void
}

export function SignatureConfigurationsSection({
  signatures,
  signaturesLoading,
  sigName,
  setSigName,
  sigType,
  setSigType,
  typedText,
  setTypedText,
  selectedFont,
  setSelectedFont,
  uploadedSigPreview,
  sigSaving,
  savePending,
  canvasRef,
  startDrawing,
  draw,
  stopDrawing,
  clearCanvas,
  handleSignatureFileChange,
  handleSaveSignature,
  onSetDefault,
  onDelete,
}: Props) {
  return (
    <section id="signature-configurations" className="glass" style={{ padding: 32, borderRadius: 24, border: '1px solid var(--border)', background: 'var(--bg-card)', marginTop: 32, scrollMarginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Signature Configurations</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Configure drawn, uploaded, or typed signatures in a separate workflow.
          </p>
        </div>
      </div>

      <div className="grid-responsive-sig">
        <form onSubmit={handleSaveSignature} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Signature Name</label>
            <input
              type="text"
              placeholder="e.g. CEO Signature, Digital Sign"
              value={sigName}
              onChange={(e) => setSigName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Signature Type</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${sigType === 'pad' ? 'btn--primary' : 'btn--secondary'}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, height: 38 }}
                onClick={() => setSigType('pad')}
              >
                <PenTool size={14} /> Draw Pad
              </button>
              <button
                type="button"
                className={`btn ${sigType === 'digital' ? 'btn--primary' : 'btn--secondary'}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, height: 38 }}
                onClick={() => setSigType('digital')}
              >
                <Type size={14} /> Type Digital
              </button>
              <button
                type="button"
                className={`btn ${sigType === 'upload' ? 'btn--primary' : 'btn--secondary'}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, height: 38 }}
                onClick={() => setSigType('upload')}
              >
                <Upload size={14} /> Upload File
              </button>
            </div>
          </div>

          {sigType === 'pad' && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Draw Signature below</label>
              <div style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#f8fafc' }}>
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={160}
                  style={{ display: 'block', width: '100%', height: 160, cursor: 'crosshair' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <button
                  type="button"
                  className="btn btn--secondary"
                  style={{ position: 'absolute', bottom: 8, right: 8, height: 28, fontSize: 11, padding: '0 8px' }}
                  onClick={clearCanvas}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {sigType === 'digital' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Type Signature</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Choose Font Style</label>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}
                >
                  <option value="'Dancing Script', cursive">Dancing Script</option>
                  <option value="'Pacifico', cursive">Pacifico</option>
                  <option value="'Great Vibes', cursive">Great Vibes</option>
                  <option value="'Caveat', cursive">Caveat</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Preview</label>
                <div style={{
                  padding: 24,
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  background: '#f8fafc',
                  textAlign: 'center',
                  minHeight: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: selectedFont,
                  fontSize: 28,
                  color: '#1e3a8a'
                }}>
                  {typedText || 'Signature Preview'}
                </div>
              </div>
            </div>
          )}

          {sigType === 'upload' && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Upload Image File</label>
              <div style={{
                border: '2px dashed var(--border)',
                borderRadius: 12,
                padding: 24,
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer',
                position: 'relative'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSignatureFileChange}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                />
                {uploadedSigPreview ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <img src={uploadedSigPreview} alt="Signature Upload Preview" style={{ maxHeight: 100, objectFit: 'contain' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click to replace file</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Upload size={24} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Click to browse signature image</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Supports PNG, JPG (Max 5MB)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn--primary"
            style={{ width: '100%', height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            disabled={sigSaving || savePending}
          >
            {sigSaving ? <Loader2 size={16} className="animate-spin text-forest" /> : 'Save Signature'}
          </button>
        </form>

        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Configured Signatures</h4>
          {signaturesLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 size={24} className="animate-spin text-forest" />
            </div>
          ) : signatures.length === 0 ? (
            <div style={{ padding: 40, border: '1px solid var(--border)', borderRadius: 16, textAlign: 'center', background: 'var(--bg)' }}>
              <PenTool size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No signatures configured yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {signatures.map((sig) => (
                <div key={sig.id} className="glass" style={{
                  padding: 16,
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  background: sig.isDefault ? 'rgba(var(--brand-rgb, 59, 130, 246), 0.03)' : 'var(--bg-card)',
                  borderColor: sig.isDefault ? 'var(--brand, #3b82f6)' : 'var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 120,
                      height: 60,
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      padding: 4
                    }}>
                      {sig.type === 'digital' ? (
                        <div dangerouslySetInnerHTML={{ __html: sig.content || '' }} style={{ transform: 'scale(0.8)', transformOrigin: 'center' }} />
                      ) : (
                        <img src={sig.fileUrl} alt={sig.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h5 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{sig.name}</h5>
                        {sig.isDefault && (
                          <span style={{ fontSize: 9, background: 'var(--brand, #3b82f6)', color: 'white', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                            Default
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Type: {sig.type}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {!sig.isDefault && (
                      <button
                        className="btn btn--secondary"
                        style={{ fontSize: 11, height: 28, padding: '0 8px' }}
                        onClick={() => onSetDefault(sig.id)}
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      className="btn btn--secondary"
                      style={{ fontSize: 11, height: 28, padding: '0 8px', color: 'var(--clay)' }}
                      onClick={() => onDelete(sig.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .grid-responsive-sig {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }
        @media (min-width: 768px) {
          .grid-responsive-sig {
            grid-template-columns: 1fr 1.2fr;
          }
        }
      `}</style>
    </section>
  )
}
