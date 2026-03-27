'use client'

import React, { useState, useRef } from 'react'
import { showToast } from '@upward/client-core'

interface FileRequestData {
  filename: string
  contentType: string
  isAudio: boolean
}

interface S3UploadUrl {
  filename: string
  key: string
  uploadUrl: string
  isAudio: boolean
}

export function StoryForm() {
  const [formData, setFormData] = useState({
    name: '',
    categories: [] as string[],
    otherCategory: '',
    story: '',
  })
  const [files, setFiles] = useState<File[]>([])
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = ['Religious', 'Gender', 'Marital Status', 'Tribal']

  const handleCategoryChange = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const incomingFiles = Array.from(e.target.files)

      const allowedDocTypes = [
        'image/',
        'application/pdf',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.ms-excel',
      ]

      const newAudioFiles: File[] = []
      const newDocFiles: File[] = []

      incomingFiles.forEach((file) => {
        if (file.type.startsWith('audio/')) {
          newAudioFiles.push(file)
        } else if (
          allowedDocTypes.some((type) => file.type.startsWith(type)) ||
          /\.(docx|xlsx|pdf|txt|png|jpg|jpeg)$/i.test(file.name)
        ) {
          newDocFiles.push(file)
        }
      })

      // Validation logic: Combined 10MB total
      const upcomingDocs = [...files, ...newDocFiles].slice(0, 4)
      const upcomingAudio =
        newAudioFiles.length > 0 ? newAudioFiles[newAudioFiles.length - 1] : audioFile

      const totalSize =
        upcomingDocs.reduce((acc, f) => acc + f.size, 0) + (upcomingAudio?.size || 0)

      if (totalSize > 5 * 1024 * 1024) {
        showToast('Total size of all attachments must not exceed 5MB.', true)
        return
      }

      if (files.length + newDocFiles.length > 4) {
        showToast('Maximum of 4 supporting documents allowed.', true)
      }

      setFiles(upcomingDocs)
      if (upcomingAudio) setAudioFile(upcomingAudio)
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeAudio = () => {
    setAudioFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.categories.length === 0) {
      showToast('Please select at least one category.', true)
      return
    }

    if (!formData.story.trim()) {
      showToast('Please share your story before submitting.', true)
      return
    }

    setIsSubmitting(true)
    const API_URL = process.env['NEXT_PUBLIC_API_URL'] || ''

    try {
      const fileRequestData: FileRequestData[] = []
      if (audioFile) {
        fileRequestData.push({
          filename: audioFile.name,
          contentType: audioFile.type,
          isAudio: true,
        })
      }
      files.forEach((f) => {
        fileRequestData.push({
          filename: f.name,
          contentType: f.type,
          isAudio: false,
        })
      })

      let s3AudioUrl: string | undefined = undefined
      const s3FileUrls: string[] = []

      if (fileRequestData.length > 0) {
        const urlResp = await fetch(`${API_URL}/fairness-story/upload-urls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: fileRequestData }),
        })

        if (!urlResp.ok) throw new Error('Failed to get upload permissions')
        const { urls } = (await urlResp.json()) as { urls: S3UploadUrl[] }

        // Upload in parallel
        await Promise.all(
          urls.map(async (u: S3UploadUrl) => {
            const fileToUpload = u.isAudio ? audioFile : files.find((f) => f.name === u.filename)

            if (!fileToUpload) return

            const uploadRes = await fetch(u.uploadUrl, {
              method: 'PUT',
              body: fileToUpload,
              headers: { 'Content-Type': fileToUpload.type },
            })

            if (!uploadRes.ok) throw new Error(`Upload failed for ${u.filename}`)

            if (u.isAudio) s3AudioUrl = u.key
            else s3FileUrls.push(u.key)
          }),
        )
      }

      // 3. Send final metadata to our API
      const processedCategories = formData.categories.includes('Other')
        ? [...formData.categories.filter((c) => c !== 'Other'), formData.otherCategory].filter(
            Boolean,
          )
        : formData.categories

      const finalPayload = {
        name: formData.name,
        story: formData.story,
        categories: processedCategories,
        audioUrl: s3AudioUrl,
        fileUrls: s3FileUrls,
      }

      const response = await fetch(`${API_URL}/fairness-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to submit story')
      }

      setSubmitted(true)
    } catch (error) {
      console.error('Submission failed:', error)
      showToast('Failed to submit. Check your connection or file sizes.', true)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div
        style={{
          padding: '60px 40px',
          textAlign: 'center',
          background: 'var(--surface2)',
          borderRadius: '32px',
          border: '1px solid var(--accent-muted)',
          maxWidth: '800px',
          margin: '40px auto',
          animation: 'fadeUp 0.8s ease both',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            background: 'var(--accent-faint)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            color: 'var(--accent)',
            fontSize: '32px',
          }}
        >
          ✓
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-head)',
            fontWeight: 800,
            fontSize: '28px',
            marginBottom: '16px',
          }}
        >
          Thank you for sharing your story.
        </h2>
        <p
          style={{ color: 'var(--muted)', fontSize: '18px', lineHeight: 1.6, marginBottom: '32px' }}
        >
          Your voice helps us build a fairer housing system for everyone. We will review your
          submission and use it to drive change.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          style={{
            background: 'var(--accent)',
            color: 'var(--btn-text)',
            padding: '16px 32px',
            borderRadius: '100px',
            border: 'none',
            fontFamily: 'var(--font-head)',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          Share Another Story
        </button>
      </div>
    )
  }

  return (
    <div
      id="story-form"
      style={{
        padding: '60px 0',
        maxWidth: '800px',
        margin: '0 auto',
        animation: 'fadeUp 0.8s ease both',
      }}
    >
      <div
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: '32px',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '4px',
            background: 'var(--heading-mix)',
          }}
        />

        <div style={{ marginBottom: '32px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: '32px',
              marginBottom: '12px',
            }}
          >
            Submit Your Story
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '16px' }}>
            Your identity is protected. We only use these stories to challenge bias.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '40px' }}>
            <label
              className="section-label"
              style={{
                marginBottom: '16px',
              }}
            >
              Name or Nickname (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Joy from Lagos"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '16px 20px',
                color: 'var(--text)',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s ease',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          <div style={{ marginBottom: '40px' }}>
            <label
              className="section-label"
              style={{
                marginBottom: '20px',
              }}
            >
              Discrimination Category (multiple selection)
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              {[...categories, 'Other'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: formData.categories.includes(cat) ? 'var(--accent)' : 'var(--bg)',
                    border: '1px solid',
                    borderColor: formData.categories.includes(cat)
                      ? 'var(--accent)'
                      : 'var(--border)',
                    color: formData.categories.includes(cat) ? 'var(--btn-text)' : 'var(--text)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: formData.categories.includes(cat)
                        ? 'var(--btn-text)'
                        : 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                    }}
                  >
                    {formData.categories.includes(cat) && '✓'}
                  </div>
                  {cat}
                </button>
              ))}
            </div>

            {formData.categories.includes('Other') && (
              <input
                type="text"
                placeholder="Please specify..."
                value={formData.otherCategory}
                onChange={(e) => setFormData({ ...formData, otherCategory: e.target.value })}
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                  animation: 'fadeIn 0.3s ease',
                }}
              />
            )}
          </div>

          <div style={{ marginBottom: '40px' }}>
            <label
              className="section-label"
              style={{
                marginBottom: '16px',
              }}
            >
              Your story (text)
            </label>
            <textarea
              required
              placeholder="Tell us what happened..."
              value={formData.story}
              onChange={(e) => setFormData({ ...formData, story: e.target.value })}
              style={{
                width: '100%',
                minHeight: '200px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '16px 20px',
                color: 'var(--text)',
                fontSize: '16px',
                outline: 'none',
                resize: 'vertical',
                transition: 'all 0.3s ease',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          <div style={{ marginBottom: '40px' }}>
            <label
              className="section-label"
              style={{
                marginBottom: '16px',
              }}
            >
              Evidence & Attachments (Optional)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'var(--bg)',
                border: '2px dashed var(--border)',
                borderRadius: '24px',
                padding: '40px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept="audio/*,image/*,.pdf,.docx,.xlsx,.xls,.txt"
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📎</div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  marginBottom: '4px',
                }}
              >
                Upload Audio & Documents
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--muted)',
                  maxWidth: '400px',
                  margin: '0 auto',
                }}
              >
                Images, PDFs, Docs, or Voice Records.
                <br /> Max 5MB total (1 Audio + 4 Docs allowed).
              </div>
            </div>
          </div>

          {(files.length > 0 || audioFile) && (
            <div
              style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              {audioFile && (
                <div
                  style={{
                    background: 'rgba(20, 184, 166, 0.05)', // Soothing Teal
                    border: '1px solid rgba(20, 184, 166, 0.15)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    animation: 'fadeIn 0.3s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>🎵</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: '#0d9488', // Deep Teal
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {audioFile.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#0d9488', opacity: 0.8 }}>
                        Audio Recording • {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeAudio}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0d9488',
                      cursor: 'pointer',
                      fontSize: '20px',
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
              {files.map((file, index) => (
                <div
                  key={index}
                  style={{
                    background: 'rgba(71, 85, 105, 0.04)', // Soothing Slate
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    animation: 'fadeIn 0.3s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>📄</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {file.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      fontSize: '20px',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              background: 'var(--accent)',
              color: 'var(--btn-text)',
              padding: '20px',
              borderRadius: '100px',
              border: 'none',
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: '16px',
              letterSpacing: '0.05em',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 10px 30px rgba(217, 119, 87, 0.3)',
              opacity: isSubmitting ? 0.7 : 1,
              marginTop: '12px',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(217, 119, 87, 0.45)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = ''
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(217, 119, 87, 0.3)'
            }}
          >
            {isSubmitting ? 'Submitting Story...' : 'Submit My Story'}
          </button>
        </form>
      </div>
    </div>
  )
}
