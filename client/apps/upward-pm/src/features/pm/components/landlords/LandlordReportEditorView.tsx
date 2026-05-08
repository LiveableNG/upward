
'use client'

import React, { useState } from 'react'
import { 
  ChevronLeft, 
  CheckCircle2, 
  Circle, 
  Download
} from 'lucide-react'
import { RichTextEditor } from '@/components/common/RichTextEditor'

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
  const [content, setContent] = useState(initialContent)
  const [includeLetterhead, setIncludeLetterhead] = useState(true)
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

  return (
    <div className="report-editor animate-fade-in">
      <header style={{ marginBottom: 32 }}>
        <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
          <ChevronLeft size={18} /> Back to Configuration
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)' }}>Send Landlord Report</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 40, alignItems: 'start' }}>
        
        {/* Left: Configuration Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border)', background: 'white' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 20 }}>Document Options</h3>
            
            <div 
              onClick={() => setIncludeLetterhead(!includeLetterhead)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            >
              <div style={{ color: includeLetterhead ? 'var(--forest)' : 'var(--border)' }}>
                {includeLetterhead ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Include letterhead</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button 
              className="btn btn--primary" 
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              style={{ width: '100%', borderRadius: 100, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, fontSize: 15 }}
            >
              <Download size={20} /> {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Report'}
            </button>
            <button 
              className="btn btn--secondary" 
              onClick={onDone}
              style={{ width: '100%', borderRadius: 100, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              Done / Return
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '0 20px' }}>
              Finalize your edits and download the report as a PDF to share with the landlord.
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
