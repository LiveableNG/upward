
'use client'

import React, { useState } from 'react'
import { 
  ChevronLeft, 
  CheckCircle2, 
  Circle, 
  Download,
  Send,
  Mail,
  User,
  AlertCircle
} from 'lucide-react'
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(
  () => import('@/components/common/RichTextEditor').then((mod) => mod.RichTextEditor),
  { ssr: false, loading: () => <div className="animate-pulse h-[400px] bg-slate-100 rounded-md w-full" /> }
)
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'

interface LandlordReportEditorViewProps {
  landlordName: string
  landlordEmail: string
  initialContent: string
  onBack: () => void
  onDone: () => void
}

export function LandlordReportEditorView({ 
  landlordName, 
  landlordEmail, 
  initialContent, 
  onBack,
  onDone 
}: LandlordReportEditorViewProps) {
  const { success, error } = useToast()
  const [content, setContent] = useState(initialContent)
  const [subject, setSubject] = useState(`Property Performance Report - ${landlordName}`)
  const { user } = useAuth()
  const hasBranding = !!(user?.letterheadHeaderUrl || user?.letterheadFooterUrl)
  const [includeLetterhead, setIncludeLetterhead] = useState(hasBranding)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isSending, setIsSending] = useState(false)

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
      success('PDF report generated successfully')
    } catch (err) {
      console.error('PDF generation failed:', err)
      error('Failed to generate PDF report')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleSendEmail = async () => {
    if (!subject) return error('Please enter a report subject')
    if (!content) return error('Report content cannot be empty')

    setIsSending(true)
    try {
      await api.sendLandlordReport({
        landlordEmail,
        landlordName,
        subject,
        content,
        includeLetterhead
      })
      success(`Report successfully sent to ${landlordEmail}`)
      onDone()
    } catch (err: any) {
      error(err.message || 'Failed to send report to landlord')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="report-editor animate-fade-in" style={{ paddingBottom: 40 }}>
      <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
            <ChevronLeft size={18} /> Back to Configuration
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)' }}>Review & Send Report</h1>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            className="btn btn--secondary" 
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || isSending}
            style={{ borderRadius: 12, height: 48, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Download size={20} /> {isGeneratingPdf ? 'Generating...' : 'Save as PDF'}
          </button>
          <button 
            className="btn btn--primary" 
            onClick={handleSendEmail}
            disabled={isSending || isGeneratingPdf}
            style={{ borderRadius: 12, height: 48, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Send size={20} /> {isSending ? 'Sending...' : 'Send to Landlord'}
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 40, alignItems: 'start' }}>
        
        {/* Left: Configuration Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border)', background: 'white' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 24 }}>Report Settings</h3>
            
            <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Recipient Landlord</label>
                <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--dark)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                    {landlordName.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{landlordName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{landlordEmail}</div>
                  </div>
                </div>
            </div>

            <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Report Subject</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Enter subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }}
                />
            </div>

            {hasBranding && (
              <div 
                onClick={() => setIncludeLetterhead(!includeLetterhead)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', paddingTop: 20, marginTop: 20, borderTop: '1px solid var(--bg)' }}
              >
                <div style={{ 
                  width: 18, 
                  height: 18, 
                  borderRadius: 4, 
                  border: `1px solid ${includeLetterhead ? 'var(--forest)' : 'var(--border)'}`,
                  background: includeLetterhead ? 'var(--forest)' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  {includeLetterhead && <div style={{ width: 8, height: 8, background: 'white', borderRadius: 1 }}></div>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Include custom letterhead</span>
              </div>
            )}
          </div>

          <div className="glass" style={{ padding: 20, borderRadius: 24, border: '1px solid var(--border)', background: 'var(--ivory-dim)', display: 'flex', gap: 12 }}>
            <AlertCircle size={20} color="var(--clay)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Finalize your edits before sending. Reports sent via email will automatically be saved to the landlord's communication history.
            </p>
          </div>
        </div>

        {/* Right: Rich Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '800px', boxShadow: 'var(--shadow-lg)', borderRadius: 24, background: 'white' }}>
          <RichTextEditor
            value={content}
            onChange={(newContent) => setContent(newContent)}
            height="100%"
            placeholder="Edit report content..."
          />
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
          <div style={{ marginBottom: '10mm' }}>
            {user?.letterheadHeaderUrl ? (
              <div style={{ textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '5mm', marginBottom: '10mm' }}>
                <img src={user.letterheadHeaderUrl} style={{ maxWidth: '100%', maxHeight: '40mm' }} alt="Header" />
              </div>
            ) : (
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
          </div>
        )}
        <div 
          style={{ fontSize: '12pt', lineHeight: 1.6, color: '#333' }} 
          dangerouslySetInnerHTML={{ __html: content }} 
        />
        {includeLetterhead && user?.letterheadFooterUrl && (
          <div style={{ marginTop: '20mm', borderTop: '1px solid #eee', paddingTop: '5mm', textAlign: 'center' }}>
            <img src={user.letterheadFooterUrl} style={{ maxWidth: '100%', maxHeight: '20mm' }} alt="Footer" />
          </div>
        )}
        <div style={{ marginTop: '10mm', fontSize: 10, color: '#999', textAlign: 'center' }}>
          This report was generated securely via Upward Property Management Portal.
        </div>
      </div>
      
      <style jsx>{`
        .glass {
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.02);
        }
        .form-input:focus {
          border-color: var(--clay) !important;
          outline: none;
        }
      `}</style>
    </div>
  )
}
