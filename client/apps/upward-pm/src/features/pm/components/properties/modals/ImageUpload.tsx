import React, { useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface ImageUploadProps {
  label: string;
  value?: string;
  onChange: (file: File | null) => void;
  onClear?: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ label, value, onChange, onClear }) => {
  const [preview, setPreview] = useState<string | null>(value || null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      onChange(file)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPreview(null)
    onChange(null)
    if (onClear) onClear()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div 
        className={`upload-zone ${isDragging ? 'upload-zone--dragging' : ''} ${preview ? 'upload-zone--has-preview' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        style={{
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          position: 'relative',
          background: isDragging ? 'var(--bg-muted)' : 'transparent',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          overflow: 'hidden'
        }}
      >
        {preview ? (
          <>
            <img 
              src={preview} 
              alt="Preview" 
              style={{ 
                position: 'absolute', 
                inset: 0, 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                opacity: 0.8
              }} 
            />
            <div style={{ 
              position: 'relative', 
              zIndex: 1, 
              background: 'rgba(0,0,0,0.5)', 
              color: 'white', 
              padding: '4px 8px', 
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px'
            }}>
              Click or drag to replace
            </div>
            <button 
              onClick={clear}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                zIndex: 2,
                background: 'var(--error)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <div style={{ color: 'var(--text-muted)' }}>
              <Upload size={24} />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>
              Click to upload or drag and drop
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              PNG, JPG, GIF up to 5MB
            </div>
          </>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={onFileChange} 
        />
      </div>
    </div>
  )
}
