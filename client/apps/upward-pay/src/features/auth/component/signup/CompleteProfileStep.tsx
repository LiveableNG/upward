'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Briefcase, Users, ArrowRight, SkipForward, Phone } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { completeProfile } from '@/features/auth/services/authService'
import { useAuth } from '@/features/auth/AuthContext'

export function CompleteProfileStep() {
  const router = useRouter()
  const { user, login: updateAuthUser } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [occupation, setOccupation] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')
  const [profilePic, setProfilePic] = useState('') // Placeholder for now

  const genders = ['Male', 'Female', 'Other', 'Prefer not to say']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await completeProfile({
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        occupation,
        gender,
        phone,
        profilePic,
      })
      
      updateAuthUser(response.user)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.push('/dashboard')
  }

  return (
    <div className="auth-shell auth-shell--complete">
      <div className="auth-shell__brand">
        <UpwardLogo size={28} color="var(--clay)" />
      </div>

      <div className="auth-stage">
        <div className="auth-stage__header">
          <h1 className="auth-stage__title">Perfect! One last thing…</h1>
          <p className="auth-stage__subtitle">
            Complete your profile to unlock all features and better credibility scoring.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-form__error">{error}</div>}

          <div className="profile-pic-uploader">
            <div className="profile-pic-preview">
              {profilePic ? (
                <img src={profilePic} alt="Profile" />
              ) : (
                <Camera size={24} color="var(--text-muted)" />
              )}
            </div>
            <button type="button" className="btn btn--ghost btn--sm">
              Change Photo
            </button>
          </div>

          <div className="auth-form__field mt-6">
            <label htmlFor="phone">Phone Number</label>
            <div className="input-with-icon">
              <Phone size={17} />
              <input
                id="phone"
                type="tel"
                placeholder="+234 800 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-form__field mt-4">
            <label htmlFor="occupation">Occupation</label>
            <div className="input-with-icon">
              <Briefcase size={17} />
              <input
                id="occupation"
                type="text"
                placeholder="e.g. Software Engineer"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-form__field mt-4">
            <label htmlFor="gender">Gender</label>
            <div className="input-with-icon">
              <Users size={17} />
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="auth-form__select"
              >
                <option value="">Select Gender</option>
                {genders.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="auth-actions mt-8">
            <button
              type="submit"
              className="btn btn--primary btn--full btn--pay"
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Finish Setup'} <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className="auth-form__link mt-4"
              onClick={handleSkip}
              disabled={loading}
            >
              Skip for now <SkipForward size={14} />
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .profile-pic-uploader {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .profile-pic-preview {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--surface2);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 2px solid var(--border);
        }
        .profile-pic-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .auth-form__select {
          flex: 1;
          background: none;
          border: none;
          padding: 14px 12px;
          font-size: 15px;
          font-family: var(--font);
          color: var(--text);
          outline: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
