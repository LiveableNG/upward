import React, { useEffect, useMemo, useState } from 'react'
import { Editor } from '@hugerte/hugerte-react'
import { FileText, Plus, Save, Send, SquarePen, Trash2 } from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'
import type { BlogPost } from '@upward/shared-types'

interface BlogPostsProps {
  token: string
}

interface FormState {
  title: string
  slug: string
  excerpt: string
  contentHtml: string
  coverImageUrl: string
  authorName: string
}

const emptyForm: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  contentHtml: '',
  coverImageUrl: '',
  authorName: '',
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const BlogPosts: React.FC<BlogPostsProps> = ({ token }) => {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const selectedPost = useMemo(
    () => posts.find((post) => post.uuid === selectedUuid) ?? null,
    [posts, selectedUuid],
  )

  const fetchPosts = async () => {
    try {
      const result = await apiService.get('/admin/blog-posts', token)
      setPosts(result.data || [])
    } catch (error) {
      console.error(error)
      showToast('Failed to fetch blog posts', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [token])

  useEffect(() => {
    if (!selectedPost) return
    setForm({
      title: selectedPost.title || '',
      slug: selectedPost.slug || '',
      excerpt: selectedPost.excerpt || '',
      contentHtml: selectedPost.contentHtml || '',
      coverImageUrl: selectedPost.coverImageUrl || '',
      authorName: selectedPost.authorName || '',
    })
  }, [selectedPost])

  const resetEditor = () => {
    setSelectedUuid(null)
    setForm(emptyForm)
  }

  const onSave = async () => {
    if (!form.title.trim() || !form.slug.trim() || !form.excerpt.trim() || !form.contentHtml.trim()) {
      showToast('Title, slug, excerpt, and content are required', true)
      return
    }

    setSubmitting(true)
    const payload = {
      title: form.title.trim(),
      slug: slugify(form.slug),
      excerpt: form.excerpt.trim(),
      contentHtml: form.contentHtml,
      coverImageUrl: form.coverImageUrl.trim(),
      authorName: form.authorName.trim() || 'Upward Team',
    }

    try {
      if (selectedUuid) {
        await apiService.patch(`/admin/blog-posts/${selectedUuid}`, payload, token)
        showToast('Blog post updated')
      } else {
        await apiService.post('/admin/blog-posts', payload, token)
        showToast('Draft blog post created')
      }
      await fetchPosts()
      if (!selectedUuid) resetEditor()
    } catch (error: any) {
      console.error(error)
      const msg = error?.message
      if (Array.isArray(msg) && msg.length > 0) {
        showToast(msg[0], true)
      } else if (typeof msg === 'string') {
        showToast(msg, true)
      } else {
        showToast('Could not save blog post', true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const onPublishToggle = async (post: BlogPost) => {
    setSubmitting(true)
    try {
      if (post.status === 'PUBLISHED') {
        await apiService.patch(`/admin/blog-posts/${post.uuid}/unpublish`, {}, token)
        showToast('Blog post moved to draft')
      } else {
        await apiService.patch(`/admin/blog-posts/${post.uuid}/publish`, {}, token)
        showToast('Blog post published')
      }
      await fetchPosts()
    } catch (error) {
      console.error(error)
      showToast('Failed to update publish status', true)
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (uuid: string) => {
    const confirmed = window.confirm('Delete this blog post permanently?')
    if (!confirmed) return

    setSubmitting(true)
    try {
      await apiService.delete(`/admin/blog-posts/${uuid}`, token)
      if (selectedUuid === uuid) resetEditor()
      showToast('Blog post deleted')
      await fetchPosts()
    } catch (error) {
      console.error(error)
      showToast('Failed to delete blog post', true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container fade-in" style={{ maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>
            Blog Manager
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            Create, edit, and publish Upward blog content.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={resetEditor}>
          <Plus size={16} /> New post
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
            <strong style={{ fontSize: 14 }}>All posts</strong>
          </div>
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20, color: 'var(--text-muted)' }}>Loading posts...</div>
            ) : posts.length === 0 ? (
              <div style={{ padding: 20, color: 'var(--text-muted)' }}>No posts yet.</div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.uuid}
                  onClick={() => setSelectedUuid(post.uuid)}
                  style={{
                    padding: 14,
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    backgroundColor: selectedUuid === post.uuid ? 'var(--accent-faint)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <strong style={{ fontSize: 13 }}>{post.title}</strong>
                    <span className={`badge ${post.status === 'PUBLISHED' ? 'badge-success' : 'badge-warning'}`}>
                      {post.status}
                    </span>
                  </div>
                  <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>{post.slug}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: 11 }}
                      onClick={(event) => {
                        event.stopPropagation()
                        onPublishToggle(post)
                      }}
                      disabled={submitting}
                    >
                      <Send size={12} /> {post.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: 11, color: 'var(--danger)' }}
                      onClick={(event) => {
                        event.stopPropagation()
                        onDelete(post.uuid)
                      }}
                      disabled={submitting}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
            <input
              className="input"
              placeholder="Post title"
              value={form.title}
              onChange={(event) => {
                const value = event.target.value
                setForm((prev) => ({ ...prev, title: value, slug: prev.slug ? prev.slug : slugify(value) }))
              }}
            />
            <input
              className="input"
              placeholder="Slug"
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))}
            />
            <input
              className="input"
              placeholder="Author name"
              value={form.authorName}
              onChange={(event) => setForm((prev) => ({ ...prev, authorName: event.target.value }))}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="Cover image URL"
                value={form.coverImageUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, coverImageUrl: event.target.value }))}
              />
              <button
                className="btn btn-secondary"
                disabled={submitting}
                type="button"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = async (e: any) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setSubmitting(true)
                    try {
                      const reader = new FileReader()
                      reader.onload = async () => {
                        try {
                          const base64Data = (reader.result as string).split(',')[1]
                          const res = await apiService.post('/admin/blog-posts/upload-image', {
                            base64Data,
                            contentType: file.type,
                            originalName: file.name
                          }, token)
                          if (res.url) {
                            setForm(prev => ({ ...prev, coverImageUrl: res.url }))
                            showToast('Cover image uploaded successfully')
                          }
                        } catch (err: any) {
                          console.error(err)
                          showToast('Failed to upload image', true)
                        } finally {
                          setSubmitting(false)
                        }
                      }
                      reader.readAsDataURL(file)
                    } catch (err: any) {
                      console.error(err)
                      showToast('Failed to read file', true)
                      setSubmitting(false)
                    }
                  }
                  input.click()
                }}
              >
                Upload
              </button>
            </div>
          </div>
          <textarea
            className="input"
            rows={3}
            placeholder="Short excerpt (used in listing and SEO)"
            value={form.excerpt}
            onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
          />
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <Editor
              value={form.contentHtml}
              onEditorChange={(value) => setForm((prev) => ({ ...prev, contentHtml: value }))}
              init={{
                height: 420,
                menubar: false,
                plugins: ['advlist', 'autolink', 'lists', 'link', 'image', 'table', 'code', 'fullscreen'],
                toolbar:
                  'undo redo | blocks fontfamily fontsize | bold italic underline | forecolor backcolor | alignleft aligncenter alignright | bullist numlist | link customimage table | code fullscreen',
                branding: false,
                promotion: false,
                images_upload_handler: async (blobInfo: any) => {
                  try {
                    const base64Data = blobInfo.base64()
                    const file = blobInfo.blob()
                    const res = await apiService.post('/admin/blog-posts/upload-image', {
                      base64Data,
                      contentType: file.type,
                      originalName: blobInfo.filename()
                    }, token)
                    if (res.url) {
                      return res.url
                    }
                    throw new Error('Upload failed')
                  } catch (err: any) {
                    console.error(err)
                    throw new Error(err.message || 'Image upload failed')
                  }
                },
                file_picker_types: 'image',
                setup: (editor: any) => {
                  editor.ui.registry.addButton('customimage', {
                    icon: 'image',
                    tooltip: 'Insert Image',
                    onAction: () => {
                      const input = document.createElement('input')
                      input.setAttribute('type', 'file')
                      input.setAttribute('accept', 'image/*')
                      input.onchange = async (e: any) => {
                        const file = e.target.files[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = async () => {
                          try {
                            const base64Data = (reader.result as string).split(',')[1]
                            const res = await apiService.post('/admin/blog-posts/upload-image', {
                              base64Data,
                              contentType: file.type,
                              originalName: file.name
                            }, token)
                            if (res.url) {
                              editor.insertContent(`<img src="${res.url}" alt="${file.name}" style="max-width: 100%; height: auto;" />`)
                            }
                          } catch (err) {
                            console.error(err)
                            showToast('Failed to upload inline image', true)
                          }
                        }
                        reader.readAsDataURL(file)
                      }
                      input.click()
                    }
                  })
                }
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
              <FileText size={14} />
              {selectedUuid ? 'Editing existing post' : 'Creating a new draft'}
            </div>
            <button className="btn btn-primary" onClick={onSave} disabled={submitting}>
              {selectedUuid ? <SquarePen size={14} /> : <Save size={14} />}
              {selectedUuid ? 'Update post' : 'Save draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BlogPosts
