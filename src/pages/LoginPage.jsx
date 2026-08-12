import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import SEO from '../components/ui/SEO'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [step, setStep] = useState(0) // 0: Credentials, 1: OTP
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [profileData, setProfileData] = useState(null)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { customSignIn, finalizeCustomSignIn } = useAuth()
  const navigate = useNavigate()

  async function handleCredentialsSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      // Check if customer
      if (!email.includes('@') && email.toUpperCase().startsWith('CUST-')) {
        const { data, error: custErr } = await supabase
          .from('customers')
          .select('*')
          .eq('username', email.toUpperCase())
          .eq('password', password)
          .single()
          
        if (custErr || !data) {
          setError('Invalid customer username or password')
          setLoading(false)
          return
        }
        
        setLoading(false)
        localStorage.setItem('soluoprint_customer_id', data.id)
        navigate('/customer')
        return
      }

      // Admin Custom Sign In (Bypass Supabase Native Auth)
      if (typeof customSignIn !== 'function') {
        throw new Error('Authentication service is initializing. Please refresh the page.')
      }

      const { data: profile, error: err } = await customSignIn(email, password)
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      // Valid credentials! Generate and send OTP for 2FA
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      setGeneratedOtp(code)
      setProfileData(profile)

      const { sendEmail } = await import('../lib/email')
      await sendEmail(
        profile.email, 
        'SoluoPrint Login Verification', 
        `<p>Your login verification code is: <strong style="font-size:24px;">${code}</strong></p><p>If you did not request this, please secure your account immediately.</p>`, 
        'SoluoPrint Security'
      )
      
      if (profile.phone) {
        const { sendSms } = await import('../lib/sms')
        await sendSms(profile.phone, `Your SoluoPrint login verification code is: ${code}`)
      }

      setStep(1)
    } catch (e) {
      console.error(e)
      setError(e.message || 'An unexpected error occurred during authentication. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault()
    setError('')
    
    if (otp !== generatedOtp) {
      setError('Invalid OTP code. Please check your email or SMS.')
      return
    }

    setLoading(true)
    await finalizeCustomSignIn(profileData.id)
    setLoading(false)
    navigate('/dashboard')
  }

  return (
    <div className="auth-page">
      <SEO title="Sign In" description="Login to your SoluoPrint account to manage your print shop." />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">PD</div>
          <span className="auth-logo-text">SoluoPrint</span>
        </div>

        {step === 1 ? (
          <>
            <h1 className="auth-title">Two-Factor Authentication</h1>
            <p className="auth-subtitle">We've sent a 6-digit code to {profileData?.email} {profileData?.phone && `and ${profileData?.phone}`}</p>
            
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
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{width:'100%',justifyContent:'center',padding:'10px',fontSize:'15px'}}>
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
              <button type="button" onClick={() => setStep(0)} className="btn btn-outline" style={{width:'100%',justifyContent:'center',padding:'10px',fontSize:'15px',marginTop:'12px'}}>
                Back
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your account</p>

            {error && <div className="error-alert">{error}</div>}

            <form onSubmit={handleCredentialsSubmit}>
              <div className="form-group">
                <label className="form-label">Email address or Username</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="you@company.com or CUST-XXXX"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{position:'relative'}}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-control"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{paddingRight:'44px'}}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex'}}
                  >
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{width:'100%',justifyContent:'center',padding:'10px',fontSize:'15px',marginTop:'4px'}}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <div className="auth-footer">
              Don't have an account? <Link to="/register">Create one free</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
