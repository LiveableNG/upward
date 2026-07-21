'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { 
  Mail, 
  Lock, 
  ChevronLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Building,
  User,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Key,
  AlertCircle,
  Fingerprint
} from 'lucide-react'
import { UpwardLogo } from '@/components/common/UpwardLogo'
import { useLogin } from '../hooks/useLogin'
import { useRequestOTP as usePmRequestOTP, useOtpLogin as usePmOtpLogin } from '../hooks/useOtp'
import { landlordLogin, landlordRequestOTP, checkLandlordExistence } from '@/features/auth/services/landlordAuthService'
import { Capacitor } from '@capacitor/core'
import { useToast } from '@/components/common/Toast'
import { BiometricsService } from '../services/biometricsService'
import '@/styles/auth.css'
import '@/styles/mobile-auth.css'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().optional(),
  otp: z.string().optional()
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LoginFormMobileProps {
  initialRole?: 'manager' | 'landlord'
}

export const LoginFormMobile: React.FC<LoginFormMobileProps> = ({ initialRole }) => {
  const router = useRouter()
  const { error: toastError, success: toastSuccess } = useToast()

  const [step, setStep] = useState<'role' | 'form'>(initialRole ? 'form' : 'role')
  const [selectedRole, setSelectedRole] = useState<'manager' | 'landlord'>(initialRole || 'manager')
  const [loginType, setLoginType] = useState<'PASSWORD' | 'OTP'>('PASSWORD')
  
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpVal, setOtpVal] = useState(['', '', '', '', '', ''])
  
  // Landlord existence check
  const [landlordExists, setLandlordExists] = useState<boolean | null>(null)
  const [isCheckingLandlord, setIsCheckingLandlord] = useState(false)
  const [landlordError, setLandlordError] = useState<string | null>(null)

  // PM hooks
  const pmLoginMutation = useLogin()
  const pmRequestOtpMutation = usePmRequestOTP()
  const pmOtpLoginMutation = usePmOtpLogin()

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  })

  const emailValue = watch('email')

  // Landlord silent existence check
  useEffect(() => {
    if (selectedRole !== 'landlord' || !emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setLandlordError(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsCheckingLandlord(true)
      try {
        const { exists } = await checkLandlordExistence(emailValue)
        if (!exists) {
          setLandlordError('Account not found. Please contact your property manager.')
          setLandlordExists(false)
        } else {
          setLandlordError(null)
          setLandlordExists(true)
        }
      } catch (err) {
        // Ignore silent check errors
      } finally {
        setIsCheckingLandlord(false)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [emailValue, selectedRole])

  const handleRoleSelect = (role: 'manager' | 'landlord') => {
    setSelectedRole(role)
    setStep('form')
    setOtpSent(false)
    setOtpVal(['', '', '', '', '', ''])
    setLandlordError(null)
  }

  const handleRequestOTP = async () => {
    if (!emailValue) return
    setLoading(true)

    try {
      if (selectedRole === 'landlord') {
        await landlordRequestOTP(emailValue)
        setOtpSent(true)
        toastSuccess('Verification code sent to your email.')
      } else {
        pmRequestOtpMutation.mutate(
          { email: emailValue, context: 'LOGIN' },
          {
            onSuccess: () => {
              setOtpSent(true)
              toastSuccess('Verification code sent to your email.')
            },
            onError: (err: any) => {
              toastError(err.message || 'Failed to send verification code')
            }
          }
        )
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false)
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false)
  
  useEffect(() => {
    async function checkBiometrics() {
      const available = await BiometricsService.isAvailable()
      setIsBiometricAvailable(available)
      if (available) {
        const enabled = await BiometricsService.isEnabled()
        setIsBiometricEnabled(enabled)
      }
    }
    checkBiometrics()
  }, [])

  const handleBiometricLogin = async () => {
    try {
      const authenticated = await BiometricsService.authenticate(
        `Log in as ${selectedRole === 'manager' ? 'Property Manager' : 'Landlord'}`
      )
      
      if (authenticated) {
        const credentials = await BiometricsService.getCredentials()
        if (credentials) {
          setValue('email', credentials.email)
          setValue('password', credentials.password)
          
          setLoading(true)
          try {
            if (selectedRole === 'landlord') {
              const response = await landlordLogin({
                email: credentials.email,
                password: credentials.password,
                type: 'PASSWORD'
              })
              if (response.user.mustChangePassword) {
                router.push('/portal/change-password')
              } else {
                router.push('/portal')
              }
            } else {
              pmLoginMutation.mutate(
                { email: credentials.email, password: credentials.password },
                {
                  onError: (err: any) => {
                    toastError(err.message || 'Login failed. Please check your credentials.')
                  }
                }
              )
            }
          } catch (err: any) {
            toastError(err.message || 'Login failed. Please check your credentials.')
          } finally {
            setLoading(false)
          }
        } else {
          toastError('No stored credentials found. Please log in manually once.')
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Biometric authentication failed')
    }
  }

  const onSubmit = async (data: LoginFormValues) => {
    if (loginType === 'PASSWORD' && !data.password) {
      toastError('Please enter your password')
      return
    }
    
    if (loginType === 'OTP') {
      const otpCode = otpVal.join('')
      if (!otpSent) {
        toastError('Please request a verification code first')
        return
      }
      if (otpCode.length !== 6) {
        toastError('Please enter a complete 6-digit verification code')
        return
      }
    }

    setLoading(true)

    try {
      const otpCode = otpVal.join('')
      if (selectedRole === 'landlord') {
        const response = await landlordLogin({
          email: data.email,
          password: data.password,
          otp: loginType === 'OTP' ? otpCode : undefined,
          type: loginType
        })

        if (response.user.mustChangePassword) {
          router.push('/portal/change-password')
        } else {
          router.push('/portal')
        }
      } else {
        // Property Manager Login
        if (loginType === 'OTP') {
          pmOtpLoginMutation.mutate(
            { email: data.email, otp: otpCode },
            {
              onSuccess: () => {
                window.location.href = '/dashboard'
              },
              onError: (err: any) => {
                toastError(err.message || 'Invalid verification code')
              }
            }
          )
        } else {
          pmLoginMutation.mutate(
            { email: data.email, password: data.password || '' },
            {
              onError: (err: any) => {
                toastError(err.message || 'Login failed. Please check your credentials.')
              }
            }
          )
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const onFormError = (formErrors: any) => {
    if (formErrors.email) {
      const isEmailEmpty = !watch('email');
      toastError(isEmailEmpty ? 'Please enter your email address' : formErrors.email.message);
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0]
    const newOtp = [...otpVal]
    newOtp[index] = value
    setOtpVal(newOtp)

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  const isLoadingGlobal = loading || pmLoginMutation.isPending || pmOtpLoginMutation.isPending || pmRequestOtpMutation.isPending;

  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

  return (
    <div className="mobile-auth">
      <div className="mobile-auth__container">
        
        {/* Header Block */}
        <div className="mobile-auth__header">
          <div className="mobile-auth__logo-row">
            {(step === 'form' || isNative) ? (
              <button 
                type="button" 
                className="mobile-auth__back-btn" 
                onClick={() => {
                  if (step === 'form') setStep('role')
                  else router.push('/welcome')
                }}
              >
                <ChevronLeft size={20} /> Back
              </button>
            ) : (
              <div />
            )}
            
            {isNative ? (
              <UpwardLogo size={32} color="var(--forest)" />
            ) : (
              <a href={process.env.NEXT_PUBLIC_WEB_URL || "https://upward.goodtenants.io"}>
                <UpwardLogo size={32} color="var(--forest)" />
              </a>
            )}
          </div>

          {step === 'role' ? (
            <>
              <h1 className="mobile-auth__title">Sign In</h1>
              <p className="mobile-auth__subtitle">Select your account type to proceed to your dashboard.</p>
            </>
          ) : (
            <>
              <h1 className="mobile-auth__title">
                {selectedRole === 'manager' ? 'Manager Login' : 'Landlord Login'}
              </h1>
              <p className="mobile-auth__subtitle">
                {loginType === 'OTP' && otpSent
                  ? `Enter the 6-digit verification code sent to your email.`
                  : `Sign in to access your properties and payments.`}
              </p>
            </>
          )}
        </div>

        {step === 'role' ? (
          /* Role Selection Cards */
          <div className="mobile-auth__role-selector">
            <button 
              type="button" 
              className="role-card role-card--manager"
              onClick={() => handleRoleSelect('manager')}
            >
              <div className="role-card__icon-wrapper">
                <Building size={24} />
              </div>
              <div className="role-card__info">
                <h3 className="role-card__title">Property Manager</h3>
                <p className="role-card__desc">Manage portfolios, collections, tenancies, and settings.</p>
              </div>
              <div className="role-card__check" />
            </button>

            <button 
              type="button" 
              className="role-card role-card--landlord"
              onClick={() => handleRoleSelect('landlord')}
            >
              <div className="role-card__icon-wrapper">
                <User size={24} />
              </div>
              <div className="role-card__info">
                <h3 className="role-card__title">Landlord</h3>
                <p className="role-card__desc">View performance reports, payouts, statements, and approvals.</p>
              </div>
              <div className="role-card__check" />
            </button>

            <div className="mobile-auth__footer">
              <p className="auth-footer">
                Don&apos;t have an account? <Link href={isNative ? "/signup" : "/pm-signup"}>Create one for free</Link>
              </p>
            </div>
          </div>
        ) : (
          /* Actual Login Forms */
          <form onSubmit={handleSubmit(onSubmit, onFormError)} className="mobile-auth__form">
            
            {/* Toggle Login Method (Password vs OTP) */}
            <div className="auth-role-toggle" style={{ margin: '0 0 16px 0' }}>
              <button 
                type="button"
                className={`auth-role-toggle__btn ${loginType === 'PASSWORD' ? 'auth-role-toggle__btn--active' : ''}`}
                onClick={() => {
                  setLoginType('PASSWORD')
                  setOtpSent(false)
                }}
              >
                Password
              </button>
              <button 
                type="button"
                className={`auth-role-toggle__btn ${loginType === 'OTP' ? 'auth-role-toggle__btn--active' : ''}`}
                onClick={() => setLoginType('OTP')}
              >
                Verification Code
              </button>
            </div>

            {/* Email Field */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input 
                  {...register('email')}
                  type="email"
                  className={`form-input ${errors.email || landlordError ? 'form-input--error' : ''}`}
                  placeholder="name@company.com"
                  style={{ paddingLeft: '52px' }}
                />
                {isCheckingLandlord && (
                  <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                )}
              </div>
              {errors.email && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                  {errors.email.message}
                </p>
              )}
              {landlordError && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px', fontWeight: 500 }}>
                  {landlordError}
                </p>
              )}
            </div>

            {/* Password Login Fields */}
            {loginType === 'PASSWORD' && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                  <Link 
                    href={selectedRole === 'manager' ? '/pm-forgot-password' : '/portal/forgot-password'} 
                    style={{ fontSize: 13, color: 'var(--forest)', fontWeight: 600 }}
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="input-wrapper" style={{ position: 'relative' }}>
                  <Lock size={18} className="input-icon" />
                  <input 
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    style={{ paddingLeft: '52px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {loginType === 'PASSWORD' && isBiometricAvailable && isBiometricEnabled && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, margin: '16px 0 0 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
                  <span style={{ padding: '0 12px' }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
                </div>
                <button
                  type="button"
                  className="auth-btn auth-btn--outline"
                  onClick={handleBiometricLogin}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    gap: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    height: '52px',
                    borderRadius: '12px'
                  }}
                >
                  <Fingerprint size={20} color="var(--forest)" />
                  <span>Sign in with Biometrics</span>
                </button>
              </div>
            )}

            {/* OTP Code Fields */}
            {loginType === 'OTP' && (
              <div className="form-group">
                <label className="form-label">Verification Code</label>
                {!otpSent ? (
                  <button 
                    type="button" 
                    className="auth-btn auth-btn--outline" 
                    style={{ width: '100%', justifyContent: 'center', height: '52px' }}
                    onClick={handleRequestOTP}
                    disabled={isLoadingGlobal || !emailValue || (selectedRole === 'landlord' && landlordExists === false)}
                  >
                    {isLoadingGlobal ? <Loader2 className="animate-spin" size={18} /> : 'Get Verification Code'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="otp-group">
                      {otpVal.map((digit, i) => (
                        <input
                          key={i}
                          id={`otp-${i}`}
                          type="text"
                          maxLength={1}
                          className="otp-input"
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !digit && i > 0) {
                              document.getElementById(`otp-${i - 1}`)?.focus()
                            }
                          }}
                        />
                      ))}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      Verification code sent. Check your inbox <strong>(and spam)</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}

            <button 
              type="submit" 
              className="auth-btn auth-btn--primary auth-btn--large"
              style={{ marginTop: 'auto' }}
              disabled={isLoadingGlobal}
            >
              <span>{isLoadingGlobal ? 'Signing in...' : 'Sign in'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

      </div>
    </div>
  )
}
