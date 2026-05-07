'use client'

import React, { useState } from 'react'
import { 
  ChevronLeft, 
  Mail, 
  FileText, 
  CheckCircle2, 
  Circle, 
  Send, 
  Eye, 
  Plus, 
  X,
  Type,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Table as TableIcon
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface LandlordReportEditorViewProps {
  landlordName: string
  landlordEmail: string
  initialContent: string
  onBack: () => void
  onSend: (data: any) => void
}

export function LandlordReportEditorView({ 
  landlordName, 
  landlordEmail, 
  initialContent, 
  onBack,
  onSend 
}: LandlordReportEditorViewProps) {
  const [content, setContent] = useState(initialContent)
  const [sendType, setSendType] = useState<'pdf' | 'email'>('pdf')
  const [includeLetterhead, setIncludeLetterhead] = useState(true)
  const [recipientEmail, setRecipientEmail] = useState(landlordEmail)
  const [isSending, setIsSending] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true)
    const element = document.getElementById('report-print-container')
    if (!element) {
      setIsGeneratingPdf(false)
      return
    }

    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      // Temporarily show the print container for capture
      element.style.display = 'block'
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      
      element.style.display = 'none'

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgProps = pdf.getImageProperties(imgData)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`landlord-report-${landlordName.toLowerCase().replace(/\s+/g, '-')}-${new Date().getTime()}.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleSend = async () => {
    setIsSending(true)
    try {
      await api.sendLandlordReport({
        landlordEmail: recipientEmail,
        landlordName: landlordName,
        subject: `Property Performance Report - ${landlordName}`,
        content: content
      })
      onSend({ content, sendType, includeLetterhead, recipientEmail })
    } catch (err) {
      console.error('Failed to send report:', err)
      // We could add a toast error here
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="report-editor animate-fade-in">
      <header style={{ marginBottom: 32 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
          <ChevronLeft size={18} /> Back to Configuration
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)' }}>Send Landlord Report</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 40, alignItems: 'start' }}>
        
        {/* Left: Sending Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 20 }}>Send document as</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div 
                onClick={() => setSendType('pdf')}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              >
                <div style={{ color: sendType === 'pdf' ? 'var(--forest)' : 'var(--border)' }}>
                  {sendType === 'pdf' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>PDF attachment</div>
                </div>
              </div>

              <div 
                onClick={() => setSendType('email')}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              >
                <div style={{ color: sendType === 'email' ? 'var(--forest)' : 'var(--border)' }}>
                  {sendType === 'email' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>E-mail</div>
                </div>
              </div>
            </div>

            <div 
              onClick={() => setIncludeLetterhead(!includeLetterhead)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', paddingTop: 16, borderTop: '1px solid var(--border)' }}
            >
              <div style={{ color: includeLetterhead ? 'var(--forest)' : 'var(--border)' }}>
                {includeLetterhead ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Include letterhead</span>
            </div>
          </div>

          <div className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 20 }}>Recipient</h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>FROM</label>
              <select className="form-input" style={{ width: '100%', background: 'var(--ivory-dim)', border: 'none' }}>
                <option>Default - noreply@goodtenants.io</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>TO</label>
              <div style={{ 
                background: 'var(--forest-faint)', 
                padding: '12px 16px', 
                borderRadius: 12, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                color: 'var(--forest)',
                fontWeight: 600,
                fontSize: 13
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--forest)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{landlordName[0]}</div>
                  {landlordName}
                </div>
                <X size={14} style={{ cursor: 'pointer' }} />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>{landlordEmail}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button 
              className="btn btn--secondary" 
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              style={{ width: '100%', borderRadius: 100, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Eye size={18} /> {isGeneratingPdf ? 'Generating...' : 'Preview / Download PDF'}
            </button>
            <button 
              className="btn btn--primary" 
              onClick={handleSend}
              disabled={isSending}
              style={{ width: '100%', borderRadius: 100, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {isSending ? 'Sending...' : <><Send size={18} /> Send Report</>}
            </button>
          </div>
        </div>

        {/* Right: Rich Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '800px' }}>
          {/* Toolbar */}
          <div style={{ 
            background: 'white', 
            padding: '12px 24px', 
            borderRadius: '24px 24px 0 0', 
            border: '1px solid var(--border)',
            borderBottom: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ padding: 6, borderRadius: 6, background: '#f1f5f9' }}><Bold size={16} /></button>
              <button style={{ padding: 6, borderRadius: 6 }}><Italic size={16} /></button>
              <button style={{ padding: 6, borderRadius: 6 }}><Type size={16} /></button>
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ padding: 6, borderRadius: 6 }}><AlignLeft size={16} /></button>
              <button style={{ padding: 6, borderRadius: 6 }}><AlignCenter size={16} /></button>
              <button style={{ padding: 6, borderRadius: 6 }}><AlignRight size={16} /></button>
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ padding: 6, borderRadius: 6 }}><List size={16} /></button>
              <button style={{ padding: 6, borderRadius: 6 }}><TableIcon size={16} /></button>
            </div>
          </div>

          {/* Editor Body */}
          <div style={{ 
            background: 'white', 
            flex: 1, 
            borderRadius: '0 0 24px 24px', 
            border: '1px solid var(--border)',
            padding: '40px',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div 
              contentEditable 
              suppressContentEditableWarning
              onInput={(e) => setContent(e.currentTarget.innerHTML)}
              style={{ 
                outline: 'none', 
                fontSize: 15, 
                lineHeight: 1.8, 
                color: 'var(--text-secondary)',
                minHeight: '100%'
              }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </div>

      </div>

      {/* Hidden Print Container for PDF Generation */}
      <div 
        id="report-print-container" 
        style={{ 
          display: 'none', 
          width: '210mm', 
          background: 'white', 
          padding: '20mm',
          position: 'fixed',
          left: '-9999px',
          top: 0
        }}
      >
        {includeLetterhead && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '15mm',
            borderBottom: '2px solid var(--forest)',
            paddingBottom: '5mm'
          }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--forest)' }}>UPWARD</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Property Management Excellence</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-muted)' }}>
              123 Real Estate Plaza, Lagos<br/>
              contact@goodtenants.io | +234 800 000 0000
            </div>
          </div>
        )}
        <div 
          style={{ fontSize: '12pt', lineHeight: 1.6, color: '#333' }} 
          dangerouslySetInnerHTML={{ __html: content }} 
        />
        <div style={{ marginTop: '20mm', borderTop: '1px solid #eee', paddingTop: '5mm', fontSize: 10, color: '#999', textAlign: 'center' }}>
          This report was generated securely via Upward Property Management Portal.
        </div>
      </div>
    </div>
  )
}
