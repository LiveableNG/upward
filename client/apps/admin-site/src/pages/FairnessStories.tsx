import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  User,
  Search,
  Clock,
  Music,
  FileText,
  Paperclip,
  ChevronRight,
  Download,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import type { FairnessStory } from '@upward/shared-types'

interface FairnessStoriesProps {
  token: string
}

const FairnessStories: React.FC<FairnessStoriesProps> = ({ token }) => {
  const [stories, setStories] = useState<FairnessStory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedStory, setSelectedStory] = useState<FairnessStory | null>(null)

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const res = await apiService.get('/fairness-story', token)
        setStories(res)
      } catch (err) {
        console.error('Failed to fetch stories', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStories()
  }, [token])

  const filteredStories = stories.filter(
    (s: FairnessStory) =>
      (s.name || 'Anonymous').toLowerCase().includes(search.toLowerCase()) ||
      s.story.toLowerCase().includes(search.toLowerCase()) ||
      s.categories.some((c: string) => c.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="page-container fade-in">
      <div
        className="page-header"
        style={{
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'var(--accent-faint)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Fairness Stories
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              Review submitted experiences regarding housing discrimination.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedStory ? '1fr 1fr' : '1fr',
          gap: '32px',
          transition: 'all 0.3s',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ position: 'relative' }}>
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
                placeholder="Search by name, story content, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 42px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {loading ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <div className="loader" style={{ margin: '0 auto' }}></div>
              <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Loading stories...</p>
            </div>
          ) : filteredStories.length === 0 ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <FileText size={48} style={{ color: 'var(--border)', marginBottom: '16px' }} />
              <p style={{ color: 'var(--text-muted)' }}>No stories found matching your criteria.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredStories.map((story) => (
                <div
                  key={story.id}
                  className={`card story-item ${selectedStory?.id === story.id ? 'active' : ''}`}
                  onClick={() => setSelectedStory(story)}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderLeft:
                      selectedStory?.id === story.id
                        ? '4px solid var(--accent)'
                        : '1px solid var(--border)',
                    padding: '20px',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={16} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontWeight: 700, fontSize: '15px' }}>
                        {story.name || 'Anonymous'}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                      }}
                    >
                      <Clock size={14} />
                      {new Date(story.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}
                  >
                    {story.categories.map((cat: string) => (
                      <span
                        key={cat}
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'var(--surface-hover)',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>

                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--text)',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {story.story}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      marginTop: '16px',
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {story.audioUrl && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Music size={14} /> Audio attached
                      </div>
                    )}
                    {story.fileUrls.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Paperclip size={14} /> {story.fileUrls.length} file
                        {story.fileUrls.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedStory && (
          <div
            className="card fade-in detail-card"
            style={{
              position: 'sticky',
              top: '20px',
              height: 'calc(100vh - 100px)',
              overflowY: 'auto',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <button
              onClick={() => setSelectedStory(null)}
              className="close-btn"
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: 'var(--surface-hover)',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronRight size={20} />
            </button>

            <div style={{ marginBottom: '32px' }}>
              <div
                style={{ display: 'flex', alignItems: 'start', gap: '16px', marginBottom: '16px' }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'var(--accent)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '24px',
                    flexShrink: 0,
                    boxShadow: '0 8px 16px rgba(217, 119, 87, 0.2)',
                  }}
                >
                  {selectedStory.name ? selectedStory.name[0].toUpperCase() : 'A'}
                </div>
                <div>
                  <h2
                    style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}
                  >
                    {selectedStory.name || 'Anonymous Story'}
                  </h2>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      marginTop: '4px',
                    }}
                  >
                    <Clock size={14} />
                    Submitted on {new Date(selectedStory.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedStory.categories.map((cat: string) => (
                  <span
                    key={cat}
                    style={{
                      fontSize: '12px',
                      padding: '6px 14px',
                      borderRadius: '100px',
                      background: 'var(--accent-faint)',
                      color: 'var(--accent)',
                      fontWeight: 700,
                      border: '1px solid rgba(217, 119, 87, 0.1)',
                    }}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '40px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <h4
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    margin: 0,
                  }}
                >
                  <FileText
                    size={14}
                    style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}
                  />
                  Full Narrative
                </h4>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedStory.story)
                    alert('Story copied to clipboard!')
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Copy Text
                </button>
              </div>
              <div
                style={{
                  padding: '24px',
                  background: 'var(--surface)',
                  borderRadius: '20px',
                  fontSize: '16px',
                  lineHeight: 1.8,
                  color: 'var(--text)',
                  whiteSpace: 'pre-wrap',
                  border: '1px solid var(--border)',
                  position: 'relative',
                }}
              >
                {selectedStory.story}
              </div>
            </div>

            {(selectedStory.audioUrl || selectedStory.fileUrls.length > 0) && (
              <div style={{ marginTop: 'auto' }}>
                <h4
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    marginBottom: '16px',
                    letterSpacing: '0.1em',
                  }}
                >
                  <Paperclip
                    size={14}
                    style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}
                  />
                  Media & Attachments
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedStory.audioUrl && (
                    <div
                      className="audio-player-card"
                      style={{
                        padding: '20px',
                        background: 'linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)',
                        borderRadius: '20px',
                        border: '1px solid rgba(217, 119, 87, 0.2)',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: 'var(--accent)',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Music size={18} />
                          </div>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: '#4a3f35' }}>
                            Voice Record
                          </span>
                        </div>
                        <a
                          href={selectedStory.audioUrl}
                          download={`story_audio_${selectedStory.id}.mp3`}
                          className="download-btn-mini"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--accent)',
                            textDecoration: 'none',
                            padding: '6px 12px',
                            background: 'white',
                            borderRadius: '8px',
                            border: '1px solid rgba(217, 119, 87, 0.2)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          }}
                        >
                          <Download size={14} /> Download
                        </a>
                      </div>
                      <audio controls style={{ width: '100%', height: '40px' }}>
                        <source src={selectedStory.audioUrl} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    {selectedStory.fileUrls.map((url: string, idx: number) => (
                      <a
                        key={idx}
                        href={url}
                        download={`attachment_${idx + 1}`}
                        className="attachment-link"
                        style={{
                          padding: '16px',
                          background: 'var(--white)',
                          borderRadius: '16px',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          textDecoration: 'none',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            color: 'var(--text)',
                          }}
                        >
                          <Paperclip size={18} style={{ color: 'var(--accent)' }} />
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>File {idx + 1}</span>
                        </div>
                        <Download size={14} style={{ color: 'var(--text-muted)' }} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .story-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border-color: var(--accent);
        }
        .story-item.active {
          background: var(--accent-faint);
        }
        .attachment-link:hover {
          border-color: var(--accent) !important;
          background: var(--accent-faint) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .detail-card::-webkit-scrollbar {
          width: 6px;
        }
        .detail-card::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 10px;
        }
        .loader {
          border: 3px solid var(--border);
          border-top: 3px solid var(--accent);
          border-radius: 50%;
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default FairnessStories
