import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function RegisterPage() {
  const [step, setStep] = useState(0) // 0: Details, 1: OTP, 2: Success
  const [form, setForm] = useState({ fullName: '', companyName: '', email: '', phone: '', password: '' })
  const [otp, setOtp] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [otpGeneratedAt, setOtpGeneratedAt] = useState(0)
  const [resendTimer, setResendTimer] = useState(0)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { customSignUp } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let interval = null
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [resendTimer])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function validatePassword(pw) {
    if (pw.length < 6) return 'Password must be at least 6 characters'
    if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter'
    if (!/[a-z]/.test(pw)) return 'Password must contain at least one lowercase letter'
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return 'Password must contain at least one symbol'
    return null
  }

  async function sendOtpCode(isResend = false) {
    setLoading(true)
    setError('')
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      setGeneratedOtp(code)
      setOtpGeneratedAt(Date.now())
      setResendTimer(60)

      // Fire email in the background (don't await) so the UI doesn't freeze
      import('../lib/email').then(({ sendEmail }) => {
        sendEmail(form.email, 'Your SoluoPrint Verification Code', `<p>Your verification code is: <strong style="font-size:24px;">${code}</strong></p><p>Please enter this code to complete your registration. This code expires in 20 minutes.</p>`, 'SoluoPrint')
          .catch(err => console.error('OTP email send error:', err))
      })
      
      if (!isResend) setStep(1)
    } catch (err) {
      console.error(err)
      setError('An error occurred during verification. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDetailsSubmit(e) {
    e.preventDefault()
    setError('')
    
    const pwError = validatePassword(form.password)
    if (pwError) {
      setError(pwError)
      return
    }

    setLoading(true)

    try {
      const { data: existing, error: existingErr } = await supabase
        .from('profiles')
        .select('email, phone')
        .or(`email.eq.${form.email},phone.eq.${form.phone}`)
        
      if (existingErr) {
        throw new Error('Could not verify existing accounts. Please try again.')
      }

      if (existing && existing.length > 0) {
        const isEmail = existing.some(p => p.email === form.email)
        setError(isEmail ? 'An account with this email already exists' : 'An account with this phone number already exists')
        setLoading(false)
        return
      }
      
      setLoading(false)
      await sendOtpCode()
    } catch (err) {
      console.error(err)
      setError(err.message || 'An error occurred during verification. Please try again.')
      setLoading(false)
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault()
    setError('')
    
    if (Date.now() - otpGeneratedAt > 20 * 60 * 1000) {
      setError('OTP has expired. Please request a new one.')
      return
    }

    if (otp !== generatedOtp) {
      setError('Invalid OTP code. Please check your email.')
      return
    }

    setLoading(true)
    const { error: err } = await customSignUp(form.email, form.password, form.fullName, form.companyName, form.phone)
    setLoading(false)
    
    if (err) {
      setError(err.message)
    } else {
      setStep(2)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">PD</div>
          <span className="auth-logo-text">SoluoPrint</span>
        </div>

        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ color: '#16a34a', fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <h2 style={{ marginBottom: '12px', fontSize: '20px', fontWeight: '600' }}>Registration Successful!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              Your account has been securely verified and created. You can now access your dashboard!
            </p>
            <Link to="/dashboard" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Go to Dashboard
            </Link>
          </div>
        )}

        {step === 1 && (
          <>
            <h1 className="auth-title">Verify your account</h1>
            <p className="auth-subtitle">We've sent a 6-digit code to {form.email}</p>
            
            {error && <div className="error-alert">{error}</div>}

            <form onSubmit={handleOtpSubmit}>
              <div className="form-group">
                <label className="form-label">Enter Verification Code</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="123456" 
                  value={otp} 
                  onChange={e => setOtp(e.target.value)} 
                  maxLength={6}
                  required 
                  style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '24px' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{width:'100%',justifyContent:'center',padding:'10px',fontSize:'15px'}}>
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </button>
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => sendOtpCode(true)} 
                  disabled={resendTimer > 0 || loading}
                  className="btn btn-outline" 
                  style={{flex: 1, justifyContent:'center',padding:'10px',fontSize:'15px'}}
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
                <button type="button" onClick={() => setStep(0)} className="btn btn-outline" style={{flex: 1, justifyContent:'center',padding:'10px',fontSize:'15px'}}>
                  Back
                </button>
              </div>
            </form>
          </>
        )}

        {step === 0 && (
          <>
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">Set up your print shop management system</p>

            {error && <div className="error-alert">{error}</div>}

            <form onSubmit={handleDetailsSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" name="fullName" className="form-control" placeholder="John Smith" value={form.fullName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input type="text" name="companyName" className="form-control" placeholder="Acme Print Co." value={form.companyName} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <input type="email" name="email" className="form-control" placeholder="you@company.com" value={form.email} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" name="phone" className="form-control" placeholder="+233 24 123 4567" value={form.phone || ''} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{position:'relative'}}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    name="password"
                    className="form-control"
                    placeholder="Min 6 chars, uppercase & symbol"
                    value={form.password}
                    onChange={handleChange}
                    required
                    style={{paddingRight:'44px'}}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex'}}>
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{width:'100%',justifyContent:'center',padding:'10px',fontSize:'15px',marginTop:'4px'}}>
                {loading ? 'Sending OTP...' : 'Send Verification Code'}
              </button>
            </form>

            <div className="auth-footer">
              Already have an account? <Link to="/login">Sign in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
