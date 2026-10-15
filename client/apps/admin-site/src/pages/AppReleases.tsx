import React, { useState, useEffect } from 'react'
import {
  Smartphone,
  Apple,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface VersionPolicy {
  id: number
  uuid: string
  app: string
  platform: 'ios' | 'android'
  minSupportedVersion: string
  latestVersion: string
  minBuildNumber: number
  latestBuildNumber: number
  forceUpdate: boolean
  maintenanceMode: boolean
  gatedFeatures: string[]
  title: string | null
  message: string | null
  releaseNotes: string[] | null
  storeUrl: string | null
  isActive: boolean
  updatedAt: string
}

interface AppReleasesProps {
  token: string
}

export const AppReleases: React.FC<AppReleasesProps> = ({ token }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<'ios' | 'android'>('ios')
  const [policies, setPolicies] = useState<Record<string, VersionPolicy>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Current active form state
  const [formData, setFormData] = useState<Partial<VersionPolicy>>({
    minSupportedVersion: '1.0.0',
    latestVersion: '1.1.2',
    minBuildNumber: 1,
    latestBuildNumber: 11,
    forceUpdate: false,
    maintenanceMode: false,
    gatedFeatures: [],
    title: '',
    message: '',
    releaseNotes: [],
    storeUrl: '',
  })

  const [newNoteInput, setNewNoteInput] = useState('')

  useEffect(() => {
    fetchPolicies()
  }, [token])

  useEffect(() => {
    const current = policies[selectedPlatform]
    if (current) {
      setFormData({
        minSupportedVersion: current.minSupportedVersion || '1.0.0',
        latestVersion: current.latestVersion || '1.1.2',
        minBuildNumber: current.minBuildNumber || 1,
        latestBuildNumber: current.latestBuildNumber || 1,
        forceUpdate: !!current.forceUpdate,
        maintenanceMode: !!current.maintenanceMode,
        gatedFeatures: current.gatedFeatures || [],
        title: current.title || '',
        message: current.message || '',
        releaseNotes: current.releaseNotes || [],
        storeUrl: current.storeUrl || '',
      })
    }
  }, [selectedPlatform, policies])

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      const res = await apiService.get('/admin/app-version-policies', token)
      if (res.data) {
        const map: Record<string, VersionPolicy> = {}
        res.data.forEach((p: VersionPolicy) => {
          map[p.platform] = p
        })
        setPolicies(map)
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch version policies', true)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const payload = {
        app: 'upward-pay',
        platform: selectedPlatform,
        ...formData,
      }

      await apiService.put(`/admin/app-version-policies/${selectedPlatform}`, payload, token)
      showToast(`${selectedPlatform.toUpperCase()} version policy updated successfully!`)
      fetchPolicies()
    } catch (err: any) {
      showToast(err.message || 'Failed to update policy', true)
    } finally {
      setSaving(false)
    }
  }

  const handleQuickToggle = async (key: 'forceUpdate' | 'maintenanceMode', currentValue: boolean) => {
    try {
      const newValue = !currentValue
      setFormData((prev) => ({ ...prev, [key]: newValue }))

      await apiService.patch(
        `/admin/app-version-policies/${selectedPlatform}/toggle`,
        {
          app: 'upward-pay',
          [key]: newValue,
        },
        token,
      )

      showToast(
        `${key === 'forceUpdate' ? 'Force Update' : 'Maintenance Mode'} ${newValue ? 'ENABLED' : 'DISABLED'} for ${selectedPlatform.toUpperCase()}`,
      )
      fetchPolicies()
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle status', true)
    }
  }

  const toggleGatedFeature = (feature: string) => {
    setFormData((prev) => {
      const current = prev.gatedFeatures || []
      const exists = current.includes(feature)
      return {
        ...prev,
        gatedFeatures: exists ? current.filter((f) => f !== feature) : [...current, feature],
      }
    })
  }

  const addReleaseNote = () => {
    if (!newNoteInput.trim()) return
    setFormData((prev) => ({
      ...prev,
      releaseNotes: [...(prev.releaseNotes || []), newNoteInput.trim()],
    }))
    setNewNoteInput('')
  }

  const removeReleaseNote = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      releaseNotes: (prev.releaseNotes || []).filter((_, i) => i !== index),
    }))
  }

  const storeBadge =
    selectedPlatform === 'ios'
      ? {
          name: 'Apple App Store',
          id: 'ID 6807898152',
          url: 'https://apps.apple.com/us/app/upwardpay/id6807898152',
        }
      : {
          name: 'Google Play Store',
          id: 'com.goodtenants.upward',
          url: 'https://play.google.com/store/apps/details?id=com.goodtenants.upward&hl=en',
        }

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '40px', textAlign: 'center' }}>
        <RefreshCw className="animate-spin" size={28} style={{ color: 'var(--accent)' }} />
        <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Loading version policies...</p>
      </div>
    )
  }

  return (
    <div className="page-container fade-in" style={{ paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Smartphone size={26} style={{ color: 'var(--accent)' }} />
          <h2 className="section-title" style={{ margin: 0 }}>
            App Releases & Version Gating
          </h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
          Manage in-app update prompts, emergency force-update locks, and feature gating independently for iOS and Android.
        </p>
      </div>

      {/* Platform Switcher Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px',
        }}
      >
        <button
          onClick={() => setSelectedPlatform('ios')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            border: selectedPlatform === 'ios' ? '2px solid var(--accent)' : '1px solid var(--border)',
            backgroundColor: selectedPlatform === 'ios' ? 'var(--accent-faint)' : 'var(--surface)',
            color: selectedPlatform === 'ios' ? 'var(--accent)' : 'var(--text)',
            transition: 'all 0.15s ease',
          }}
        >
          <Apple size={18} />
          <span>iOS App (App Store)</span>
          {policies['ios']?.forceUpdate && (
            <span
              style={{
                background: '#ef4444',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '6px',
                fontSize: '10px',
              }}
            >
              LOCKED
            </span>
          )}
        </button>

        <button
          onClick={() => setSelectedPlatform('android')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            border: selectedPlatform === 'android' ? '2px solid var(--accent)' : '1px solid var(--border)',
            backgroundColor: selectedPlatform === 'android' ? 'var(--accent-faint)' : 'var(--surface)',
            color: selectedPlatform === 'android' ? 'var(--accent)' : 'var(--text)',
            transition: 'all 0.15s ease',
          }}
        >
          <Smartphone size={18} />
          <span>Android App (Google Play)</span>
          {policies['android']?.forceUpdate && (
            <span
              style={{
                background: '#ef4444',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '6px',
                fontSize: '10px',
              }}
            >
              LOCKED
            </span>
          )}
        </button>
      </div>

      {/* Main Grid: Form Left, Preview Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '24px' }}>
        {/* Controls Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status & Store Identification Card */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>STORE IDENTIFIER</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{storeBadge.name}</h4>
                  <span
                    style={{
                      background: 'var(--surface-hover)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {storeBadge.id}
                  </span>
                </div>
              </div>
              <a
                href={storeBadge.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--accent)',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <span>View Store Page</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* Emergency Switches */}
          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Emergency Gating Controls</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Force Update Switch */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: formData.forceUpdate ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-hover)',
                  border: formData.forceUpdate ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={16} color={formData.forceUpdate ? '#ef4444' : 'var(--text-muted)'} />
                    <strong style={{ fontSize: '14px' }}>Global Force Update (Hard Lockout)</strong>
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Forces all active apps to update immediately before allowing login or navigation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickToggle('forceUpdate', !!formData.forceUpdate)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: formData.forceUpdate ? '#ef4444' : 'var(--border)',
                    color: formData.forceUpdate ? '#ffffff' : 'var(--text)',
                  }}
                >
                  {formData.forceUpdate ? 'ACTIVE (LOCKED)' : 'OFF'}
                </button>
              </div>

              {/* Maintenance Mode Switch */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: formData.maintenanceMode ? 'rgba(245, 158, 11, 0.1)' : 'var(--surface-hover)',
                  border: formData.maintenanceMode ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} color={formData.maintenanceMode ? '#f59e0b' : 'var(--text-muted)'} />
                    <strong style={{ fontSize: '14px' }}>Scheduled Maintenance Shield</strong>
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Displays a friendly maintenance screen during backend infrastructure migrations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickToggle('maintenanceMode', !!formData.maintenanceMode)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: formData.maintenanceMode ? '#f59e0b' : 'var(--border)',
                    color: formData.maintenanceMode ? '#ffffff' : 'var(--text)',
                  }}
                >
                  {formData.maintenanceMode ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* Version Thresholds */}
          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Version Constraints & Semver</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block' }}>
                  Minimum Supported Version
                </label>
                <input
                  type="text"
                  value={formData.minSupportedVersion || ''}
                  onChange={(e) => setFormData({ ...formData, minSupportedVersion: e.target.value })}
                  placeholder="e.g. 1.0.0"
                  className="input-field"
                  style={{ width: '100%', marginTop: '6px' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Versions older than this get hard-locked.
                </span>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block' }}>
                  Latest Store Version
                </label>
                <input
                  type="text"
                  value={formData.latestVersion || ''}
                  onChange={(e) => setFormData({ ...formData, latestVersion: e.target.value })}
                  placeholder="e.g. 1.2.0"
                  className="input-field"
                  style={{ width: '100%', marginTop: '6px' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Versions between Min & Latest get soft alert.
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block' }}>
                  Minimum Build Number
                </label>
                <input
                  type="number"
                  value={formData.minBuildNumber ?? 1}
                  onChange={(e) => setFormData({ ...formData, minBuildNumber: parseInt(e.target.value, 10) || 1 })}
                  className="input-field"
                  style={{ width: '100%', marginTop: '6px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block' }}>
                  Latest Build Number
                </label>
                <input
                  type="number"
                  value={formData.latestBuildNumber ?? 11}
                  onChange={(e) => setFormData({ ...formData, latestBuildNumber: parseInt(e.target.value, 10) || 1 })}
                  className="input-field"
                  style={{ width: '100%', marginTop: '6px' }}
                />
              </div>
            </div>
          </div>

          {/* Feature Gating Matrix */}
          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Feature-Level Gating</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
              Allow users to use the rest of the app, but lock out specific sensitive flows until they update.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'var(--surface-hover)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={(formData.gatedFeatures || []).includes('PAYMENTS')}
                  onChange={() => toggleGatedFeature('PAYMENTS')}
                />
                <div>
                  <strong style={{ fontSize: '13px' }}>Rent Payments & Checkout</strong>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Gate access to /pay and checkout APIs for clients below Latest Version
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'var(--surface-hover)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={(formData.gatedFeatures || []).includes('WALLET_DEPOSIT')}
                  onChange={() => toggleGatedFeature('WALLET_DEPOSIT')}
                />
                <div>
                  <strong style={{ fontSize: '13px' }}>Wallet Deposits & Top-ups</strong>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Require latest version for bank transfers & card top-ups
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Release Notes & Announcement Text */}
          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Modal Content & Release Notes</h4>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Custom Dialog Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. A New Upward Pay is Ready"
                className="input-field"
                style={{ width: '100%', marginTop: '6px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Dialog Message</label>
              <textarea
                value={formData.message || ''}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Explanatory message for your tenants..."
                className="input-field"
                rows={3}
                style={{ width: '100%', marginTop: '6px' }}
              />
            </div>

            {/* Release Notes Bullets */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Changelog Bullet Points
              </label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addReleaseNote()
                    }
                  }}
                  placeholder="e.g. Instant rent receipt generation"
                  className="input-field"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={addReleaseNote}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(formData.releaseNotes || []).map((note, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--surface-hover)',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <span>{note}</span>
                    <button
                      type="button"
                      onClick={() => removeReleaseNote(index)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '14px 24px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <Save size={18} />
            <span>{saving ? 'Saving Changes...' : `Save ${selectedPlatform.toUpperCase()} Policy`}</span>
          </button>
        </div>

        {/* Live Preview Column */}
        <div>
          <div style={{ position: 'sticky', top: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <Sparkles size={16} style={{ color: 'var(--accent)' }} />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Mobile Tenant Live Preview</h4>
            </div>

            {/* Mock Phone Frame */}
            <div
              style={{
                width: '100%',
                maxWidth: '360px',
                margin: '0 auto',
                borderRadius: '32px',
                border: '10px solid #18181b',
                background: '#09090b',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                overflow: 'hidden',
                position: 'relative',
                minHeight: '520px',
                padding: '24px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#fff',
                textAlign: 'center',
              }}
            >
              {/* Camera Notch */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  width: '90px',
                  height: '18px',
                  backgroundColor: '#18181b',
                  borderRadius: '10px',
                }}
              />

              {/* Modal Card inside Mobile */}
              <div
                style={{
                  width: '100%',
                  background: '#1c1917',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  padding: '24px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #d97736, #ea580c)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <Smartphone size={24} color="#fff" />
                </div>

                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#d97736',
                    letterSpacing: '0.05em',
                    marginBottom: '6px',
                  }}
                >
                  {formData.forceUpdate ? 'UPDATE REQUIRED' : 'UPDATE AVAILABLE'} · v{formData.latestVersion}
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px 0', color: '#fff' }}>
                  {formData.title || (formData.forceUpdate ? 'Update Required' : 'A New Upward Pay is Ready')}
                </h3>

                <p style={{ fontSize: '11px', color: '#a8a29e', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                  {formData.message ||
                    'Please update your app to access the latest features, security fixes, and rent checkout improvements.'}
                </p>

                {/* Bullets Preview */}
                <div
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    padding: '10px',
                    textAlign: 'left',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ fontSize: '9px', fontWeight: 700, color: '#78716c', marginBottom: '6px' }}>
                    WHAT'S NEW
                  </div>
                  {(formData.releaseNotes && formData.releaseNotes.length > 0
                    ? formData.releaseNotes
                    : ['Faster rent checkout', 'Instant receipt downloads']
                  ).map((bullet, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        color: '#e7e5e4',
                        marginBottom: '4px',
                      }}
                    >
                      <CheckCircle2 size={12} color="#d97736" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>

                {/* Button Preview */}
                <button
                  type="button"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #d97736, #ea580c)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  Update Upward Pay
                </button>

                {!formData.forceUpdate && (
                  <div style={{ fontSize: '11px', color: '#78716c', marginTop: '8px' }}>Later (Snooze 24h)</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AppReleases
